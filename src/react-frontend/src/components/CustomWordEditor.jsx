import React, { useEffect, useState, useRef } from 'react';
import Icon from './ui/Icon';
import mammoth from 'mammoth';
import { useAuth } from '../context/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';
import { asBlob } from 'html-docx-js-a13';

export default function CustomWordEditor({ url, relativePath, file, onClose, onSaveSuccess, onRename, onToggleStar, isStarred, onGoToFolder }) {
  const { user } = useAuth();
  const perms = user?.permissions || { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(file?.name || '');
  const [isHoveringName, setIsHoveringName] = useState(false);

  const handleDoubleClickName = () => {
    if (onRename && perms.rename) {
      setIsEditingName(true);
      setEditName(file.name);
    }
  };

  const handleRenameSubmit = () => {
    setIsEditingName(false);
    if (editName.trim() && editName !== file.name && onRename) {
      onRename(editName.trim());
    }
  };

  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadDocx = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network error fetching DOCX");
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!isMounted) return;
        
        setHtml(result.value);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Mammoth error:", err);
        setError("No se pudo cargar el documento DOCX.");
        setLoading(false);
      }
    };
    loadDocx();
    return () => { isMounted = false; };
  }, [url]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
      const blob = asBlob(fullHtml);
      
      if (!blob) throw new Error("Failed to generate DOCX blob");
      
      const file = new File([blob], relativePath.split('/').pop(), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', relativePath);
      
      const res = await fetch('/api/update_file', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        if (onSaveSuccess) onSaveSuccess();
      } else {
        throw new Error(data.error || "Error al guardar");
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar el archivo: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)', gap: '16px' }}><Icon icon="solar:refresh-bold-duotone" size={32} /> Cargando documento...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>
      
      {/* Title Bar (Blue like Word) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#185abd', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: '#2b579a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Icon icon="solar:document-text-bold-duotone" size={16} color="white" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>Word</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.3)' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditingName ? (
              <input 
                 value={editName}
                 onChange={e => setEditName(e.target.value)}
                 onBlur={handleRenameSubmit}
                 onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                 autoFocus
                 style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '4px', padding: '2px 6px', fontSize: '13px', outline: 'none', width: '200px' }}
              />
            ) : (
              <span 
                onDoubleClick={handleDoubleClickName}
                onMouseEnter={() => setIsHoveringName(true)}
                onMouseLeave={() => setIsHoveringName(false)}
                title={onRename && perms.rename ? "Doble clic para renombrar" : ""}
                style={{ fontSize: '13px', fontWeight: '500', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: (onRename && perms.rename) ? 'text' : 'default', padding: '2px 6px', borderRadius: '4px', background: (onRename && perms.rename && isHoveringName) ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'background 0.2s' }}
              >
                {file?.name || 'Documento'}
                {(onRename && perms.rename) && isHoveringName && (
                   <Icon icon="solar:pen-bold-duotone" size={12} color="rgba(255,255,255,0.8)" />
                )}
                {(onToggleStar && perms.tag) ? (
                  <Icon 
                    icon={isStarred ? 'solar:star-bold-duotone' : 'solar:star-line-duotone'} 
                    size={14} 
                    color={isStarred ? '#60a5fa' : 'rgba(255,255,255,0.8)'}
                    onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
                    style={{ cursor: 'pointer', marginLeft: '4px', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title={isStarred ? "Quitar de destacados" : "Añadir a destacados"}
                  />
                ) : (
                  <Icon icon="solar:star-bold-duotone" size={14} color="rgba(255,255,255,0.8)" />
                )}
                {(onGoToFolder && perms.move) && (
                  <Icon 
                    icon="solar:folder-open-bold-duotone" 
                    size={14} 
                    color="rgba(255,255,255,0.8)"
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '12px' }}>
            {perms.write ? 'Edición' : 'Solo Lectura'}
          </span>
          {onClose && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Cerrar">
              <Icon icon="mdi:close" size={18} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 16px', background: '#f3f2f1', borderBottom: '1px solid #e1dfdd', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {perms.write && (
            <button 
              onClick={handleSave} 
              disabled={saving}
              style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', background: '#185abd', color: 'white', fontWeight: 600, fontSize: '13px', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#104696'; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#185abd'; }}
            >
              {saving ? <><Icon icon="solar:refresh-circle-bold-duotone" size={16} /> Guardando...</> : <><Icon icon="solar:diskette-bold-duotone" size={16} /> Guardar Cambios</>}
            </button>
          )}
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>{perms.write ? 'Modifica el texto y presiona Guardar para sobrescribir el archivo original.' : 'Modo de solo lectura.'}</span>
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', background: '#e1e1e1' }}>
        <div style={{ width: '100%', maxWidth: '850px', background: 'white', color: 'black', minHeight: '800px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', paddingBottom: '40px' }}>
          <style>{`
            .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #ccc !important; position: sticky; top: 0; background: white; z-index: 10; padding: 10px; }
            .ql-container.ql-snow { border: none !important; font-size: 16px; font-family: 'Times New Roman', serif; }
            .ql-editor { min-height: 800px; padding: 40px 60px; }
          `}</style>
          <ReactQuill 
            ref={editorRef}
            theme="snow" 
            value={html} 
            onChange={setHtml} 
            modules={modules}
          />
        </div>
      </div>
    </div>
  );
}
