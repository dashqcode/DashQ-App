import React, { useState, lazy, Suspense } from 'react';
import Icon from './ui/Icon';
import { useAuth } from '../context/AuthContext';

const CustomPdfViewer = lazy(() => import('./CustomPdfViewer'));
const CustomWordEditor = lazy(() => import('./CustomWordEditor'));
const CustomExcelEditor = lazy(() => import('./CustomExcelEditor'));
const CustomTextViewer = lazy(() => import('./CustomTextViewer'));

function UniversalViewer({ file, onClose, onRename, onToggleStar, isStarred, onGoToFolder }) {
  const { user } = useAuth();
  const perms = user?.permissions || { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false };
  const [isLoading, setIsLoading] = useState(true);

  if (!file) return null;

  const getCategory = (name) => {
    if (!name) return 'unknown';
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
    if (['mp4','webm','mkv','mov','avi'].includes(ext)) return 'video';
    if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc','docx'].includes(ext)) return 'word';
    if (['xls','xlsx','csv'].includes(ext)) return 'excel';
    if (['txt','md','json','xml','log'].includes(ext)) return 'txt';
    return 'unknown';
  };

  const category = getCategory(file.name);
  const hasCustomHeader = category === 'pdf' || category === 'word' || category === 'excel';

  return (
    <div className="preview-modal" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.95)' }}>
      
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '95%', height: '95%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        
        {!hasCustomHeader && (
          <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', backdropFilter: 'blur(4px)' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.5)'} title="Cerrar vista previa">
            <Icon icon="mdi:close" size={18} />
          </button>
        )}
        
        {isLoading && (category === 'video' || category === 'image') && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10, background: 'rgba(20,20,20,0.8)' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pdf-spin 1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite' }}></div>
            <span style={{ marginTop: '16px', color: '#ccc', fontWeight: 500 }}>Cargando...</span>
          </div>
        )}

        <Suspense fallback={
          <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pdf-spin 1s linear infinite' }}></div>
            <span style={{ fontSize: '18px', fontWeight: 500 }}>Cargando visor...</span>
          </div>
        }>
          {category === 'video' ? (
            <video src={file.url} controls controlsList={perms.print ? undefined : "nodownload"} onContextMenu={(e) => !perms.print && e.preventDefault()} autoPlay style={{ maxWidth: '100%', maxHeight: '100%', outline: 'none' }} onCanPlay={() => setIsLoading(false)} />
          ) : category === 'audio' ? (
            <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(255,255,255,0.05)', padding: '40px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
              <Icon icon="solar:music-notes-bold-duotone" size={64} />
              <h2 style={{ color: 'white', margin: 0, fontSize: '20px', textAlign: 'center', wordBreak: 'break-word' }}>{file.name}</h2>
              <audio src={file.url} controls controlsList={perms.print ? undefined : "nodownload"} onContextMenu={(e) => !perms.print && e.preventDefault()} autoPlay style={{ width: '100%', outline: 'none' }} onCanPlay={() => setIsLoading(false)} />
            </div>
          ) : category === 'image' ? (
            <img src={file.url} alt={file.name} onContextMenu={(e) => !perms.print && e.preventDefault()} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onLoad={() => setIsLoading(false)} />
          ) : ['pdf', 'word', 'excel', 'txt'].includes(category) ? (
            <div style={{ width: '100%', height: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.95)' }}>
              {category === 'pdf' ? (
                <CustomPdfViewer url={file.url} name={file.name} onClose={onClose} onRename={onRename} onToggleStar={onToggleStar} isStarred={isStarred} onGoToFolder={onGoToFolder} />
              ) : category === 'word' ? (
                <CustomWordEditor url={file.url} relativePath={file.id} file={file} onClose={onClose} onRename={onRename} onToggleStar={onToggleStar} isStarred={isStarred} onGoToFolder={onGoToFolder} />
              ) : category === 'excel' ? (
                <CustomExcelEditor url={file.url} relativePath={file.id} file={file} onClose={onClose} onRename={onRename} onToggleStar={onToggleStar} isStarred={isStarred} onGoToFolder={onGoToFolder} />
              ) : (
                <CustomTextViewer file={file} onRename={onRename} onToggleStar={onToggleStar} isStarred={isStarred} onGoToFolder={onGoToFolder} />
              )}
            </div>
          ) : (
            <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <Icon icon="solar:question-square-bold-duotone" size={80} />
              <span style={{ fontSize: '18px', fontWeight: 500 }}>Previsualización no disponible para este formato.</span>
              {perms.print && (
              <a href={file.url} download={file.name} style={{ marginTop: '20px', padding: '12px 24px', background: 'var(--color-primary)', color: '#111111', textDecoration: 'none', borderRadius: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="solar:download-bold-duotone" size={18} /> Descargar Archivo
              </a>
              )}
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default UniversalViewer;
