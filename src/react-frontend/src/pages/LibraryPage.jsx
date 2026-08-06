import React, { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import UniversalSearch from '../components/ui/UniversalSearch';
import UniversalViewer from '../components/UniversalViewer';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function LibraryPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showLinkedFilesModal, setShowLinkedFilesModal] = useState(false);
  const [showSelectFilesModal, setShowSelectFilesModal] = useState(false);
  const [linkedFilesToView, setLinkedFilesToView] = useState([]);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'general',
    record_number: '',
    record_year: new Date().getFullYear().toString(),
    linked_files: []
  });

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const fileIdParam = queryParams.get('file_id');
  
  const [files, setFiles] = useState([]);
  
  // Dashboard State
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingNote, setViewingNote] = useState(null); // Used as selectedRecord
  const [timeline, setTimeline] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  
  const [attachedFile, setAttachedFile] = useState(null);
  const searchInputRef = React.useRef(null);
  const mainSearchRef = React.useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowModal(true);
      }
      if ((e.altKey && e.key.toLowerCase() === 'b') || (e.ctrlKey && e.key.toLowerCase() === 'f')) {
        if (showModal && searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
        } else if (!showModal && !viewingNote && mainSearchRef.current) {
          e.preventDefault();
          mainSearchRef.current.focus();
        }
      }
      if (e.key === 'Escape') {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          setShowModal(false);
        }
      }
      if (e.key === 'Enter' && confirmDeleteId) {
        e.preventDefault();
        executeDelete(confirmDeleteId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, viewingNote, confirmDeleteId]);

  useEffect(() => {
    fetchNotes(fileIdParam);
    fetchFiles();
  }, [fileIdParam]);

  const fetchNotes = async (fId) => {
    try {
      const url = fId ? `/api/notes?file_id=${fId}` : '/api/notes';
      const res = await fetch(url);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFiles(Array.isArray(data.files) ? data.files.map(f => ({ ...f, id: f.relative_path || f.filename })) : []);
    } catch(e) {
      console.error(e);
    }
  };

  const handleEditClick = (note) => {
    setIsEditingNote(true);
    setEditingNoteId(note.id);
    setNewNote({
      title: note.title || '',
      content: note.content || '',
      type: note.type || 'general',
      record_number: note.record_number || '',
      record_year: note.record_year || new Date().getFullYear().toString(),
      linked_files: note.linked_files || (fileIdParam ? [fileIdParam] : [])
    });
    setAttachedFile(null);
    setShowModal(true);
  };

  const resetModal = () => {
    setShowModal(false);
    setIsEditingNote(false);
    setEditingNoteId(null);
    setNewNote({ title: '', content: '', type: 'general', record_number: '', record_year: new Date().getFullYear().toString(), linked_files: fileIdParam ? [fileIdParam] : [] });
    setAttachedFile(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newNote.title);
      formData.append('content', newNote.content);
      formData.append('type', newNote.type);
      formData.append('record_number', newNote.record_number);
      formData.append('record_year', newNote.record_year);
      if (!isEditingNote) formData.append('created_by', user?.name || 'Usuario');
      formData.append('linked_files', JSON.stringify(newNote.linked_files));
      if (!isEditingNote && fileIdParam) formData.append('file_id', fileIdParam);
      if (attachedFile) formData.append('file', attachedFile);

      const url = isEditingNote ? `/api/notes/${editingNoteId}` : '/api/notes';
      const method = isEditingNote ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData
      });
      
      if (!res.ok) throw new Error('Error al guardar el registro');
      
      const savedNote = await res.json();
      
      if (isEditingNote) {
        setNotes(notes.map(n => n.id === editingNoteId ? savedNote : n));
        if (viewingNote?.id === editingNoteId) setViewingNote(savedNote);
        addToast('Acta actualizada con éxito', 'success');
      } else {
        setNotes([savedNote, ...notes]);
        addToast('Acta creada con éxito', 'success');
        handleCardClick(savedNote); // Auto-open detail if created
      }
      resetModal();
    } catch(e) {
      console.error(e);
      addToast(`Error al ${isEditingNote ? 'actualizar' : 'crear'} acta`, 'error');
    }
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id) => {
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
      if (viewingNote && viewingNote.id === id) {
        setViewingNote(null);
      }
      addToast('Registro eliminado', 'success');
    } catch(e) {
      console.error(e);
    }
  };

  const toggleLinkedFile = (fileId) => {
    const isLinked = newNote.linked_files.includes(fileId);
    if (isLinked) {
      setNewNote({...newNote, linked_files: newNote.linked_files.filter(id => id !== fileId)});
    } else {
      setNewNote({...newNote, linked_files: [...newNote.linked_files, fileId]});
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    const term = searchTerm.toLowerCase().trim();
    const match = notes.filter(n => 
      (n.tracking_code && n.tracking_code.toLowerCase() === term) || 
      (n.title && n.title.toLowerCase().includes(term))
    );
    
    if (match.length > 0) {
      handleCardClick(match[0]);
    } else {
      addToast('No se encontraron registros para esta búsqueda', 'warning');
    }
  };

  const handleCardClick = (note) => {
    setViewingNote(note);
    if (note.tracking_code) {
      const related = notes.filter(n => n.tracking_code === note.tracking_code);
      related.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
      setTimeline(related);
    } else {
      setTimeline([note]);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'informe': return { icon: 'solar:pie-chart-bold-duotone', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' };
      case 'acta_prestamo': return { icon: 'solar:document-text-bold-duotone', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
      case 'oficio': return { icon: 'solar:letter-bold-duotone', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
      default: return { icon: 'solar:notes-bold-duotone', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
    }
  };

  return (
    <div className="view-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', flex: 1, boxSizing: 'border-box', background: 'var(--bg-card)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.03)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="title-area">
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{fileIdParam ? 'Historial de Archivo' : 'Biblioteca y Seguimiento'}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Centro de mando para registros, actas y trazabilidad de expedientes.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {!viewingNote && (
            <UniversalSearch
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => { setSearchTerm(''); fetchNotes(fileIdParam); }}
              onSubmit={handleSearch}
              placeholder="Buscar expediente... (Ctrl+F)"
              inputRef={mainSearchRef}
              style={{ width: '280px', margin: 0 }}
            />
          )}
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '10px 20px', borderRadius: '24px', background: 'white', color: 'black', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s', whiteSpace: 'nowrap', height: '42px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            <Icon icon="solar:add-circle-bold-duotone" size={18} /> Nueva Acta
          </button>
        </div>
      </div>

      {!viewingNote && !fileIdParam && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div style={{
            margin: '0 0 16px 0',
            padding: '48px 40px',
            borderRadius: '24px',
            background: 'linear-gradient(115deg, #1e3a8a 0%, #3b82f6 45%, #0ea5e9 100%)',
            position: 'relative',
            overflow: 'hidden',
            color: 'white',
            boxShadow: '0 10px 30px rgba(59,130,246,0.2)'
          }}>
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>Modelos y Formatos Estandarizados</h2>
              <p style={{ fontSize: '15px', lineHeight: '1.6', opacity: 0.9, margin: 0 }}>
                Accede a la biblioteca centralizada de formatos oficiales, resoluciones y actas para mantener la uniformidad y formalidad en la redacción documental de la institución.
              </p>
            </div>
            
            {/* Elementos decorativos (Expediente y Sello) */}
            <div style={{ position: 'absolute', right: '80px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '16px', opacity: 0.95 }}>
               {/* Documento Base */}
               <div style={{ width: '240px', height: '160px', background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                     <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Icon icon="solar:document-text-bold-duotone" size={20} color="#3b82f6" />
                        </div>
                     </div>
                     <div style={{ width: '60px', height: '8px', background: '#e5e7eb', borderRadius: '4px' }} />
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ width: '85%', height: '8px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ width: '90%', height: '8px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '24px' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '2px', background: '#94a3b8' }} />
                     </div>
                  </div>
               </div>
               
               {/* Sello / Resolución Overlapping */}
               <div style={{ position: 'absolute', right: '-30px', top: '-20px', width: '110px', height: '150px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', padding: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9' }}>
                 <div style={{ width: '36px', height: '36px', background: '#ef4444', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 4px 10px rgba(239,68,68,0.3)' }}>
                   <Icon icon="solar:verified-check-bold" size={20} color="white" />
                 </div>
                 <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '10px' }} />
                 <div style={{ width: '70%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '20px' }} />
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px' }} />
                    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px' }} />
                    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px' }} />
                 </div>
               </div>
            </div>
          </div>

          <div style={{ margin: '0 0 24px 0', background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Icon icon="solar:letter-bold-duotone" size={16} />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Esta lista no es exhaustiva, se pueden proponer más formatos bajo demanda.</span>
            </div>
            <button style={{ padding: '8px 16px', border: '1px solid var(--border-light)', borderRadius: '20px', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Contactar Soporte
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-muted)' }}>
          <Icon icon="solar:refresh-bold-duotone" size={18} />
        </div>
      ) : !viewingNote ? (
        // VIEW 1: EXPLORATION (Dashboard)
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
          
          {/* Recently Added Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: 'white' }}>Agregados Recientemente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {notes.slice(0, 12).map(note => {
                const style = getIconForType(note.type);
                return (
                  <div key={note.id} onClick={() => handleCardClick(note)} style={{ background: '#1A1A1D', padding: '20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '30px', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon={style.icon} size={20} color={style.color} />
                      </div>
                      {note.tracking_code && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '30px', fontWeight: '600', color: 'white', letterSpacing: '0.5px' }}>{note.tracking_code}</span>}
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.title}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#6366f1', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{note.created_by?.substring(0,2).toUpperCase() || 'US'}</div>
                         {note.created_by}
                      </div>
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {notes.length === 0 && (
              <div style={{ flex: 1, padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon icon="solar:folder-error-bold-duotone" size={32} color="var(--color-primary)" />
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Sin registros</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', maxWidth: '280px' }}>No hay actas ni seguimientos recientes. Haz clic en "Nueva Acta" para comenzar.</p>
              </div>
            )}
          </div>

          {/* Others files list */}
          {notes.length > 12 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: 'white' }}>Otros registros</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notes.slice(12, 30).map(note => {
                  const style = getIconForType(note.type);
                  return (
                    <div key={note.id} onClick={() => handleCardClick(note)} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#1A1A1D', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                      <Icon icon={style.icon} size={16} color={style.color} style={{ width: '30px' }} />
                      <span style={{ flex: 1, fontSize: '14px', color: 'white', fontWeight: 500 }}>{note.title}</span>
                      {note.tracking_code && <span style={{ fontSize: '11px', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: '30px', marginRight: '24px' }}>{note.tracking_code}</span>}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '120px', textAlign: 'right' }}>{new Date(note.created_at).toLocaleDateString()}</span>
                      <div style={{ width: '150px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{note.created_by}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        // VIEW 2: SPLIT DASHBOARD (Detail View)
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setViewingNote(null)} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                 <Icon icon="solar:arrow-left-bold-duotone" size={18} /> Volver a Explorar
              </button>
              <button onClick={() => handleEditClick(viewingNote)} style={{ background: 'var(--color-primary)', padding: '8px 16px', borderRadius: '20px', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s', fontWeight: 600 }} onMouseEnter={e=>e.currentTarget.style.background='#4f46e5'} onMouseLeave={e=>e.currentTarget.style.background='var(--color-primary)'}>
                 <Icon icon="solar:pen-bold-duotone" size={18} /> Editar Acta
              </button>
            </div>

            <div style={{ display: 'flex', gap: '24px', padding: '0 24px', flex: 1, overflow: 'hidden' }}>
            
            {/* Left Column (Overview & Timeline) */}
            <div style={{ flex: '2', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingTop: '24px', paddingBottom: '24px', paddingRight: '12px' }}>
               <div>
                 <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', margin: '0 0 12px 0' }}>Resumen del Registro</h2>
                 <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'white' }}>{viewingNote.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{viewingNote.content}</p>
                 </div>
               </div>

               <div>
                 <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Icon icon="solar:history-bold" size={20} color="var(--color-primary)" />
                   Seguimiento y Actividades
                 </h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: '12px', paddingLeft: '24px', position: 'relative' }}>
                    {timeline.map((item) => (
                      <div key={item.id} style={{ position: 'relative' }}>
                        {/* Timeline node */}
                        <div style={{ position: 'absolute', left: '-36px', top: '20px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', border: '4px solid #131316', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }}></div>
                        </div>
                        
                        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-light)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{item.title}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString([], {hour: '2-digit', minute:'2-digit', day: '2-digit', month: 'short'})}</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '30px', fontSize: '10px', fontWeight: 'bold' }}>{item.type.toUpperCase().replace('_', ' ')}</span>
                          </div>

                          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.content}</p>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                               <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a855f7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{item.created_by?.substring(0,2).toUpperCase() || 'US'}</div>
                               Por {item.created_by}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                               <Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>

            {/* Right Column (Info & Attachments) */}
            <div className="right-panel-scroll" style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', padding: '0 16px 24px 12px' }}>
               
               {/* Client/Record Information Card */}
               <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                 <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: '0 0 16px 0' }}>Información del Registro</h3>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <div>
                     <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Creador:</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'white' }}>
                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{viewingNote.created_by?.substring(0,2).toUpperCase() || 'US'}</div>
                       {viewingNote.created_by}
                     </span>
                   </div>
                   
                   {(viewingNote.record_number || viewingNote.record_year) && (
                     <div>
                       <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Número de Documento:</span>
                       <span style={{ fontSize: '14px', color: 'white' }}>Nº {viewingNote.record_number || '?'} - {viewingNote.record_year || '?'}</span>
                     </div>
                   )}
                   
                   {viewingNote.tracking_code && (
                     <div>
                       <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Código de Expediente:</span>
                       <span style={{ fontSize: '13px', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(96,165,250,0.2)', letterSpacing: '0.5px' }}>{viewingNote.tracking_code}</span>
                     </div>
                   )}

                   <div>
                     <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Fecha de Inicio:</span>
                     <span style={{ fontSize: '14px', color: 'white' }}>{new Date(timeline[0]?.created_at || viewingNote.created_at).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                   </div>
                 </div>
               </div>

                {/* Documento Principal */}
                {!!viewingNote.attached_file_id && (
                  <div style={{ background: 'transparent', padding: '16px', borderRadius: '24px', border: '1px solid var(--color-primary)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon icon="solar:document-text-bold-duotone" size={20} />
                      Documento Principal
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.05)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                        <Icon icon="solar:file-bold-duotone" size={20} color="var(--color-primary)" />
                        <span style={{ fontSize: '13px', color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={viewingNote.attached_file_id.replace(/^\d{8}_\d{6}_/, '')}>
                          {viewingNote.attached_file_id.replace(/^\d{8}_\d{6}_/, '')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button onClick={() => { 
                          const cleanId = viewingNote.attached_file_id.replace(/^\d{8}_\d{6}_/, '');
                          const previewName = (!cleanId.includes('.')) ? `${cleanId}.pdf` : cleanId;
                          setPreviewFile({ url: `/api/files/${viewingNote.attached_file_id}/download`, name: previewName }); 
                        }} style={{ width: '30px', height: '30px', borderRadius: '15px', background: 'var(--color-primary)', color: '#111111', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'} title="Previsualizar">
                          <Icon icon="solar:eye-bold-duotone" size={16} />
                        </button>
                        <a href={`/api/files/${viewingNote.attached_file_id}/download`} download style={{ width: '30px', height: '30px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} title="Descargar">
                          <Icon icon="solar:download-bold-duotone" size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Archivos Adjuntos (Gestor) */}
                <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon="solar:folder-with-files-bold-duotone" size={20} color="var(--text-muted)" />
                    Archivos Adjuntos (Gestor)
                  </h3>
                  
                  {(() => {
                    const linkedFilesList = [];
                    try { const parsed = typeof viewingNote.linked_files === 'string' ? JSON.parse(viewingNote.linked_files) : viewingNote.linked_files; if (parsed) parsed.forEach(id => { const f = files.find(x => x.id === id); if (f) linkedFilesList.push(f); }); } catch {}
                    
                    const totalFiles = linkedFilesList.length;
                    
                    if (totalFiles === 0) return (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '30px' }}>
                        No hay archivos del Gestor adjuntos a este registro.
                      </div>
                    );

                    return (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                            <Icon icon="solar:folder-with-files-bold-duotone" size={18} color="var(--text-primary)" />
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{linkedFilesList.length} Archivo(s) Vinculado(s)</span>
                          </div>
                        </div>
                        
                        <button onClick={() => {
                          setLinkedFilesToView(linkedFilesList);
                          setShowLinkedFilesModal(true);
                        }} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                          <Icon icon="solar:eye-bold-duotone" size={16} /> Ver archivos adjuntos en detalle
                        </button>
                      </div>
                    );
                  })()}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon icon="solar:trash-bin-trash-bold-duotone" size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'white' }}>Eliminar Registro</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 500, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>Cancelar (Esc)</button>
              <button onClick={() => executeDelete(confirmDeleteId)} style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(239,68,68,0.3)', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#f87171'} onMouseLeave={e => e.currentTarget.style.background='#ef4444'}>Eliminar (Enter)</button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '30px', width: '100%', maxWidth: '600px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{isEditingNote ? 'Editar Acta / Registro' : (fileIdParam ? 'Añadir Nota al Archivo' : 'Nueva Acta / Registro')}</h3>
              <button onClick={resetModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}><Icon icon="mdi:close" size={18} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Tipo de Documento</label>
                  <CustomSelect
                    value={newNote.type}
                    onChange={(val) => setNewNote({...newNote, type: val})}
                    options={[
                      { value: 'informe', label: 'Informe' },
                      { value: 'acta_prestamo', label: 'Acta de Préstamo' },
                      { value: 'oficio', label: 'Oficio / Carta' },
                      { value: 'general', label: 'Nota General' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Número de Documento</label>
                  <input type="text" value={newNote.record_number} onChange={e => setNewNote({...newNote, record_number: e.target.value})} placeholder="Ej. 145" style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Año</label>
                  <input type="text" value={newNote.record_year} onChange={e => setNewNote({...newNote, record_year: e.target.value})} placeholder="Ej. 2026" style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Título o Asunto</label>
                <input type="text" value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} required placeholder="Ej. Acta de Préstamo - Expediente 45" style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Descripción / Contenido</label>
                <textarea value={newNote.content} onChange={e => setNewNote({...newNote, content: e.target.value})} required rows={4} placeholder="Detalla el informe o evento..." style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none' }}></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Subir Archivo Físico / Informe (Opcional)</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '20px', border: '1px dashed var(--border-light)', background: attachedFile ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)', color: attachedFile ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', transition: '0.2s', width: '100%', boxSizing: 'border-box' }}>
                  <Icon icon="solar:cloud-upload-bold-duotone" size={16} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachedFile ? attachedFile.name : 'Seleccionar archivo PDF, Word, Excel...'}</span>
                  {attachedFile && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSize(attachedFile.size)}</span>}
                  {attachedFile && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAttachedFile(null); }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '8px' }} title="Quitar archivo">
                      <Icon icon="mdi:close" size={18} />
                    </button>
                  )}
                  <input type="file" onChange={e => setAttachedFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Vincular Archivos del Gestor 📎</label>
                <button type="button" onClick={() => setShowSelectFilesModal(true)} style={{ width: '100%', padding: '14px', borderRadius: '20px', border: '1px dashed var(--border-light)', background: newNote.linked_files.length > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)', color: newNote.linked_files.length > 0 ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Icon icon="solar:folder-open-bold-duotone" size={20} />
                  {newNote.linked_files.length > 0 ? `${newNote.linked_files.length} archivos seleccionados` : 'Elegir PDF adjuntos...'}
                </button>
              </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={resetModal} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '20px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'var(--color-primary)', border: 'none', color: '#111111', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>{isEditingNote ? 'Guardar Cambios' : 'Guardar Registro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Linked Files Modal */}
        {showLinkedFilesModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '30px', width: '100%', maxWidth: '700px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon="solar:folder-with-files-bold-duotone" size={24} color="var(--color-primary)" />
                    Archivos Vinculados ({linkedFilesToView.length})
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Lista completa de archivos adjuntados desde el Gestor a este registro.</p>
                </div>
                <button onClick={() => setShowLinkedFilesModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  <Icon icon="mdi:close" size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                {linkedFilesToView.map((f, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        <Icon icon={f.type === 'folder' ? 'solar:folder-bold-duotone' : 'solar:file-bold-duotone'} size={24} color={f.type === 'folder' ? '#60a5fa' : '#9ca3af'} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ color: 'white', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.filename}>{f.filename || 'Archivo Desconocido'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icon icon="solar:folder-linear" size={12} /> {f.original_path || '/uploads/'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSize(f.size)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {!f.isAttachedFile && (
                        <button onClick={() => navigate('/gestor', { state: { folderId: f.original_path || '' } })} style={{ width: '36px', height: '36px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'} title="Ir a la Ubicación en el Gestor">
                          <Icon icon="solar:folder-open-bold-duotone" size={18} />
                        </button>
                      )}
                      
                      {f.filename && (
                        <>
                          <button onClick={() => { 
                            setShowLinkedFilesModal(false); 
                            const previewName = (!f.filename.includes('.') && f.isAttachedFile) ? `${f.filename}.pdf` : f.filename;
                            setPreviewFile({ url: f.isAttachedFile ? `/api/files/${f.filename}/download` : f.path, name: previewName }); 
                          }} style={{ width: '36px', height: '36px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} title="Previsualizar">
                            <Icon icon="solar:eye-bold-duotone" size={18} />
                          </button>
                          <a href={f.isAttachedFile ? `/api/files/${f.filename}/download` : f.path} download style={{ width: '36px', height: '36px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} title="Descargar">
                            <Icon icon="solar:download-bold-duotone" size={18} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      {/* PDF Preview Modal */}
      {previewFile && (
        <UniversalViewer file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

        {/* Select Linked Files Modal */}
        {showSelectFilesModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--bg-secondary)', width: '100%', maxWidth: '750px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                  <Icon icon="solar:folder-open-bold-duotone" size={24} color="var(--color-primary)" />
                  Seleccionar Archivos para Vincular
                </h2>
                <button onClick={() => setShowSelectFilesModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  <Icon icon="mdi:close" size={20} />
                </button>
              </div>

              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <input ref={searchInputRef} type="text" placeholder="Buscar archivo... (Ctrl+F)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 20px', borderRadius: '30px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {files.filter(f => (f.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) || f.original_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                  <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '24px', background: newNote.linked_files.includes(f.id) ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)', border: newNote.linked_files.includes(f.id) ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newNote.linked_files.includes(f.id)} onChange={() => toggleLinkedFile(f.id)} style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', transform: 'scale(1.2)', margin: 0 }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                      <Icon icon={f.filename && f.filename.endsWith('.pdf') ? 'solar:document-bold-duotone' : 'solar:file-bold-duotone'} size={20} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.original_name || f.filename}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatSize(f.size)}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.id}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSelectFilesModal(false); setPreviewFile({ url: f.path, name: f.filename }); }} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} title="Previsualizar">
                        <Icon icon="solar:eye-bold-duotone" size={18} />
                      </button>
                    </div>
                  </label>
                ))}
                {files.filter(f => (f.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) || f.original_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <Icon icon="solar:file-remove-bold-duotone" size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p style={{ margin: 0 }}>No se encontraron archivos con ese nombre.</p>
                  </div>
                )}
              </div>

              <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{newNote.linked_files.length} archivos seleccionados</span>
                <button type="button" onClick={() => setShowSelectFilesModal(false)} style={{ padding: '12px 28px', background: 'var(--color-primary)', border: 'none', color: '#111111', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                  Confirmar Selección
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}

export default LibraryPage;
