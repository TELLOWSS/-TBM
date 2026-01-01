
/**
 * 동영상 압축 및 오디오 캡처 유틸리티 (Audio + Video)
 * 
 * [v2.7.5 Fix]
 * 1. 브라우저 자동 재생 정책(Autoplay Policy) 우회 로직 강화.
 * 2. Web Audio API 실패 시 Silent Video로 자동 전환.
 * 3. MediaRecorder 안정성 확보.
 */

export const compressVideo = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    // 1. 기본 설정
    video.src = url;
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = "auto";
    
    // 초기 설정: 소리 켜기 (AudioContext 캡처용)
    video.muted = false; 
    video.volume = 1.0; 
    
    let stream: MediaStream | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let animationId: number;
    let audioCtx: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let dest: MediaStreamAudioDestinationNode | null = null;

    const cleanup = () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      
      // Clean up Audio Context
      if (source) try { source.disconnect(); } catch(e) {}
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
      
      video.pause();
      video.removeAttribute('src');
      video.remove();
      URL.revokeObjectURL(url);
    };

    const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Video processing timeout (30s limit)"));
    }, 30000);

    // [Safety] Ensure loading starts
    video.load();

    video.oncanplay = async () => {
      if (stream) return; // Prevent multiple triggers

      // 1. Resolution Resize (360p for AI efficiency)
      const TARGET_HEIGHT = 360;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width === 0 || height === 0) { width = 640; height = 360; }
      
      if (height > TARGET_HEIGHT) {
        width = Math.round(width * (TARGET_HEIGHT / height));
        height = TARGET_HEIGHT;
      }
      // Ensure even dimensions for some encoders
      if (width % 2 !== 0) width--;
      if (height % 2 !== 0) height--;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        cleanup();
        reject(new Error("Canvas context initialization failed"));
        return;
      }

      // 2. Audio Capture Setup (Silent Recording Trick)
      let audioTracks: MediaStreamTrack[] = [];
      try {
         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         if (AudioContextClass) {
             audioCtx = new AudioContextClass();
             source = audioCtx.createMediaElementSource(video);
             dest = audioCtx.createMediaStreamDestination();
             source.connect(dest);
             // Note: Not connecting to destination (speakers) keeps it silent to user but recorded
             audioTracks = dest.stream.getAudioTracks();
         }
      } catch (e) {
         console.warn("Web Audio API setup failed, falling back to silent video:", e);
      }

      // 3. Combine Streams
      const canvasStream = canvas.captureStream(30); 
      const tracks = [...canvasStream.getVideoTracks(), ...audioTracks];
      stream = new MediaStream(tracks);

      // 4. Recorder Setup
      // Prioritize standard codecs
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' 
                     : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
                     : 'video/mp4';

      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 1000000, // 1Mbps for decent quality
        });
      } catch (e) {
        cleanup();
        reject(new Error(`MediaRecorder init failed: ${(e as any).message}`));
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
            console.log(`✅ Video Processed (5s): ${(blob.size / 1024).toFixed(1)} KB`);
            resolve(blob);
        } catch (e) {
            reject(e);
        } finally {
            cleanup();
        }
      };

      // 5. Start Recording Loop (5 seconds)
      const DURATION_MS = 5000;
      let startTime = 0;

      const draw = () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
        
        if (Date.now() - startTime > DURATION_MS) {
            if (mediaRecorder.state === 'recording') mediaRecorder.stop();
            return;
        }

        try { ctx.drawImage(video, 0, 0, width, height); } catch (err) {}
        animationId = requestAnimationFrame(draw);
      };

      const startRecording = () => {
          if (mediaRecorder && mediaRecorder.state === 'inactive') {
              mediaRecorder.start();
              startTime = Date.now();
              draw();
          }
      };

      // 6. Playback Strategy
      try {
          // Attempt 1: Play with audio (muted=false)
          await video.play();
          startRecording();
      } catch (e) {
          console.warn("Autoplay blocked, retrying with muted video...", e);
          try {
              // Attempt 2: Play muted (Browser Policy Fallback)
              video.muted = true;
              await video.play();
              startRecording();
          } catch (err) {
              cleanup();
              reject(new Error("Video playback failed completely."));
          }
      }
    };

    video.onerror = () => {
        cleanup();
        reject(new Error("Video format error or file corrupted."));
    };
  });
};
