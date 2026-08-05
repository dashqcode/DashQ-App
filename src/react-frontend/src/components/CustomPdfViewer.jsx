import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Icon from './ui/Icon';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../context/AuthContext';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import CustomSelect from './CustomSelect';

// Configure worker to use exact matching version from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Virtualized Page Component ─────────────────────────────────────────────
// Only renders the actual <Page> canvas when it's near the viewport.
// Otherwise renders a lightweight placeholder div of the same dimensions.
const VirtualizedPage = React.memo(({ pageNumber, pageProps, isVisible, onVisibilityChange, estimatedHeight, estimatedWidth }) => {
  const ref = useRef(null);
  const [actualHeight, setActualHeight] = useState(null);
  const [actualWidth, setActualWidth] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(pageNumber, entry.isIntersecting);
      },
      { rootMargin: '600px 0px' } // Pre-load pages 600px before they enter the viewport
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [pageNumber, onVisibilityChange]);

  useEffect(() => {
    if (isVisible && ref.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.contentRect.height > 50) {
            setActualHeight(entry.contentRect.height);
            setActualWidth(entry.contentRect.width);
          }
        }
      });
      // The canvas inside the react-pdf Page usually determines the size. We observe the wrapper.
      // But actually, observing ref.current is enough since it wraps the Page.
      // Wait, we only want to measure if the child is fully rendered.
      // react-pdf Page fires onRenderSuccess, but ResizeObserver is generic and works fine.
      resizeObserver.observe(ref.current);
      return () => resizeObserver.disconnect();
    }
  }, [isVisible]);

  const heightToUse = actualHeight || estimatedHeight;
  const widthToUse = actualWidth || estimatedWidth;

  return (
    <div
      ref={ref}
      data-page-number={pageNumber}
      style={{
        margin: '0 auto',
        width: 'max-content',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        background: '#fff',
        minHeight: isVisible ? undefined : `${heightToUse}px`,
        minWidth: isVisible ? undefined : `${widthToUse}px`}}
    >
      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          {...pageProps}
          renderTextLayer={true}
          renderAnnotationLayer={false}
        />
      ) : (
        <div style={{
          width: `${widthToUse}px`,
          height: `${heightToUse}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(110deg, var(--bg-primary) 8%, var(--bg-panel) 18%, var(--bg-primary) 33%)',
          backgroundSize: '200% 100%',
          animation: '1.5s linear infinite skeletonShine'}}>
          <Icon icon="mdi:file-document" size={48} style={{ opacity: 0.15 }} />
        </div>
      )}
    </div>
  );
});

// ─── Virtualized Thumbnail ──────────────────────────────────────────────────
const VirtualizedThumbnail = React.memo(({ pageNumber, isActive, isVisible, onClick, onVisibilityChange }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(pageNumber, entry.isIntersecting);
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [pageNumber, onVisibilityChange]);

  return (
    <div
      ref={ref}
      onClick={() => onClick(pageNumber)}
      style={{
        margin: '0 auto', width: '140px', cursor: 'pointer', flexShrink: 0,
        border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
        opacity: isActive ? 1 : 0.6,
        transition: 'all 0.2s',
        background: 'var(--bg-primary)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        borderRadius: '20px', overflow: 'hidden',
        minHeight: isVisible ? undefined : '200px'}}
    >
      {isVisible ? (
        <>
          <Page 
            pageNumber={pageNumber} 
            width={136} 
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            loading={
              <div style={{
                width: '136px',
                height: '192px', 
                background: 'linear-gradient(110deg, var(--bg-primary) 8%, var(--bg-panel) 18%, var(--bg-primary) 33%)',
                backgroundSize: '200% 100%',
                animation: '1.5s linear infinite skeletonShine',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon icon="mdi:file-document" size={24} style={{ opacity: 0.15 }} />
              </div>
            }
          />
          <div style={{ textAlign: 'center', fontSize: '12px', padding: '4px 0', color: 'var(--text-muted)', background: 'var(--bg-panel)', fontWeight: '500' }}>
            {pageNumber}
          </div>
        </>
      ) : (
        <div style={{ height: '200px', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            flex: 1,
            background: 'linear-gradient(110deg, var(--bg-primary) 8%, var(--bg-panel) 18%, var(--bg-primary) 33%)',
            backgroundSize: '200% 100%',
            animation: '1.5s linear infinite skeletonShine',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon icon="mdi:file-document" size={24} style={{ opacity: 0.15 }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '12px', padding: '4px 0', color: 'var(--text-muted)', background: 'var(--bg-panel)', fontWeight: '500' }}>
            {pageNumber}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Main PDF Viewer ────────────────────────────────────────────────────────
export default function CustomPdfViewer({ url, name = 'Documento.pdf', onClose, isStarred, onToggleStar, onRename, onGoToFolder }) {
  const { user } = useAuth();
  const perms = user?.permissions || { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false };

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isHoveringName, setIsHoveringName] = useState(false);

  const handleDoubleClickName = () => {
    if (onRename) {
      setEditName(name.replace(/\.[^/.]+$/, ""));
      setIsEditingName(true);
    }
  };

  const handleRenameSubmit = () => {
    const trimmedInput = editName.trim();
    const originalName = name.replace(/\.[^/.]+$/, "").trim();
    if (trimmedInput && trimmedInput !== originalName) {
      const ext = name.match(/\.[^/.]+$/)?.[0] || '';
      onRename(trimmedInput + ext);
    }
    setIsEditingName(false);
  };
  const [scale, setScale] = useState(1.0);
  const [loadError, setLoadError] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiration, setShareExpiration] = useState('7');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleOpenShare = async () => {
    if (!isShareOpen) {
      setIsShareOpen(true);
      if (!shareUrl) {
        try {
          // Extract file path or ID from url
          const path = url.includes('/api/files/download/') 
             ? url.split('/').pop() 
             : url.replace(/^\/?(api\/)?(uploads|data\/uploads)\//, '');
          const res = await fetch('/api/share', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path, name, type: 'file' })
          });
          const data = await res.json();
          if (data.token) {
            setShareUrl(`${window.location.origin}/share/${data.token}`);
          }
        } catch (err) {
          console.error("Failed to generate share link", err);
        }
      }
    } else {
      setIsShareOpen(false);
    }
  };

  const [showThumbnails, setShowThumbnails] = useState(true);
  const [fitMode, setFitMode] = useState('custom');
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Track which pages are visible (near viewport)
  const [visiblePages, setVisiblePages] = useState(new Set([1]));
  const [visibleThumbs, setVisibleThumbs] = useState(new Set([1]));

  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef(null);

  // Estimated page dimensions for placeholders (A4 ratio)
  const estimatedWidth = useMemo(() => {
    if (fitMode === 'width' && containerDimensions.width) return containerDimensions.width - 64;
    return Math.round(595 * scale); // A4 width in points
  }, [fitMode, containerDimensions.width, scale]);

  const estimatedHeight = useMemo(() => {
    if (fitMode === 'width' && containerDimensions.width) return Math.round((containerDimensions.width - 64) * 1.414);
    return Math.round(842 * scale); // A4 height in points
  }, [fitMode, containerDimensions.width, scale]);

  // ── Resize Observer ──
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(scrollContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [showThumbnails]);

  // ── Page visibility tracking ──
  const handlePageVisibility = useCallback((pageNum, isIntersecting) => {
    setVisiblePages(prev => {
      const next = new Set(prev);
      if (isIntersecting) {
        next.add(pageNum);
      } else {
        next.delete(pageNum);
      }
      return next;
    });
  }, []);

  const handleContainerScroll = useCallback((e) => {
    if (isProgrammaticScroll.current) return;
    const container = e.currentTarget;
    const pageEls = Array.from(container.querySelectorAll('[data-page-number]'));
    if (pageEls.length === 0) return;
    
    let closestPage = 1;
    let minDistance = Infinity;
    const containerCenter = container.getBoundingClientRect().top + container.clientHeight / 2;

    for (const el of pageEls) {
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = parseInt(el.getAttribute('data-page-number'), 10);
      }
    }
    
    setPageNumber(prev => prev !== closestPage ? closestPage : prev);
  }, []);

  // ── Thumbnail visibility tracking ──
  const handleThumbVisibility = useCallback((pageNum, isIntersecting) => {
    setVisibleThumbs(prev => {
      const next = new Set(prev);
      if (isIntersecting) next.add(pageNum);
      else next.delete(pageNum);
      return next;
    });
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoadError(null);
    setVisiblePages(new Set([1, 2, 3])); // Pre-render first 3 pages
  }

  function onDocumentLoadError(error) {
    console.error("PDF Load Error:", error);
    setLoadError(error.message || 'Error desconocido');
  }

  const zoomIn = () => { setFitMode('custom'); setScale(s => Math.min(s + 0.25, 3.0)); };
  const zoomOut = () => { setFitMode('custom'); setScale(s => Math.max(s - 0.25, 0.5)); };

  const scrollToPage = useCallback((p) => {
    isProgrammaticScroll.current = true;
    setPageNumber(p);
    // Find the page element by data attribute
    if (scrollContainerRef.current) {
      const pageEl = scrollContainerRef.current.querySelector(`[data-page-number="${p}"]`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 800);
  }, []);

  const nextPage = () => scrollToPage(Math.min(pageNumber + 1, numPages || 1));
  const prevPage = () => scrollToPage(Math.max(pageNumber - 1, 1));

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 15000);
      }, 500);
    };
  };

  const getPageProps = useCallback(() => {
    if (fitMode === 'width' && containerDimensions.width) {
      return { width: containerDimensions.width - 64 };
    }
    if (fitMode === 'height' && containerDimensions.height) {
      return { height: containerDimensions.height - 64 };
    }
    return { scale: scale };
  }, [fitMode, containerDimensions, scale]);

  // Memoize the page props so children don't re-render unnecessarily
  const pageProps = useMemo(() => getPageProps(), [getPageProps]);

  // Generate page numbers array once
  const pageNumbers = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Top Header Redesign */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: 'var(--bg-primary)', color: 'var(--text-primary)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10,
        gap: '20px'
      }}>
        {/* Left: Sidebar Toggle & File Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <button 
            onClick={() => setShowThumbnails(!showThumbnails)} 
            style={{ 
              background: showThumbnails ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', 
              border: '1px solid ' + (showThumbnails ? 'transparent' : 'rgba(255,255,255,0.1)'), 
              color: showThumbnails ? '#111' : 'var(--text-primary)', 
              cursor: 'pointer', padding: '8px 16px', borderRadius: '24px', display: 'flex', 
              alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
              boxShadow: showThumbnails ? '0 4px 12px rgba(96, 165, 250, 0.3)' : 'none'
            }}>
             <Icon icon="solar:gallery-bold-duotone" size={16} />
             Miniaturas
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '6px 16px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)' }}>
            <Icon icon="solar:document-bold-duotone" size={18} color="var(--color-primary)" />
            {isEditingName ? (
              <input 
                 value={editName}
                 onChange={e => setEditName(e.target.value)}
                 onBlur={handleRenameSubmit}
                 onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                 autoFocus
                 style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid var(--color-primary)', borderRadius: '30px', padding: '4px 10px', fontSize: '14px', outline: 'none', width: '200px' }}
              />
            ) : (
              <span 
                onDoubleClick={handleDoubleClickName}
                onMouseEnter={() => setIsHoveringName(true)}
                onMouseLeave={() => setIsHoveringName(false)}
                title={onRename ? "Doble clic para renombrar" : ""}
                style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px', cursor: onRename ? 'text' : 'default', padding: '2px 6px', borderRadius: '30px', background: (onRename && isHoveringName) ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.2s' }}
              >
                {name.replace(/\.[^/.]+$/, "")}
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>{name.match(/\.[^/.]+$/)?.[0] || ''}</span>
                {(onRename && perms.rename) && isHoveringName && (
                   <Icon icon="solar:pen-bold-duotone" size={12} />
                )}
                {(onToggleStar && perms.tag) ? (
                  <Icon 
                    icon={isStarred ? 'solar:star-bold-duotone' : 'solar:star-line-duotone'} 
                    size={16} 
                    color={isStarred ? '#fbbf24' : 'currentColor'}
                    onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
                    style={{ cursor: 'pointer', marginLeft: '4px', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title={isStarred ? "Quitar de destacados" : "Añadir a destacados"}
                  />
                ) : (
                  <Icon icon="solar:star-bold-duotone" size={16} color={isStarred ? '#fbbf24' : 'inherit'} />
                )}
                {(onGoToFolder && perms.move) && (
                  <Icon 
                    icon="solar:folder-open-bold-duotone" 
                    size={16} 
                    color="#aaa"
                    onClick={(e) => { e.stopPropagation(); onGoToFolder(); }}
                    style={{ cursor: 'pointer', marginLeft: '4px', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Mostrar en carpeta"
                  />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Center: Navigation & Zoom Hub */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)',
          padding: '6px', borderRadius: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.15)', borderRadius: '24px', padding: '4px' }}>
            <button onClick={zoomOut} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} title="Alejar">
               <Icon icon="solar:minus-circle-bold-duotone" size={16} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: '600', width: '56px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {fitMode === 'width' ? 'Ancho' : `${Math.round(scale * 100)}%`}
            </span>
            <button onClick={zoomIn} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} title="Acercar">
               <Icon icon="solar:add-circle-bold-duotone" size={16} />
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }}></div>

          {/* Page Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.15)', borderRadius: '24px', padding: '4px' }}>
            <button onClick={prevPage} disabled={pageNumber <= 1} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: pageNumber <= 1 ? 'default' : 'pointer', opacity: pageNumber <= 1 ? 0.3 : 1, padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => pageNumber > 1 && (e.currentTarget.style.background='rgba(255,255,255,0.1)')} onMouseLeave={e => e.currentTarget.style.background='transparent'} title="Página anterior">
                <Icon icon="solar:alt-arrow-left-bold-duotone" size={16} />
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>Pág</span>
            <input
              type="number"
              value={pageNumber}
              onChange={e => {
                let val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= (numPages || 1)) scrollToPage(val);
              }}
              style={{ width: '44px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', textAlign: 'center', borderRadius: '12px', outline: 'none', fontSize: '13px', fontWeight: '600', padding: '4px 0' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingRight: '4px' }}>de {numPages || '-'}</span>
            <button onClick={nextPage} disabled={pageNumber >= numPages} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: pageNumber >= numPages ? 'default' : 'pointer', opacity: pageNumber >= numPages ? 0.3 : 1, padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => pageNumber < numPages && (e.currentTarget.style.background='rgba(255,255,255,0.1)')} onMouseLeave={e => e.currentTarget.style.background='transparent'} title="Página siguiente">
                <Icon icon="solar:alt-arrow-right-bold-duotone" size={16} />
            </button>
          </div>
        </div>

        {/* Right: Actions, Share & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end' }}>
          
          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {perms.print && (
              <button onClick={handleDownload} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='var(--color-primary)'}} onMouseLeave={e => {e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-primary)'}} title="Descargar">
                 <Icon icon="solar:download-bold-duotone" size={18} />
              </button>
            )}
            {perms.print && (
              <button onClick={handlePrint} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='var(--color-primary)'}} onMouseLeave={e => {e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-primary)'}} title="Imprimir">
                 <Icon icon="solar:printer-bold-duotone" size={18} />
              </button>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

          {/* Share */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={handleOpenShare}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: '#111111', border: 'none', borderRadius: '24px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(96, 165, 250, 0.4)' }} 
              onMouseEnter={e=> {e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 6px 18px rgba(96, 165, 250, 0.5)';}} 
              onMouseLeave={e=> {e.target.style.transform='none'; e.target.style.boxShadow='0 4px 14px rgba(96, 165, 250, 0.4)';}}
            >
              <Icon icon="solar:share-bold-duotone" size={18} /> Compartir
            </button>
            
            {isShareOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 16px)', right: 0, width: '340px', background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 100 }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:link-bold-duotone" size={20} color="var(--color-primary)" /> Compartir enlace
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <input type="text" readOnly value={shareUrl || 'Generando enlace...'} style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
                  <button 
                    onClick={() => {
                      if (!shareUrl) return;
                      const text = shareUrl;
                      if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(text).catch(err => console.error("Clipboard API failed", err));
                      } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-999999px";
                        textArea.style.top = "-999999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try { document.execCommand('copy'); } catch (err) { console.error('Fallback error', err); }
                        textArea.remove();
                      }
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    style={{ background: 'var(--color-primary)', color: '#111111', border: 'none', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: shareUrl ? 1 : 0.5, transition: 'transform 0.1s' }}
                    onMouseDown={e => e.currentTarget.style.transform='scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform='none'}
                    disabled={!shareUrl}
                  >
                    {linkCopied ? <Icon icon="solar:check-square-bold-duotone" size={20} /> : <Icon icon="solar:copy-bold-duotone" size={20} />}
                  </button>
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Expiración del enlace:</label>
                  <CustomSelect 
                    options={[
                      {value: '1', label: '1 día'},
                      {value: '7', label: '7 días'},
                      {value: '30', label: '30 días'},
                      {value: 'never', label: 'Nunca expira'}
                    ]}
                    value={shareExpiration}
                    onChange={(val) => setShareExpiration(val)}
                  />
                </div>
                <div style={{ display: 'flex', marginTop: '10px' }}>
                  <button style={{ flex: 1, background: 'linear-gradient(135deg, var(--color-primary), #60a5fa)', color: '#111111', border: 'none', borderRadius: '16px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s', boxShadow: '0 4px 12px rgba(96, 165, 250, 0.3)' }} onMouseEnter={e=>e.currentTarget.style.opacity=0.9} onMouseLeave={e=>e.currentTarget.style.opacity=1} onClick={() => setIsShareOpen(false)}>Listo</button>
                </div>
              </div>
            )}
          </div>

          {onClose && (
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', transition: 'all 0.2s', marginLeft: '4px' }} onMouseEnter={e=>{e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'; e.currentTarget.style.transform='scale(1.05)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.transform='none';}} title="Cerrar visor">
               <Icon icon="mdi:close" size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area (Sidebar + Viewport) */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg-primary)', position: 'relative' }}>
        <Document
           file={url || ''}
           onLoadSuccess={onDocumentLoadSuccess}
           onLoadError={onDocumentLoadError}
           loading={
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', maxWidth: '90%', height: 'calc(100% - 64px)', maxHeight: '1130px', borderRadius: '12px', background: 'linear-gradient(110deg, var(--bg-primary) 8%, var(--bg-panel) 18%, var(--bg-primary) 33%)', backgroundSize: '200% 100%', animation: '1.5s linear infinite skeletonShine', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <Icon icon="mdi:file-document" size={64} style={{ opacity: 0.15 }} />
             </div>
           }
           error={<div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ff6b6b', textAlign: 'center' }}>Error al cargar el PDF:<br/><small>{loadError}</small><br/><small>URL: {url}</small></div>}
           className="custom-pdf-document-wrapper"
        >
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Sidebar de Miniaturas (Virtualizado) */}
            {showThumbnails && numPages > 0 && (
               <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid var(--border-color)', background: 'var(--bg-primary)', overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pageNumbers.map(pn => (
                    <VirtualizedThumbnail
                      key={`thumb_${pn}`}
                      pageNumber={pn}
                      isActive={pageNumber === pn}
                      isVisible={visibleThumbs.has(pn)}
                      onClick={scrollToPage}
                      onVisibilityChange={handleThumbVisibility}
                    />
                  ))}
               </div>
            )}

            {/* Viewport Principal (Virtualizado) */}
            <div ref={scrollContainerRef} onScroll={handleContainerScroll} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '32px 0', background: 'var(--bg-primary)', gap: '24px' }}>
               {pageNumbers.map(pn => (
                 <VirtualizedPage
                   key={`page_${pn}`}
                   pageNumber={pn}
                   pageProps={pageProps}
                   isVisible={visiblePages.has(pn)}
                   onVisibilityChange={handlePageVisibility}
                   estimatedHeight={estimatedHeight}
                   estimatedWidth={estimatedWidth}
                 />
               ))}
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}
