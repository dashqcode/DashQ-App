import React, { Suspense, lazy, useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useFiles } from '../context/FileContext';

const CustomPdfViewer = lazy(() => import('../components/CustomPdfViewer'));
const CustomExcelEditor = lazy(() => import('../components/CustomExcelEditor'));
const CustomWordEditor = lazy(() => import('../components/CustomWordEditor'));
const CustomTextViewer = lazy(() => import('../components/CustomTextViewer'));

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const fileId = searchParams.get('id');
  const initialName = searchParams.get('name') || '';
  const { addToast } = useToast();
  const { renameFile, files } = useFiles();

  const contextFile = files?.find(f => f.id === fileId);
  const [localName, setLocalName] = useState(initialName);
  const [localIsStarred, setLocalIsStarred] = useState(contextFile?.isStarred || false);

  useEffect(() => {
    if (contextFile) {
      setLocalIsStarred(contextFile.isStarred);
      setLocalName(contextFile.name);
    }
  }, [contextFile]);

  const handleToggleStar = async () => {
    if (!fileId) return;
    const newStarState = !localIsStarred;
    try {
      await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, isStarred: newStarState })
      });
      setLocalIsStarred(newStarState);
    } catch (e) { console.warn(e);
      addToast('Error al cambiar destacado', 'error', 'fa-circle-xmark');
    }
  };

  const handleRename = async (newName) => {
    if (!fileId) return;
    try {
      await renameFile(fileId, newName, 'file');
      setLocalName(newName);
      
      // Update the URL to reflect the new file ID (relative path)
      const urlParams = new URLSearchParams(window.location.search);
      const parts = fileId.split('/');
      parts.pop();
      parts.push(newName);
      const newFileId = parts.join('/');
      urlParams.set('id', newFileId);
      urlParams.set('name', newName);
      
      // Compute the new file URL if possible (by replacing the filename in the old URL)
      if (url) {
         const urlParts = url.split('/');
         urlParts.pop();
         urlParts.push(encodeURIComponent(newName));
         urlParams.set('url', urlParts.join('/'));
      }
      
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, '', newUrl);

      addToast('Archivo renombrado', 'success');
    } catch (e) { console.warn(e);
      addToast('Error al renombrar', 'error');
    }
  };

  const getCategory = (filename) => {
    if (!filename) return 'unknown';
    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['png','jpg','jpeg','gif','webp'];
    const excelExts = ['xls','xlsx','csv'];
    const wordExts = ['doc','docx'];
    if (ext === 'pdf') return 'pdf';
    if (excelExts.includes(ext)) return 'excel';
    if (wordExts.includes(ext)) return 'word';
    if (imageExts.includes(ext)) return 'image';
    if (ext === 'txt') return 'text';
    return 'unknown';
  };

  const category = getCategory(localName);

  if (!url) {
    return <div style={{ padding: '20px', color: 'white' }}>No se especificó un archivo.</div>;
  }

  const finalUrl = url.startsWith('/') || url.startsWith('http') ? url : `/${url}`;

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: ['excel','word'].includes(category) ? '#fff' : '#0d0d0d' }}>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <Suspense fallback={
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <Icon icon="solar:cpu-bold-duotone" size={32} />
            <p style={{ fontWeight: 600 }}>Cargando motor de edición...</p>
          </div>
        }>
          {category === 'image' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <img src={finalUrl} alt={localName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : category === 'excel' ? (
            <CustomExcelEditor url={finalUrl} name={localName} relativePath={fileId} onSaveSuccess={() => addToast('Cambios guardados en Excel exitosamente.', 'success', 'fa-check-circle')} />
          ) : category === 'word' ? (
            <CustomWordEditor url={finalUrl} name={localName} relativePath={fileId} onSaveSuccess={() => addToast('Cambios guardados en Word exitosamente.', 'success', 'fa-check-circle')} />
          ) : category === 'text' ? (
            <CustomTextViewer url={finalUrl} name={localName} />
          ) : category === 'pdf' ? (
            <CustomPdfViewer 
              url={finalUrl} 
              name={localName} 
              isStarred={localIsStarred}
              onToggleStar={handleToggleStar}
              onRename={handleRename}
            />
          ) : (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '100px' }}>
              <Icon icon="solar:document-bold-duotone" size={18} />
              <p>Vista previa no disponible para este tipo de archivo.</p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
