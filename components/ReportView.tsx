
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TBMEntry, TeamOption } from '../types';
import { Printer, X, Download, Loader2, Edit3, Trash2, Sparkles, UserCheck, AlertOctagon, Eye, Users, Video, FileVideo, ImageOff, CheckCircle2, XCircle, Image as ImageIcon, Package, FileText, Mic, ShieldCheck, Lock } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface ReportViewProps {
  entries: TBMEntry[];
  teams: TeamOption[];
  siteName: string; 
  onClose: () => void;
  signatures: { safety: string | null; site: string | null };
  onUpdateSignature: (role: 'safety' | 'site', dataUrl: string) => void;
  onEdit: (entry: TBMEntry) => void;
  onDelete: (id: string) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ entries, teams, siteName, onClose, signatures, onUpdateSignature, onEdit, onDelete }) => {
  const [generatingMode, setGeneratingMode] = useState<'PDF' | 'IMAGE' | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
    const [announceMessage, setAnnounceMessage] = useState('');
  const [scale, setScale] = useState(1);
  const reportDialogRef = useRef<HTMLDivElement>(null);
  const reportCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const announceStatus = (message: string) => {
      setAnnounceMessage('');
      requestAnimationFrame(() => {
          setAnnounceMessage(message);
      });
  };

    React.useEffect(() => {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => {
          reportCloseButtonRef.current?.focus();
      }, 0);

      const handleEscClose = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
              onClose();
          }
      };

      window.addEventListener('keydown', handleEscClose);
      return () => {
          window.removeEventListener('keydown', handleEscClose);
          window.setTimeout(() => {
              previouslyFocusedElementRef.current?.focus();
          }, 0);
      };
  }, [onClose]);

  const handleReportDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Tab') return;

      const dialogNode = reportDialogRef.current;
      if (!dialogNode) return;

      const focusableElements = dialogNode.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
          if (activeElement === firstElement || !dialogNode.contains(activeElement)) {
              event.preventDefault();
              lastElement.focus();
          }
          return;
      }

      if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
      }
  };

    const formatLocationSummary = (entry: TBMEntry) => {
            return [entry.locationBuildingScope, entry.locationArea, entry.locationDetail]
                    .map(value => value?.trim())
                    .filter(Boolean)
                    .join(' / ');
    };

  // Auto-scale for mobile/tablet screens
    React.useEffect(() => {
      const handleResize = () => {
          const maxWidth = Math.min(window.innerWidth - 32, 794); // -32 for padding
          const newScale = Math.min(1, maxWidth / 794);
          setScale(newScale);
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [REFACTORED] Robust Solid Image Converter for Icons
  // This ensures SVGs don't shift or disappear during html2canvas capture
  const convertSvgToImage = async (element: HTMLElement) => {
      const svgs = element.querySelectorAll('svg');
      for (const svg of Array.from(svgs)) {
          try {
              const style = window.getComputedStyle(svg);
              const rect = svg.getBoundingClientRect();
              
              // Determine exact dimensions
              // Fallback to 24px if detection fails
              const width = rect.width > 0 ? rect.width : (parseFloat(style.width) || 24);
              const height = rect.height > 0 ? rect.height : (parseFloat(style.height) || 24);
              
              const color = style.color || '#000000';
              const fill = style.fill !== 'none' ? style.fill : 'none';
              
              let svgData = '';
              try {
                  svgData = new XMLSerializer().serializeToString(svg);
              } catch (e) {
                  console.warn("XMLSerializer failed", e);
                  continue;
              }
              
              // In-line styles to ensure render consistency
              if (color) {
                  svgData = svgData.replace(/currentColor/g, color);
                  // Ensure stroke is applied if not overridden
                  if (!svgData.includes('stroke=')) svgData = svgData.replace(/<svg/, `<svg stroke="${color}"`);
              }

              const canvas = document.createElement('canvas');
              // High resolution canvas for sharp icons
              const scaleFactor = 3; 
              canvas.width = width * scaleFactor; 
              canvas.height = height * scaleFactor;
              
              const ctx = canvas.getContext('2d');
              // [FIX] Use document.createElement for safer image creation to avoid Illegal Constructor
              const img = document.createElement('img'); 
              
              const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
              const url = URL.createObjectURL(svgBlob);

              await new Promise((resolve) => {
                  img.onload = () => {
                      if (ctx) {
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          // Smooth scaling
                          ctx.imageSmoothingEnabled = true;
                          ctx.imageSmoothingQuality = 'high';
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      }
                      URL.revokeObjectURL(url);
                      resolve(null);
                  };
                  img.onerror = () => {
                      console.warn("SVG Load Error", svg);
                      URL.revokeObjectURL(url); // Ensure cleanup on error
                      resolve(null);
                  };
                  img.src = url;
              });

              const replacementImg = document.createElement('img');
              replacementImg.src = canvas.toDataURL('image/png');
              
              // Force exact dimensions on the replacement image
              replacementImg.style.width = `${width}px`;
              replacementImg.style.height = `${height}px`;
              replacementImg.style.minWidth = `${width}px`; // Critical for flex containers
              replacementImg.style.minHeight = `${height}px`;
              replacementImg.style.display = style.display === 'block' ? 'block' : 'inline-block';
              replacementImg.style.verticalAlign = style.verticalAlign || 'middle';
              replacementImg.style.margin = style.margin;
              replacementImg.style.padding = style.padding;
              
              // Replace in DOM
              if (svg.parentNode) {
                  svg.parentNode.replaceChild(replacementImg, svg);
              }
          } catch (e) {
              console.warn("SVG Conversion Error", e);
          }
      }
  };

  // [EXPORT STABILITY] Lock computed layout to reduce PDF/image drift
  const lockExportLayout = (element: HTMLElement) => {
      const lockSelectors = [
          '.report-page',
          '.row',
          '.col',
          '.section-header',
          '.body-row-images',
          '.body-row-text',
          'table',
          'td',
          'img'
      ];

      lockSelectors.forEach((selector) => {
          element.querySelectorAll(selector).forEach((node) => {
              const target = node as HTMLElement;
              const computed = window.getComputedStyle(target);
              const rect = target.getBoundingClientRect();
              if (rect.width > 0) {
                  const width = `${rect.width.toFixed(3)}px`;
                  target.style.width = width;
                  target.style.minWidth = width;
                  target.style.maxWidth = width;
              }
              if (rect.height > 0) {
                  const height = `${rect.height.toFixed(3)}px`;
                  target.style.height = height;
                  target.style.minHeight = height;
                  target.style.maxHeight = height;
              }
              if (computed.display === 'inline') {
                  target.style.display = 'inline-block';
              }
          });
      });

      // Preserve image baseline alignment without forcing block layout
      element.querySelectorAll('img').forEach((node) => {
          const img = node as HTMLElement;
          const computed = window.getComputedStyle(img);
          if (computed.display === 'inline') {
              img.style.display = 'inline-block';
          }
          img.style.verticalAlign = computed.verticalAlign || 'middle';
      });
  };

  const processPages = async (mode: 'PDF' | 'IMAGE') => {
    if (generatingMode) return;
    setGeneratingMode(mode);
    setStatusMessage(mode === 'PDF' ? "PDF 생성 중..." : "이미지 변환 중...");
    
    // Allow UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    const originalScrollPos = window.scrollY;
    window.scrollTo(0, 0);

    const ghostContainer = document.createElement('div');
    ghostContainer.id = 'pdf-ghost-container';
    
    // Position off-screen but keep layout flow
    Object.assign(ghostContainer.style, {
        position: 'fixed',
        top: '0',
        left: '-10000px', // Far off-screen
        width: '794px',   // A4 Width
        zIndex: '-9999',
        background: '#ffffff',
    });
    document.body.appendChild(ghostContainer);

    try {
            const originalPages = reportDialogRef.current?.querySelectorAll('.report-page') || [];
            if (originalPages.length === 0) {
                    announceStatus('내보낼 보고서 페이지가 없습니다.');
                    return;
            }
      await document.fonts.ready;

      let pdf: any = null;
      if (mode === 'PDF') {
          try {
              pdf = new jsPDF('p', 'mm', 'a4');
          } catch (e) {
              throw new Error("PDF 초기화 실패: 브라우저 호환성 문제");
          }
      }
      
      let zip: any = null;
      if (mode === 'IMAGE' && originalPages.length > 1) {
          try {
              zip = new JSZip();
          } catch (e) {
              throw new Error("ZIP 초기화 실패");
          }
      }
      
      let singleImageData: string | null = null;

      for (let i = 0; i < originalPages.length; i++) {
          const originalPage = originalPages[i] as HTMLElement;
          // Deep clone
          const clone = originalPage.cloneNode(true) as HTMLElement;

          // Reset styles that might interfere with A4 layout
          clone.style.margin = '0';
          clone.style.padding = '0';
          clone.style.boxShadow = 'none';
          clone.style.transform = 'none'; // Remove scaling
          clone.style.width = '794px';
          clone.style.height = '1123px';
          clone.style.position = 'relative';
          clone.style.backgroundColor = '#ffffff';
          clone.style.border = '2px solid black'; // Preserve outer border
          
          // Remove UI controls
          clone.querySelectorAll('.edit-overlay, .no-print-ui').forEach(el => el.remove());
          
          // Freeze animations
          clone.querySelectorAll('*').forEach((el) => {
             const htmlEl = el as HTMLElement;
             htmlEl.style.animation = 'none';
             htmlEl.style.transition = 'none';
          });

          ghostContainer.appendChild(clone);

          // 0. Lock layout dimensions before conversion/capture
          lockExportLayout(clone);

          // 1. Convert SVGs to PNGs (Critical for icon alignment)
          await convertSvgToImage(clone);

          // 2. Preload all images
          const images = Array.from(clone.querySelectorAll('img'));
          await Promise.all(images.map(async (img) => {
              if (!img.complete) {
                  await new Promise((resolve) => {
                      img.onload = resolve;
                      img.onerror = resolve;
                  });
              }
              try {
                  await img.decode();
              } catch {
                  // ignore decode failure and continue export
              }
          }));
          
          // Brief pause for rendering stabilization
          await new Promise(resolve => setTimeout(resolve, 300));

          // 3. Capture with html2canvas
          const canvas = await html2canvas(clone, {
            scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
            useCORS: true,
            logging: false,
            width: 794,
            height: 1123,
            x: 0,
            y: 0,
            windowWidth: 794,
            windowHeight: 1123,
            backgroundColor: '#ffffff',
            // Enforce font rendering to fix layout shifts
            onclone: (doc) => {
               const style = doc.createElement('style');
               style.innerHTML = `
                  .report-page, .report-page * {
                      box-sizing: border-box !important;
                      -webkit-font-smoothing: antialiased !important;
                      text-rendering: geometricPrecision !important;
                      font-family: -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif !important;
                  }
                  .report-page {
                      width: 794px !important;
                      height: 1123px !important;
                      transform: none !important;
                      margin: 0 !important;
                      border: 2px solid black !important;
                  }
                  .row { display: flex !important; width: 100% !important; border-bottom: 1px solid black !important; flex-shrink: 0 !important; }
                  .row.last { border-bottom: none !important; }
                  .col { border-right: 1px solid black !important; height: 100% !important; position: relative !important; overflow: hidden !important; flex-shrink: 0 !important; }
                  .col.last { border-right: none !important; }
                  .h-header { height: 130px !important; }
                  .h-info { height: 78px !important; }
                  .h-body { height: 875px !important; display: flex !important; flex-direction: column !important; }
                  .h-footer { height: 36px !important; border-top: 1px solid black !important; display: flex !important; align-items: center !important; }
                  .section-header {
                      height: 30px !important;
                      background-color: #f3f4f6 !important;
                      border-bottom: 1px solid black !important;
                      display: flex !important;
                      align-items: center !important;
                      justify-content: center !important;
                      font-size: 11px !important;
                      font-weight: 800 !important;
                      color: black !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                  }
                  .body-row-images { height: 360px !important; border-bottom: 1px solid black !important; display: flex !important; width: 100% !important; flex-shrink: 0 !important; }
                  .body-row-text { flex: 1 !important; display: flex !important; width: 100% !important; min-height: 0 !important; }
                  .text-wrap-fix { white-space: pre-wrap !important; word-break: keep-all !important; line-height: 1.35 !important; }
                  table { border-collapse: collapse !important; width: 100% !important; table-layout: fixed !important; }
                  td { vertical-align: middle !important; padding: 2px !important; }
                  .badge-cell { vertical-align: middle !important; text-align: center !important; padding: 2px !important; }
                  .text-cell { vertical-align: middle !important; padding-left: 4px !important; line-height: 1.3 !important; }
                  img {
                      max-width: 100% !important;
                      object-fit: contain !important;
                      image-rendering: -webkit-optimize-contrast !important;
                  }
               `;
               doc.head.appendChild(style);
            }
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);

          if (mode === 'PDF' && pdf) {
              const imgWidth = 210; // A4 Width in mm
              const imgHeight = 297; // A4 Height in mm
              if (i > 0) pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
          } else if (mode === 'IMAGE') {
              if (zip) {
                  // [UPDATED] Use resolved name for filename as well
                  const resolvedTeam = teams.find(t => t.id === entries[i].teamId);
                  const safeTeamName = (resolvedTeam ? resolvedTeam.name : (entries[i].teamName || '미지정')).replace(/[\/\\?%*:|"<>]/g, '_');
                  const fileName = `TBM_Report_${entries[i].date}_${safeTeamName}.jpg`;
                  zip.file(fileName, imgData.split(',')[1], { base64: true });
              } else {
                  singleImageData = imgData;
              }
          }
          
          ghostContainer.removeChild(clone);
      }

      const dateStr = new Date().toISOString().slice(0,10);

      if (mode === 'PDF' && pdf) {
          pdf.save(`TBM_일지_통합본_${dateStr}.pdf`);
      } else if (mode === 'IMAGE') {
          if (zip) {
              const content = await zip.generateAsync({ type: "blob" });
              const url = URL.createObjectURL(content);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `TBM_일지_이미지모음_${dateStr}.zip`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              // [FIX] Revoke object URL to release memory after download
              URL.revokeObjectURL(url);
          } else if (singleImageData) {
              const resolvedTeam = teams.find(t => t.id === entries[0].teamId);
              const safeTeamName = (resolvedTeam ? resolvedTeam.name : (entries[0].teamName || '미지정')).replace(/[\/\\?%*:|"<>]/g, '_');
              const link = document.createElement('a');
              link.href = singleImageData;
              link.setAttribute('download', `TBM_일지_${entries[0].date}_${safeTeamName}.jpg`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }
      }

    } catch (error) {
      console.error("Generation failed", error);
            announceStatus('변환 중 오류가 발생했습니다. 메모리 부족 또는 이미지 처리 실패일 수 있습니다.');
    } finally {
      if (document.body.contains(ghostContainer)) {
          document.body.removeChild(ghostContainer);
      }
      window.scrollTo(0, originalScrollPos);
      setGeneratingMode(null);
      setStatusMessage("");
    }
  };

  const handleSignatureUpload = (role: 'safety' | 'site') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // [FIX] 파일 타입 및 크기 검증 — 서명 이미지에만 허용
      if (!file.type.startsWith('image/')) {
          announceStatus('이미지 파일만 업로드 가능합니다.');
          e.target.value = '';
          return;
      }
      if (file.size > 2 * 1024 * 1024) {
          announceStatus('서명 이미지는 최대 2MB까지 가능합니다.');
          e.target.value = '';
          return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateSignature(role, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const SafeImage = ({ src, className }: { src: string, className: string }) => {
      const [error, setError] = useState(false);
      if (error || !src) {
          return (
              <div className={`flex flex-col items-center justify-center bg-slate-50 text-slate-400 ${className}`}>
                  <ImageOff size={24} />
                  <span className="text-[10px] mt-1 font-medium">이미지 없음</span>
              </div>
          );
      }
      return <img src={src} className={className} onError={() => setError(true)} />;
  };

  return createPortal(
        <div ref={reportDialogRef} role="dialog" aria-modal="true" aria-labelledby="report-view-title" aria-describedby="report-view-description" onKeyDown={handleReportDialogKeyDown} className="fixed inset-0 bg-slate-900/95 z-50 overflow-y-auto flex flex-col items-center report-container-wrapper">
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {generatingMode
                    ? (statusMessage || (generatingMode === 'PDF' ? 'PDF를 생성 중입니다.' : '이미지를 생성 중입니다.'))
                    : (announceMessage || '')}
            </p>
      <style>{`
        .report-page {
            width: 794px;
            height: 1123px;
            background: white;
            margin: 0 auto 40px auto;
            position: relative;
                        font-family: -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
            color: black;
            box-sizing: border-box;
            border: 2px solid black; 
            display: block;
            transform-origin: top center; 
            overflow: hidden;
            font-smooth: always;
        }
        
        /* Rigid Layout Grid */
        .row { display: flex; width: 100%; border-bottom: 1px solid black; box-sizing: border-box; flex-shrink: 0; }
        .row.last { border-bottom: none; }
        .col { border-right: 1px solid black; height: 100%; box-sizing: border-box; position: relative; flex-shrink: 0; overflow: hidden; }
        .col.last { border-right: none; }
        
        /* Fixed Heights */
        .h-header { height: 130px; }
        .h-info { height: 78px; }
        .h-body { height: 875px; display: flex; flex-direction: column; } 
        .h-footer { height: 36px; border-top: 1px solid black; display: flex; align-items: center; }
        
        /* Section Headers */
        .section-header {
            background-color: #f3f4f6; 
            border-bottom: 1px solid black;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            height: 30px;
            color: black;
            flex-shrink: 0;
        }
        
        .body-row-images { height: 360px; border-bottom: 1px solid black; display: flex; width: 100%; flex-shrink: 0; }
        .body-row-text { flex: 1; display: flex; width: 100%; min-height: 0; }
        
        /* Text Handling */
        .text-wrap-fix {
           white-space: pre-wrap;
           word-break: keep-all; 
           line-height: 1.35;
        }
        
        /* Helpers */
        .flex-center { display: flex; align-items: center; justify-content: center; text-align: center; }
        
        /* Table Reset for Internal Grids (Risk/Feedback) */
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        td { vertical-align: middle; padding: 2px; border-color: #cbd5e1; }
        
        @media print {
          @page { size: A4; margin: 0; }
          body, html { margin: 0; padding: 0; background: white; }
          #root { display: none !important; }
          .report-container-wrapper {
            position: absolute !important; top: 0 !important; left: 0 !important;
            width: 100% !important; height: auto !important;
            margin: 0 !important; padding: 0 !important;
            background: white !important; display: block !important;
          }
          .report-page {
            margin: 0 !important; box-shadow: none !important;
            page-break-after: always;
            transform: none !important;
            border: 2px solid black !important;
          }
          .no-print-ui { display: none !important; }
        }
      `}</style>
      
      {/* Toolbar */}
      <div className="sticky top-0 z-50 w-full bg-slate-800 text-white p-4 shadow-lg flex justify-between items-center max-w-[794px] rounded-b-xl mb-4 md:mb-8 no-print-ui">
        <div>
                    <h2 id="report-view-title" className="font-bold text-base md:text-lg">🖨️ 보고서 센터 (인쇄 모드)</h2>
                    <p id="report-view-description" className="text-[10px] md:text-xs text-slate-400">
            {entries.length}개의 TBM 일지가 준비되었습니다.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Image Download Button */}
          <button 
            onClick={() => processPages('IMAGE')}
            disabled={generatingMode !== null}
            className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-3 md:px-4 py-2 rounded font-bold transition-colors text-xs md:text-sm ${generatingMode !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="고화질 이미지로 저장 (JPG)"
          >
            {generatingMode === 'IMAGE' ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            <span className="hidden md:inline">{generatingMode === 'IMAGE' ? statusMessage : (entries.length > 1 ? '이미지 ZIP' : '이미지 저장')}</span>
          </button>

          {/* PDF Download Button */}
          <button 
            onClick={() => processPages('PDF')}
            disabled={generatingMode !== null}
            className={`flex items-center gap-2 bg-green-600 hover:bg-green-500 px-3 md:px-4 py-2 rounded font-bold transition-colors text-xs md:text-sm ${generatingMode !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {generatingMode === 'PDF' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden md:inline">{generatingMode === 'PDF' ? statusMessage : 'PDF 다운로드'}</span>
          </button>

          <button 
                        ref={reportCloseButtonRef}
            onClick={onClose}
                        aria-label="보고서 센터 닫기"
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 md:px-4 py-2 rounded transition-colors text-xs md:text-sm"
          >
            <X size={16} /> 닫기
          </button>
        </div>
      </div>

      <div className="pb-20 print:pb-0 w-full flex flex-col items-center">
        {entries.map((entry, index) => {
            const safeDate = entry.date ? entry.date.replace(/-/g,'') : '00000000';
            const safeTime = entry.time || '00:00';
            
            // [UPDATED] Resolve team name from 'teams' prop using ID
            const resolvedTeam = teams.find(t => t.id === entry.teamId);
            const safeTeamName = resolvedTeam ? resolvedTeam.name : (entry.teamName || '미지정');
            
            const safeLeader = entry.leaderName || '미지정';
            const safeCount = entry.attendeesCount || 0;

            const rubric = entry.videoAnalysis?.rubric || {
                logQuality: 0, focus: 0, voice: 0, ppe: 0, deductions: []
            };

            const hasVideoEvidence = !!(entry.tbmVideoUrl || entry.tbmVideoFileName || entry.videoAnalysis);
            const displayFileName = entry.tbmVideoFileName || (entry.videoAnalysis ? '분석된 동영상 데이터.mp4' : '파일명 없음');
            const safeLocation = formatLocationSummary(entry);

            return (
              <div 
                key={entry.id || index} 
                className="report-page group"
                style={{ transform: `scale(${scale})`, marginBottom: `${40 * scale}px` }} 
              >
                {/* [NEW] Digital Integrity Seal (Legal Defense) */}
                <div className="absolute top-24 right-8 z-20 pointer-events-none opacity-80 rotate-12 mix-blend-multiply">
                    <div className="border-4 border-red-600 rounded-full w-24 h-24 flex items-center justify-center p-1">
                        <div className="border border-red-600 rounded-full w-full h-full flex flex-col items-center justify-center text-red-600 text-center">
                            <ShieldCheck size={20} strokeWidth={2.5}/>
                            <span className="text-[8px] font-black uppercase mt-1 leading-none">전자<br/>무결성</span>
                            <span className="text-[10px] font-black mt-1">검증 완료</span>
                            <span className="text-[6px] mt-1 font-mono tracking-tighter">HuiGang OS</span>
                        </div>
                    </div>
                </div>

                {/* 1. Header Row */}
                <div className="row h-header">
                    <div className="col" style={{width: '65%'}}>
                        <div className="p-4 flex flex-col justify-center h-full">
                            <div className="text-[10px] font-bold text-slate-500 mb-1">{siteName} 현장</div>
                            <h1 className="text-3xl font-black tracking-tighter mb-2 text-black leading-none">일일 TBM 및<br/>위험성평가 점검표</h1>
                             <div className="flex items-center text-[10px] font-bold gap-3 text-slate-700 mt-1">
                                 <span>일자: {entry.date} ({safeTime})</span>
                                 <span className="w-px h-3 bg-slate-300"></span>
                                 <span>작성: {safeTeamName}</span>
                             </div>
                        </div>
                    </div>
                    <div className="col last flex" style={{width: '35%'}}>
                        <div className="col" style={{width: '50%'}}>
                            <div className="section-header">안전 관리자</div>
                            <div className="relative h-[calc(100%-30px)] flex items-center justify-center group cursor-pointer hover:bg-slate-50">
                                 {signatures.safety ? <img src={signatures.safety} className="max-w-[80%] max-h-[70px] object-contain"/> : <span className="text-slate-300 text-xs">(서명)</span>}
                                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer no-print-ui" onChange={handleSignatureUpload('safety')} />
                            </div>
                        </div>
                        <div className="col last" style={{width: '50%'}}>
                            <div className="section-header">현장 소장</div>
                             <div className="relative h-[calc(100%-30px)] flex items-center justify-center group cursor-pointer hover:bg-slate-50">
                                 {signatures.site ? <img src={signatures.site} className="max-w-[80%] max-h-[70px] object-contain"/> : <span className="text-slate-300 text-xs">(서명)</span>}
                                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer no-print-ui" onChange={handleSignatureUpload('site')} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Info Row */}
                <div className="row h-info text-xs">
                    <div className="w-full h-full flex flex-col">
                        <div className="row" style={{ height: '39px' }}>
                            <div className="col bg-slate-50 flex-center font-extrabold text-black" style={{width: '12%'}}>작업 팀명</div>
                            <div className="col flex-center font-bold text-black" style={{width: '23%'}}>{safeTeamName}</div>
                            <div className="col bg-slate-50 flex-center font-extrabold text-black" style={{width: '10%'}}>팀장</div>
                            <div className="col flex-center font-bold text-black" style={{width: '20%'}}>{safeLeader}</div>
                            <div className="col bg-slate-50 flex-center font-extrabold text-black" style={{width: '15%'}}>금일 출력</div>
                            <div className="col last flex-center font-bold text-black" style={{width: '20%'}}>{safeCount}명</div>
                        </div>
                        <div className="row last" style={{ height: '39px' }}>
                            <div className="col bg-slate-50 flex-center font-extrabold text-black" style={{width: '12%'}}>작업 위치</div>
                            <div className="col px-3 flex items-center font-bold text-black" style={{width: '88%'}}>
                                <span className="text-[11px] leading-snug break-keep">{safeLocation || '내용 없음'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Main Body */}
                <div className="h-body">
                    {/* 3-A. Images Row */}
                    <div className="body-row-images">
                        <div className="col" style={{width: '50%'}}>
                            <div className="section-header">1. TBM 일지 원본 (종합본)</div>
                            <div className="h-[calc(100%-30px)] p-2 flex items-center justify-center">
                                <SafeImage src={entry.originalLogImageUrl || ''} className="max-w-full max-h-full object-contain" />
                            </div>
                        </div>
                        <div className="col last" style={{width: '50%'}}>
                            <div className="section-header">2. TBM 실시 사진 및 동영상</div>
                            <div className="h-[calc(100%-30px)] p-2 flex flex-col bg-white">
                                 <div className="flex-1 w-full flex items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 relative rounded-sm mb-1">
                                     {entry.tbmPhotoUrl ? (
                                        <SafeImage src={entry.tbmPhotoUrl} className="max-w-full max-h-full object-contain" />
                                     ) : (
                                        <span className="text-xs text-slate-300">이미지 없음</span>
                                     )}
                                 </div>

                                 {hasVideoEvidence ? (
                                     <div className="w-full bg-white border border-red-500 rounded p-1.5 flex items-center justify-between shrink-0 h-8 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]">
                                         <div className="flex items-center gap-1.5">
                                             <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                                               <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping no-print"></span>
                                               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                                             </div>
                                             <span className="text-[10px] font-black text-red-600 tracking-tight">동영상 기록물 첨부됨</span>
                                         </div>
                                         <div className="flex items-center gap-1 max-w-[60%]">
                                            <span className="text-[9px] font-bold text-slate-400">파일명:</span>
                                            <span className="text-[9px] font-mono text-slate-700 truncate font-bold">
                                                {displayFileName}
                                            </span>
                                         </div>
                                     </div>
                                 ) : (
                                     <div className="w-full h-8 flex items-center justify-center border border-dashed border-slate-200 rounded bg-slate-50 text-[9px] text-slate-300">
                                         동영상 기록 없음
                                     </div>
                                 )}
                            </div>
                        </div>
                    </div>
                    
                    {/* 3-B. Text Content Row */}
                    <div className="body-row-text">
                        <div className="col flex flex-col" style={{width: '50%'}}>
                            <div className="section-header">3. 금일 작업·설치 내용 및 위험요인</div>
                            <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                                <div>
                                    <div className="text-[11px] font-extrabold text-slate-800 mb-1 border-b border-slate-200 inline-block pb-0.5">[작업 내용]</div>
                                    <div className="text-[11px] leading-relaxed text-wrap-fix text-black min-h-[50px]">
                                        {entry.workDescription || "내용 없음"}
                                    </div>
                                    <div className="mt-3 rounded border border-sky-200 bg-sky-50 px-2 py-2 min-h-[64px]">
                                        <div className="text-[10px] font-extrabold text-sky-700 mb-1">[작업 위치]</div>
                                        <div className="text-[10px] leading-snug text-black break-keep">
                                            {safeLocation || '내용 없음'}
                                        </div>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-2">
                                        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2.5 min-h-[82px]">
                                            <div className="text-[10px] font-extrabold text-amber-700 mb-1">[금일 설치한 사항]</div>
                                            <div className="text-[10px] leading-snug text-black break-keep">
                                                {entry.todayInstalledItems || '내용 없음'}
                                            </div>
                                        </div>
                                        <div className="rounded border border-violet-200 bg-violet-50 px-2 py-2.5 min-h-[82px]">
                                            <div className="text-[10px] font-extrabold text-violet-700 mb-1">[관리자 추가 설치 필요 항목]</div>
                                            <div className="text-[10px] leading-snug text-black break-keep">
                                                {entry.managerRequiredInstallItems || '내용 없음'}
                                            </div>
                                        </div>
                                    </div>
                                    {entry.linkedRiskAssessmentLabel && (
                                        <div className="mt-2 rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${entry.linkedRiskAssessmentMatchedByMonth ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                                    {entry.linkedRiskAssessmentMatchedByMonth ? '동일월 위험성평가 연계' : '위험성평가 연계'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-700">{entry.linkedRiskAssessmentLabel}</span>
                                            </div>
                                            <div className="mt-1 text-[9px] text-slate-600 flex items-center gap-2 flex-wrap">
                                                <span>상위험 {entry.linkedRiskAssessmentHighCount ?? 0}건</span>
                                                <span>조치메모 {entry.linkedRiskAssessmentActionNoteCount ?? 0}건</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 border border-orange-300 rounded flex flex-col min-h-0 bg-white">
                                    <div className="bg-orange-50 p-1.5 text-center text-[10px] font-bold text-orange-700 border-b border-orange-200 shrink-0">⚠ 중점 위험 관리 사항</div>
                                    <div className="p-2 overflow-hidden flex flex-col">
                                        <table className="w-full border-collapse">
                                            <tbody>
                                                {(entry.riskFactors || []).slice(0,5).map((risk, i) => (
                                                    <React.Fragment key={i}>
                                                        <tr className="border-b border-dashed border-slate-200 last:border-0">
                                                            <td className="w-9 align-middle badge-cell">
                                                                <span className="inline-block w-8 text-center bg-red-100 text-red-600 border border-red-200 rounded text-[9px] font-bold py-0.5">위험</span>
                                                            </td>
                                                            <td className="align-middle pl-1 text-cell">
                                                                <span className="text-[10px] text-black leading-snug break-keep block">{risk.risk}</span>
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-dashed border-slate-200 last:border-0 mb-1">
                                                            <td className="w-9 align-middle pb-2 badge-cell">
                                                                <span className="inline-block w-8 text-center bg-blue-100 text-blue-600 border border-blue-200 rounded text-[9px] font-bold py-0.5">대책</span>
                                                            </td>
                                                            <td className="align-middle pl-1 pb-2 text-cell">
                                                                <span className="text-[10px] text-black leading-snug break-keep block">{risk.measure}</span>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))}
                                                {(!entry.riskFactors || entry.riskFactors.length === 0) && (
                                                    <tr>
                                                        <td colSpan={2} className="text-center text-[10px] text-slate-300 py-8">항목 없음</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col last flex flex-col" style={{width: '50%'}}>
                                <div className="section-header">4. AI 심층 정밀 진단</div>
                             <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-3 border-b border-black bg-slate-50/50">
                                    {entry.videoAnalysis ? (
                                        <div className="flex flex-col gap-2">
                                            {/* Top Score */}
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-violet-600 shrink-0"/>
                                                    <span className="text-[11px] font-black text-black">AI 종합 감사 점수</span>
                                                </div>
                                                <span className={`text-sm font-black border px-2 py-0.5 rounded shadow-sm ${entry.videoAnalysis.score >= 80 ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {entry.videoAnalysis.score}점
                                                </span>
                                            </div>

                                            {/* Detailed Evaluation Bars (Gauges) */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-1">
                                                {[
                                                    { label: '일지 충실도', score: rubric.logQuality || 0, max: 30, color: 'bg-indigo-500', bg: 'bg-indigo-50' },
                                                    { label: '작업자 집중도', score: rubric.focus || 0, max: 30, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
                                                    { label: '전파 명확성', score: rubric.voice || 0, max: 20, color: 'bg-amber-500', bg: 'bg-amber-50' },
                                                    { label: '보호구 상태', score: rubric.ppe || 0, max: 20, color: 'bg-rose-500', bg: 'bg-rose-50' },
                                                ].map((metric, midx) => (
                                                    <div key={midx} className="flex items-center text-[9px]">
                                                        <span className="w-14 font-bold text-slate-500 truncate">{metric.label}</span>
                                                        <div className={`flex-1 h-1.5 rounded-full mx-1 overflow-hidden ${metric.bg}`}>
                                                            <div 
                                                                className={`h-full rounded-full ${metric.color}`} 
                                                                style={{ width: `${(metric.score / metric.max) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="w-6 text-right font-mono font-bold text-black">{metric.score}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* [NEW] 4-Point Text Evaluations */}
                                            {(entry.videoAnalysis.evalLog || entry.videoAnalysis.evalAttendance || entry.videoAnalysis.evalFocus || entry.videoAnalysis.evalLeader) && (
                                                <div className="grid grid-cols-2 gap-1 mb-1 text-[9px]">
                                                    {[
                                                        { label: '일지 작성', value: entry.videoAnalysis.evalLog },
                                                        { label: '참석/참여도', value: entry.videoAnalysis.evalAttendance },
                                                        { label: '작업자 집중', value: entry.videoAnalysis.evalFocus },
                                                        { label: '팀장 리딩', value: entry.videoAnalysis.evalLeader },
                                                    ].filter(f => !!f.value).map((f, i) => (
                                                        <div key={i} className="bg-white border border-slate-100 rounded px-1.5 py-1 overflow-hidden">
                                                            <span className="font-black text-indigo-700 block mb-0.5">{f.label}</span>
                                                            <span className="text-slate-700 leading-tight line-clamp-2 break-keep">{f.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* [NEW] Leader Coaching (Reading to Leading) */}
                                            {entry.videoAnalysis.leaderCoaching && (
                                                <div className="bg-indigo-50 border border-indigo-200 rounded p-2 mb-1">
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <span className="text-[9px] font-black text-indigo-700 uppercase">현장 리더 실천 항목</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-800 leading-snug">
                                                        "{entry.videoAnalysis.leaderCoaching.actionItem}"
                                                    </p>
                                                </div>
                                            )}

                                            <div className="text-[10px] text-slate-700 font-medium leading-relaxed bg-white p-2 rounded border border-slate-200 text-wrap-fix italic border-l-2 border-l-violet-400 mt-1">
                                                <span className="block text-[9px] font-bold text-violet-600 mb-0.5">종합 의견</span>
                                                "{entry.videoAnalysis.evaluation}"
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-[10px] text-slate-400">AI 분석 데이터 없음</div>
                                    )}
                                </div>
                                <div className="flex-1 p-3 bg-white">
                                    <div className="text-[11px] font-extrabold text-black mb-2 border-b border-slate-200 pb-1 flex items-center gap-1">
                                        <UserCheck size={12}/> 안전관리자 코멘트
                                    </div>
                                    <div className="space-y-1">
                                        <table className="w-full border-collapse">
                                            <tbody>
                                            {(entry.safetyFeedback || []).slice(0,3).map((fb, i) => (
                                                <tr key={i}>
                                                    <td className="w-5 align-middle badge-cell">
                                                        <span className="text-blue-600 text-[10px] font-bold">✔</span>
                                                    </td>
                                                    <td className="align-middle text-cell">
                                                        <span className="text-[10px] text-black leading-snug break-keep block">{fb}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                        {(!entry.safetyFeedback || entry.safetyFeedback.length === 0) && <div className="text-center text-[10px] text-slate-300 py-4">코멘트 없음</div>}
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* 4. Footer Row */}
                <div className="h-footer flex justify-between items-center px-4 text-[9px] text-slate-500 font-mono">
                     <div>DOC-NO: TBM-{safeDate}-{index+1} (REV.0)</div>
                     <div className="font-bold text-slate-700">(주)휘강건설 스마트 안전관리 시스템</div>
                     <div>{index + 1} / {entries.length} 페이지</div>
                </div>
                
                {/* Edit Controls */}
                <div className="edit-overlay absolute top-0 right-0 p-4 no-print-ui z-[1000] flex gap-2">
                    <button onClick={() => onEdit(entry)} aria-label={`${safeTeamName} ${entry.date} 기록 수정`} className="bg-white text-blue-600 p-2 rounded shadow border hover:bg-blue-50 hover:border-blue-300 transition-colors"><Edit3 size={16}/></button>
                    <button onClick={() => onDelete(String(entry.id))} aria-label={`${safeTeamName} ${entry.date} 기록 삭제`} className="bg-white text-red-600 p-2 rounded shadow border hover:bg-red-50 hover:border-red-300 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            );
        })}
      </div>
    </div>,
    document.body
  );
};