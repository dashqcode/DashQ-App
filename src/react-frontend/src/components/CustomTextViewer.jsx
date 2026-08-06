import React, { useEffect, useState } from 'react';

import Icon from './ui/Icon';
import { useAuth } from '../context/AuthContext';

export default function CustomTextViewer({ file, onRename, onToggleStar, isStarred, onGoToFolder, onClose }) {
  const { user } = useAuth();
  const perms = user?.permissions || { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false };

  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let isMounted = true;
    const loadText = async () => {
      if (!file?.url) {
        setError("URL de archivo no proporcionada.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error("Network error");
        const t = await response.text();
        if (!isMounted) return;
        setText(t);
      } catch {
        setError("Error al cargar el archivo de texto.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadText();
    return () => { isMounted = false; };
  }, [file]);

  if (loading) return <div style={{ padding: '20px', color: '#888' }}>Cargando Texto...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#252526', color: '#cccccc', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: '#3c3c3c', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Icon icon="solar:document-text-bold-duotone" size={16} color="#cccccc" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>Texto</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditingName ? (
              <input 
                 value={editName}
                 onChange={e => setEditName(e.target.value)}
                 onBlur={handleRenameSubmit}
                 onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                 autoFocus
                 style={{ background: 'rgba(255,255,255,0.1)', color: '#cccccc', border: '1px solid #007acc', borderRadius: '4px', padding: '2px 6px', fontSize: '13px', outline: 'none', width: '200px' }}
              />
            ) : (
              <span 
                onDoubleClick={handleDoubleClickName}
                onMouseEnter={() => setIsHoveringName(true)}
                onMouseLeave={() => setIsHoveringName(false)}
                title={onRename && perms.rename ? "Doble clic para renombrar" : ""}
                style={{ fontSize: '13px', fontWeight: '500', color: '#cccccc', display: 'flex', alignItems: 'center', gap: '8px', cursor: (onRename && perms.rename) ? 'text' : 'default', padding: '2px 6px', borderRadius: '4px', background: (onRename && perms.rename && isHoveringName) ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.2s' }}
              >
                {file?.name || 'Documento'}
                {(onRename && perms.rename) && isHoveringName && (
                   <Icon icon="solar:pen-bold-duotone" size={12} color="rgba(255,255,255,0.6)" />
                )}
                {(onToggleStar && perms.tag) ? (
                  <Icon 
                    icon={isStarred ? 'solar:star-bold-duotone' : 'solar:star-line-duotone'} 
                    size={14} 
                    color={isStarred ? '#60a5fa' : 'rgba(255,255,255,0.6)'}
                    onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
                    style={{ cursor: 'pointer', marginLeft: '4px', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title={isStarred ? "Quitar de destacados" : "Añadir a destacados"}
                  />
                ) : (
                  <Icon icon="solar:star-bold-duotone" size={14} color="rgba(255,255,255,0.6)" />
                )}
                {(onGoToFolder && perms.move) && (
                  <Icon 
                    icon="solar:folder-open-bold-duotone" 
                    size={14} 
                    color="rgba(255,255,255,0.6)"
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
          {onClose && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#cccccc', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Cerrar">
              <Icon icon="mdi:close" size={18} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
        {text}
      </div>
    </div>
  );
}
