import React, { useState, useEffect, useRef } from 'react';
import Icon from './ui/Icon';
import { useFiles } from '../context/FileContext';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { files, setCurrentFolderId } = useFiles();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Toggle with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const getExt = (name) => name?.split('.').pop().toLowerCase() || '';

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10); // Limit to top 10

  // Keyboard navigation
  useEffect(() => {
    const handleNav = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredFiles.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          handleSelect(filteredFiles[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filteredFiles, selectedIndex]);

  const handleSelect = (file) => {
    if (file.type === 'folder') {
      setCurrentFolderId(file.id);
      navigate('/gestor');
    } else {
      const isWordExcel = ['doc','docx','xls','xlsx','csv'].includes(getExt(file.name));
      const url = `/editor?id=${encodeURIComponent(file.id)}&name=${encodeURIComponent(file.name)}&url=${encodeURIComponent(file.url)}`;
      if (isWordExcel) {
        window.open(url, '_blank');
      } else {
        navigate(url);
      }
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh'
    }}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: '30px', width: '100%', maxWidth: '600px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Input area */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Icon icon="solar:magnifer-bold-duotone" size={18} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Buscar archivos o carpetas..." 
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
          />
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
            ESC para salir
          </div>
        </div>

        {/* Results */}
        {query && (
          <div ref={listRef} style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
            {filteredFiles.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se encontraron resultados para "{query}"
              </div>
            ) : (
              filteredFiles.map((file, i) => (
                <div 
                  key={file.id} 
                  onClick={() => handleSelect(file)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    padding: '12px 16px', borderRadius: '20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: i === selectedIndex ? 'var(--color-primary)' : 'transparent',
                    color: i === selectedIndex ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.1s'
                  }}
                >
                  <Icon icon={file.type === 'folder' ? 'solar:folder-bold-duotone' : 'solar:file-bold-duotone'} size={16} color={file.type === 'folder' ? '#60a5fa' : '#9ca3af'} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: i === selectedIndex ? '#fff' : 'var(--text-primary)' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase' }}>
                    {file.type === 'folder' ? 'Carpeta' : getExt(file.name)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
