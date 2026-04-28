
/**
 * 동영상 압축 및 오디오 캡처 유틸리티 (Audio + Video)
 * 
 * [v4.0.0 Ultra-Light AI Mode]
 * - **Speed:** 3.0x Playback Rate.
 * - **Resolution:** 144p (AI Recognition Minimum).
 * - **Bitrate:** 100 kbps (Extreme Compression).
 * - **Target:** Payload under 1MB for instant 5G/LTE upload.
 */

export const compressVideo = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // [FIX] Use document.createElement('video') instead of new Audio() or similar potentially risky constructors
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.src = url;
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = false; // Capture audio
    video.volume = 1.0;
    
    // 3배속 가속 (시간 단축)
    video.defaultPlaybackRate = 3.0; 
    video.playbackRate = 3.0;
    
    if ('preservesPitch' in video) {
        (video as any).preservesPitch = true;
    }
    
    let stream: MediaStream | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let audioCtx: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let dest: MediaStreamAudioDestinationNode | null = null;
    let animationId: number;

    const cleanup = () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      if (source) try { source.disconnect(); } catch(e) {}
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
      // [FIX] Stop all media stream tracks to release camera/mic resources
      if (stream) {
          try { stream.getTracks().forEach((t) => t.stop()); } catch(e) {}
          stream = null;
      }
      video.pause();
      video.removeAttribute('src');
      video.remove();
      URL.revokeObjectURL(url);
    };

    // Fail-safe timeout (20s total max)
    const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Video processing timeout."));
    }, 20000);

    video.oncanplay = async () => {
      if (stream) return;

      // 1. Extreme Downscaling (144p is enough for PPE detection)
      const TARGET_HEIGHT = 144; 
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (height > TARGET_HEIGHT) {
        width = Math.round(width * (TARGET_HEIGHT / height));
        height = TARGET_HEIGHT;
      }
      // Ensure even dimensions for codecs
      if (width % 2 !== 0) width--;
      if (height % 2 !== 0) height--;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        cleanup();
        reject(new Error("Canvas init failed"));
        return;
      }

      // 2. Audio Capture
      let audioTracks: MediaStreamTrack[] = [];
      try {
         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         if (AudioContextClass) {
             try {
                 // [DEFENSIVE] Illegal Constructor protection for AudioContext
                 audioCtx = new AudioContextClass();
                 source = audioCtx.createMediaElementSource(video);
                 dest = audioCtx.createMediaStreamDestination();
                 source.connect(dest);
                 audioTracks = dest.stream.getAudioTracks();
             } catch (e) {
                 console.warn("AudioContext init failed (Illegal Constructor likely):", e);
                 audioCtx = null;
                 audioTracks = []; // Ensure empty array on failure
             }
         }
      } catch (e) {
         console.warn("Audio capture failed, silent video:", e);
      }

      // 3. Low FPS Stream (10fps is enough for fast-forward analysis)
      const canvasStream = canvas.captureStream(10); 
      // Default to video-only first to ensure we have something
      stream = canvasStream;

      // Try to mix audio if available
      // [CRITICAL FIX] Avoid `new MediaStream([...])` constructor which throws Illegal Constructor in some envs.
      // Instead, use `addTrack` on the existing valid stream instance.
      if (audioTracks.length > 0) {
          try {
              audioTracks.forEach(track => {
                  stream?.addTrack(track);
              });
          } catch (e) {
              console.warn("Audio mixing failed (addTrack error), proceeding with video only.", e);
          }
      }

      // 4. Recorder - Ultra Low Bitrate
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' 
                     : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
                     : 'video/mp4';

      try {
        if (!stream) throw new Error("Stream is null");
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 100000, // 100 kbps (Tiny file size)
        });
      } catch (e) {
        cleanup();
        console.error("MediaRecorder init failed:", e);
        reject(new Error(`MediaRecorder failed: ${(e as any).message}`));
        return;
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        clearTimeout(timeoutId);
        try {
            const blob = new Blob(chunks, { type: mimeType });
            console.log(`🚀 Ultra-Light Video Payload: ${(blob.size / 1024).toFixed(2)} KB`);
            resolve(blob);
        } catch (e) {
            reject(e);
        } finally {
            cleanup();
        }
      };

      // 5. Recording Strategy: Capture max 10s of *output* (representing 30s of reality)
      const MAX_OUTPUT_DURATION_MS = 10000; 
      let startTime = Date.now();

      const draw = () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
        
        if (Date.now() - startTime > MAX_OUTPUT_DURATION_MS || video.ended) {
            if (mediaRecorder.state === 'recording') mediaRecorder.stop();
            return;
        }

        try { ctx.drawImage(video, 0, 0, width, height); } catch (err) {}
        animationId = requestAnimationFrame(draw);
      };

      const startRecording = () => {
          if (mediaRecorder && mediaRecorder.state === 'inactive') {
              mediaRecorder.start();
              video.playbackRate = 3.0; // Force speed again
              startTime = Date.now();
              draw();
          }
      };

      try {
          await video.play();
          startRecording();
      } catch (e) {
          try {
              video.muted = true; 
              await video.play();
              startRecording();
          } catch (err) {
              cleanup();
              reject(new Error("Playback failed."));
          }
      }
    };

    video.onerror = () => {
        cleanup();
        reject(new Error("Video corrupt."));
    };
  });
};
