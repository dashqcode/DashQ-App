import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { useFiles } from '../context/FileContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import UniversalSearch from '../components/ui/UniversalSearch';
import UniversalViewer from '../components/UniversalViewer';
import { io } from 'socket.io-client';

const TAG_COLORS = [
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Naranja', value: '#f97316' },
  { name: 'Amarillo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Morado', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Gris', value: '#6b7280' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (isoString) => {
  if (!isoString) return '--';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getFileIconInfo = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                          return { icon: 'solar:document-bold-duotone',      color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return { icon: 'solar:gallery-bold-duotone',       color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
  if (['doc','docx'].includes(ext))                   return { icon: 'solar:document-text-bold-duotone', color: '#2563eb', bg: 'rgba(37,99,235,0.15)' };
  if (['xls','xlsx'].includes(ext))                   return { icon: 'solar:document-bold-duotone',      color: '#16a34a', bg: 'rgba(22,163,74,0.15)' };
  if (['zip','rar','7z'].includes(ext))               return { icon: 'solar:archive-bold-duotone',       color: '#d97706', bg: 'rgba(217,119,6,0.15)' };
  if (['mp4','avi','mov','mkv'].includes(ext))        return { icon: 'solar:video-frame-bold-duotone',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };
  if (['mp3','wav','flac','ogg'].includes(ext))       return { icon: 'solar:music-note-2-bold-duotone',  color: '#ec4899', bg: 'rgba(236,72,153,0.15)' };
  if (['txt','csv'].includes(ext))                    return { icon: 'solar:document-text-bold-duotone', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
  return { icon: 'solar:file-bold-duotone', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
};

const GetFileIcon = ({ name }) => {
  const info = getFileIconInfo(name);
  return <Icon icon={info.icon} size={20} style={{color: info.color}} />;
};


const getCategory = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'image';
  if (['xls','xlsx','csv'].includes(ext)) return 'excel';
  if (['doc','docx'].includes(ext)) return 'word';
  if (['txt'].includes(ext)) return 'text';
  return 'other';
};

const renderHighlightedName = (file, query) => {
  let namePart = file.name;
  let extPart = '';
  if (file.type !== 'folder' && file.name.includes('.')) {
    const extIndex = file.name.lastIndexOf('.');
    namePart = file.name.substring(0, extIndex);
    extPart = file.name.substring(extIndex).toLowerCase();
  }
  if (!query || file.type === 'folder') {
    return (
      <>
        {namePart}
        {extPart && <span style={{ opacity: 0.4, fontWeight: 400 }}>{extPart}</span>}
      </>
    );
  }
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = namePart.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={i} style={{ backgroundColor: '#bef264', color: '#000', borderRadius: '2px', padding: '0 2px' }}>{part}</span>
          : part
      )}
      {extPart && <span style={{ opacity: 0.4, fontWeight: 400 }}>{extPart}</span>}
    </>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

function GestorPage() {
  const {
    files,
    trashFiles,
    isLoading,
    currentFolderId,
    setCurrentFolderId,
    globalStats,
    uploadFile,
    createFolder,
    renameFile,
    moveFile,
    bulkMoveToTrash,
    bulkPermanentDelete,
    restoreFile,
    error,
    clearError,
    fetchCurrentFolder,
    toggleStar,
    uploadQueue,
    clearUploadQueue
  } = useFiles();

  const { user } = useAuth();
  const perms = user?.permissions || { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false };

  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (location.state?.folderId) {
      setCurrentFolderId(location.state.folderId);
      setActiveTab('mis-archivos');
    }
  }, [location.state, setCurrentFolderId]);

  // Sincronizar URL -> Estado (Para que funcione el botón de retroceso)
  useEffect(() => {
    const urlFolder = searchParams.get('folder') || '';
    if (urlFolder !== currentFolderId) {
      setCurrentFolderId(urlFolder);
      setActiveTab('mis-archivos'); // Asegurar que estamos en mis-archivos si navegamos a una carpeta
      setSearchInput('');
      setSearchQuery('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sincronizar Estado -> URL (Al abrir una carpeta)
  useEffect(() => {
    const urlFolder = searchParams.get('folder') || '';
    if (currentFolderId !== urlFolder) {
      const newParams = new URLSearchParams(searchParams);
      if (currentFolderId) {
        newParams.set('folder', currentFolderId);
      } else {
        newParams.delete('folder');
      }
      setSearchParams(newParams, { replace: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  // ── State ──
  const [processingAction, setProcessingAction] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [filesWithNotes, setFilesWithNotes] = useState([]);
  const [zipCart, setZipCart] = useState([]);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [zipFileName, setZipFileName] = useState('');
  useEffect(() => {
    fetch('/api/notes?type=general')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const linkedIds = data.map(n => {
            try {
              return typeof n.linked_files === 'string' ? JSON.parse(n.linked_files) : n.linked_files;
            } catch { return []; }
          }).flat();
          setFilesWithNotes(linkedIds.filter(id => id));
        }
      })
      .catch(err => console.error("Error fetching notes in Gestor:", err));
  }, []);

  const [activeTab,    setActiveTab]    = useState(() => {
    return sessionStorage.getItem('dashq_active_tab') || 'mis-archivos';
  });

  const [sharedFiles, setSharedFiles] = useState([]);

  useEffect(() => {
    sessionStorage.setItem('dashq_active_tab', activeTab);
    if (activeTab === 'compartidos') {
      fetch('/api/share')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSharedFiles(data.map(s => ({
              id: s.path,
              name: s.name,
              type: s.type || 'file',
              token: s.token,
              date: s.date || new Date().toISOString(),
              isShared: true,
              size: 0
            })));
          }
        })
        .catch(err => console.error('Error fetching shares:', err));
    }
  }, [activeTab]);

  useEffect(() => {
    const socket = io({ transports: ['polling'] });
    socket.on('refresh_needed', () => {
      fetchCurrentFolder(true);
    });
    return () => socket.disconnect();
  }, [fetchCurrentFolder]);
  const [viewMode,     setViewMode]     = useState('list');
  const [searchInput,  setSearchInput]  = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [_searchLoading, setSearchLoading] = useState(false);
  const [isUploadManagerExpanded, setIsUploadManagerExpanded] = useState(true);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [isDownloadManagerExpanded, setIsDownloadManagerExpanded] = useState(true);
  const clearDownloadQueue = () => setDownloadQueue([]);

  const [hoveredUploadId, setHoveredUploadId] = useState(null);
  const MIN_SEARCH_LENGTH = 1;
  const [sortBy,       setSortBy]       = useState('name');
  const [sortOrder,    setSortOrder]    = useState('asc');
  const [pinnedFolders,setPinnedFolders]= useState(() => JSON.parse(localStorage.getItem('dashq_pins')  || '[]'));

  const [selectedFileIds,  setSelectedFileIds]  = useState([]);
  const [renamingFileId,   setRenamingFileId]   = useState(null);
  const [inlineRenameValue,setInlineRenameValue]= useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newFolderName,    setNewFolderName]    = useState('');

  const [isNuevoOpen,      setIsNuevoOpen]      = useState(false);
  const [isPreviewOpen,    setIsPreviewOpen]    = useState(false);
  const [isInfoPanelOpen,  setIsInfoPanelOpen]  = useState(false);
  const [isSearchAnimating,setIsSearchAnimating]= useState(false);
  const [dragOverlay,      setDragOverlay]      = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [isMoveModalOpen,        setIsMoveModalOpen]        = useState(false);
  const [moveModalCurrentFolderId, setMoveModalCurrentFolderId] = useState('');
  const [isMoveCreatingFolder,   setIsMoveCreatingFolder]   = useState(false);
  const [moveModalNewFolderName, setMoveModalNewFolderName] = useState('');


  const { addToast: showToast } = useToast();

  // ── 🖱️ Refs 🖱️──
  const dropdownRef   = useRef(null);
  const fileInputRef  = useRef(null);
  const renameInputRef = useRef(null);
  const newFolderRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Search handler ──
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
    setSearchQuery(value.trim());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Derived ──
  const displayedFiles = useMemo(() => {
    let base;
    if      (activeTab === 'papelera')   base = trashFiles  || [];
    else if (activeTab === 'destacados') base = (files || []).filter(f => f.isStarred);
    else if (activeTab === 'compartidos')base = sharedFiles || [];
    else                                 base = files || [];

    let processed;

    if (searchQuery && searchQuery.trim().length >= MIN_SEARCH_LENGTH) {
      processed = (activeTab === 'papelera' ? [] : searchResults);
    } else {
      processed = base;
    }

    processed.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      let comp = 0;
      if (sortBy === 'name') comp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      if (sortBy === 'size') comp = (a.size || 0) - (b.size || 0);
      if (sortBy === 'date') comp = new Date(a.date) - new Date(b.date);
      return sortOrder === 'asc' ? comp : -comp;
    });
    return processed;
  }, [files, trashFiles, sharedFiles, activeTab, searchQuery, searchResults, sortBy, sortOrder]);

  const selectedFile = useMemo(() => {
    if (selectedFileIds.length !== 1) return null;
    return displayedFiles?.find(f => f.id === selectedFileIds[0])
      || (activeTab === 'destacados' ? globalStats?.recentFiles?.find(f => f.id === selectedFileIds[0]) : null)
      || null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileIds, activeTab, globalStats, displayedFiles]);

  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    const parts = currentFolderId.split('/');
    let acc = '';
    return parts.map((part, i) => {
      acc = i === 0 ? part : `${acc}/${part}`;
      return { name: part, id: acc };
    });
  }, [currentFolderId]);

  const trashCount = (trashFiles || []).length;

  // 🚀 Toast helper 🚀
  // Uses global useToast now.

  // ✨ Effects ✨
  const fetchPins = async () => {
    try {
      const res = await fetch('/api/pins');
      if (res.ok) {
        const data = await res.json();
        setPinnedFolders(Object.values(data).map(p => ({ ...p, id: p.path })));
      }
    } catch(e) { console.error('Error fetching pins', e); }
  };

  useEffect(() => {
    localStorage.setItem('dashq_pins', JSON.stringify(pinnedFolders));
  }, [pinnedFolders]);

  useEffect(() => {
    fetchPins();
  }, []);

  useEffect(() => {
    function handle(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNuevoOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, clearError, showToast]);

  useEffect(() => {
    if (renamingFileId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingFileId]);

  useEffect(() => {
    if (isCreatingInline && newFolderRef.current) newFolderRef.current.focus();
  }, [isCreatingInline]);

  useEffect(() => {
    if (searchQuery) {
      setIsSearchAnimating(true);
      const t = setTimeout(() => setIsSearchAnimating(false), 400);
      return () => clearTimeout(t);
    }
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedSearchQuery;
    if (!query || query.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    let isCancelled = false;
    const controller = new AbortController();

    const loadSearchResults = async () => {
      try {
        const res = await fetch(`/api/browse?path=${encodeURIComponent(currentFolderId)}&search=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          if (!isCancelled) setSearchResults([]);
          setSearchLoading(false);
          return;
        }

        const data = await res.json();
        if (isCancelled) return;

        const mappedFiles = (data.files || []).map(f => {
          const ext = f.filename.split('.').pop().toLowerCase();
          const category = getCategory(f.filename);
          return {
            id: f.relative_path,
            name: f.original_name,
            filename: f.filename,
            type: ext === 'pdf' ? 'application/pdf' : 'file',
            size: f.size,
            date: f.date,
            category: category,
            parentId: f.folder || currentFolderId,
            url: encodeURI(f.path),
            isSearchResult: true
          };
        });
        
        const mappedFolders = (data.folders || []).map(f => {
          return {
            id: f.id,
            name: f.name,
            type: 'folder',
            parentId: f.parentId || '',
            isSearchResult: true
          };
        });

        setSearchResults([...mappedFolders, ...mappedFiles]);
      } catch (error) {
        if (!isCancelled && error.name !== 'AbortError') {
          console.error('Error searching files:', error);
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) setSearchLoading(false);
      }
    };

    loadSearchResults();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [currentFolderId, debouncedSearchQuery]);

  const handleAttemptClosePreview = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cerrar vista previa',
      message: '¿Estás seguro que deseas cerrar la previsualización del archivo?',
      onConfirm: () => {
        setIsPreviewOpen(false);
        setConfirmModal({ isOpen: false });
      },
      onCancel: () => {
        setConfirmModal({ isOpen: false });
      }
    });
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmModal.isOpen) { setConfirmModal({ isOpen: false }); return; }
        if (isMoveModalOpen) { setIsMoveModalOpen(false); return; }
        if (isPreviewOpen) { handleAttemptClosePreview(); return; }
        setSelectedFileIds([]);
        return;
      }

      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (isPreviewOpen) {
          handleAttemptClosePreview();
        } else if (selectedFileIds.length === 1 && selectedFile && selectedFile.type !== 'folder') {
          setIsPreviewLoading(true);
          setIsPreviewOpen(true);
        }
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
        return;
      }

      if (confirmModal.isOpen || isPreviewOpen || isMoveModalOpen) return;
      
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsCreatingInline(true);
        setNewFolderName('Nueva Carpeta');
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
        return;
      }

      if (e.code === 'Delete') {
        handleDeleteSelected();
      } else if (e.code === 'F2' && selectedFile) {
        e.preventDefault();
        setInlineRenameValue(selectedFile.name);
        setRenamingFileId(selectedFile.id);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        setSelectedFileIds(displayedFiles.map(f => f.id));
      } else if (e.code === 'Enter' && selectedFileIds.length === 1 && selectedFile) {
        e.preventDefault();
        if (selectedFile.type === 'folder') {
          setCurrentFolderId(selectedFile.id);
          setSelectedFileIds([]);
          setSearchInput('');
          setSearchQuery('');
        } else {
          setIsPreviewLoading(true);
          setIsPreviewOpen(true);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, confirmModal.isOpen, isPreviewOpen, displayedFiles, selectedFileIds, searchInputRef.current]);

  // ── File upload ──
  const handleFileUploadClick = () => {
    setIsNuevoOpen(false);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSaveTags = async (id, tags) => {
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags })
      });
      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, tags } : f));
        showToast('Etiquetas guardadas', 'success');
      } else {
        showToast('Error al guardar etiquetas', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const handleFileChange = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = null;
    if (!picked.length) return;
    picked.forEach(file => uploadFile(file));
  };

  // ── Drag & drop ──
  const handleContainerDragOver = (e) => { 
    if (e.dataTransfer.types && e.dataTransfer.types.includes("Files")) {
      e.preventDefault(); 
      setDragOverlay(true); 
    }
  };
  const handleContainerDragLeave = () => setDragOverlay(false);
  const handleContainerDrop = async (e) => {
    setDragOverlay(false);
    if (!perms.write) {
      showToast('No tienes permisos para subir archivos', 'error');
      return;
    }
    if (!e.dataTransfer.types || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;
    droppedFiles.forEach(file => uploadFile(file));
  };

  // ── Selection ──
  const handleSelectFile = (file, e) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedFileIds(prev =>
        prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
      );
    } else if (e.shiftKey && selectedFileIds.length > 0) {
      const allIds = displayedFiles.map(f => f.id);
      const lastIdx = allIds.indexOf(selectedFileIds[selectedFileIds.length - 1]);
      const currIdx = allIds.indexOf(file.id);
      const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
      setSelectedFileIds(allIds.slice(start, end + 1));
    } else {
      setSelectedFileIds([file.id]);
    }
  };

  const handleOpenFile = (file) => {
    if (file.type === 'folder') {
      setCurrentFolderId(file.id);
      setSelectedFileIds([]);
      setSearchInput('');
      setSearchQuery('');
    } else {
      setSelectedFileIds([file.id]);
      setIsPreviewLoading(true);
      setIsPreviewOpen(true);
    }
  };

  const sortPinsAZ = async () => {
    const sorted = [...pinnedFolders].sort((a, b) => a.name.localeCompare(b.name));
    setPinnedFolders(sorted);
    try {
      await fetch('/api/pins/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: sorted.map(p => p.id) })
      });
    } catch(e) { console.error(e); }
  };

  const handlePinDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePinDrop = async (e, targetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    
    const sourceIndex = pinnedFolders.findIndex(p => p.id === sourceId);
    const targetIndex = pinnedFolders.findIndex(p => p.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    
    const newPins = [...pinnedFolders];
    const [moved] = newPins.splice(sourceIndex, 1);
    newPins.splice(targetIndex, 0, moved);
    
    setPinnedFolders(newPins);
    
    try {
      await fetch('/api/pins/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newPins.map(p => p.id) })
      });
    } catch(e) { console.error(e); }
  };

  // ── Rename ──
  const commitRename = async () => {
    let trimmed = inlineRenameValue.trim();
    if (renamingFileId && trimmed) {
      const file = displayedFiles.find(f => f.id === renamingFileId);
      if (file) {
        const ext = file.type === 'folder' ? '' : (file.name.match(/\.[^/.]+$/) || [''])[0];
        trimmed = trimmed + ext;
        if (file.name !== trimmed) {
          setProcessingAction('Renombrando...');
          try {
            await renameFile(renamingFileId, trimmed, file.type);
            showToast('Elemento renombrado', 'success');
          } catch { showToast('Error al renombrar', 'error'); }
          finally { setProcessingAction(null); }
        }
      }
    }
    setRenamingFileId(null);
  };


  // ── Create folder ──
  const handleCreateFolderInline = () => {
    setIsNuevoOpen(false);
    setNewFolderName('');
    setIsCreatingInline(true);
  };

  const commitCreateFolder = async () => {
    if (newFolderName.trim()) {
      setProcessingAction('Creando carpeta...');
      try {
        await createFolder(newFolderName.trim());
        showToast(`Carpeta "${newFolderName.trim()}" creada`, 'success');
      } catch { showToast('Error al crear carpeta', 'error'); }
      finally { setProcessingAction(null); }
    }
    setIsCreatingInline(false);
    setNewFolderName('');
  };

  // ── Delete ──
  const handleEmptyTrash = () => {
    if (!trashFiles || trashFiles.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Vaciar papelera',
      message: `¿Estás seguro de vaciar la papelera? Esta acción eliminará permanentemente ${trashFiles.length} elemento(s) y no se puede deshacer.`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        setProcessingAction('Vaciando papelera...');
        const ids = trashFiles.map(f => f.id);
        if (ids.length) {
          await bulkPermanentDelete(ids);
        }
        setProcessingAction(null);
        showToast('Papelera vaciada');
      }
    });
  };

  const handleDeleteSelected = (targetIds = null) => {
    const idsToProcess = Array.isArray(targetIds) ? targetIds : selectedFileIds;
    if (!idsToProcess.length) return;
    
    if (activeTab === 'papelera') {
      setConfirmModal({
        isOpen: true,
        type: 'danger',
        title: `Eliminar permanentemente`,
        message: `¿Estás seguro de eliminar ${idsToProcess.length} elemento(s) de forma permanente? Esta acción no se puede deshacer.`,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          setProcessingAction('Eliminando permanentemente...');
          await bulkPermanentDelete(idsToProcess);
          setProcessingAction(null);
          setSelectedFileIds([]);
        }
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: `Mover a la papelera`,
      message: `¿Mover ${idsToProcess.length} elemento(s) a la papelera?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        setProcessingAction('Moviendo a papelera...');
        
        let pinsChanged = false;
        for (const id of idsToProcess) {
          const file = displayedFiles.find(f => f.id === id);
          if (file && file.type === 'folder' && pinnedFolders.some(p => p.id === id)) {
            await fetch('/api/pins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: id }) });
            pinsChanged = true;
          }
        }
        
        await bulkMoveToTrash(idsToProcess);
        setProcessingAction(null);
        setSelectedFileIds([]);
        if (pinsChanged) fetchPins();
        showToast('Elemento(s) movidos a la papelera');
      }
    });
  };

  const handleTogglePin = async (file) => {
    if (file.type !== 'folder') return;
    const isPinned = pinnedFolders.some(p => p.id === file.id);
    try {
      if (isPinned) {
        await fetch('/api/pins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: file.id }) });
        setPinnedFolders(prev => prev.filter(p => p.id !== file.id));
        showToast('Carpeta desanclada', 'info');
      } else {
        await fetch('/api/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: file.id, name: file.name }) });
        setPinnedFolders(prev => [...prev, { id: file.id, path: file.id, name: file.name }]);
        showToast('Carpeta anclada', 'success');
      }
    } catch(e) {
      console.error(e);
      showToast('Error al modificar anclaje', 'error');
    }
  };




  // ── Download ──
  const performDownload = async (isGet, url, postData, defaultFileName, isZip = false) => {
    const downloadId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setDownloadQueue(prev => [...prev, { id: downloadId, name: defaultFileName, status: isZip ? 'compressing' : 'downloading', progress: isZip ? 25 : 50 }]);
    
    try {
      if (window.showSaveFilePicker) {
        let handle;
        try {
          handle = await window.showSaveFilePicker({ suggestedName: defaultFileName });
        } catch (_err) {
          if (err.name === 'AbortError') {
            setDownloadQueue(prev => prev.filter(item => item.id !== downloadId));
            return;
          }
          throw err;
        }
        
        const fetchOptions = isGet ? {} : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        };
        const res = await fetch(url, fetchOptions);
        if (!res.ok) throw new Error('Error en descarga');
        const blob = await res.blob();
        setDownloadQueue(prev => prev.map(item => item.id === downloadId ? { ...item, status: 'downloading', progress: 75 } : item));

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        setDownloadQueue(prev => prev.map(item => item.id === downloadId ? { ...item, status: 'success', progress: 100 } : item));
      } else {
        if (isGet) {
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = url;
          form.style.display = 'none';

          if (postData) {
            for (const key in postData) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = typeof postData[key] === 'object' ? JSON.stringify(postData[key]) : postData[key];
              form.appendChild(input);
            }
          }
          
          const inputName = document.createElement('input');
          inputName.type = 'hidden';
          inputName.name = 'download_name';
          inputName.value = defaultFileName;
          form.appendChild(inputName);

          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
        }
        
        setDownloadQueue(prev => prev.map(item => item.id === downloadId ? { ...item, status: 'success', progress: 100 } : item));
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Error al descargar', e);
        setDownloadQueue(prev => prev.map(item => item.id === downloadId ? { ...item, status: 'error', progress: 100 } : item));
      }
    }
  };

  const handleDownload = async (explicitFile = null) => {
    const targetFile = explicitFile && explicitFile.url ? explicitFile : selectedFile;
    if (!targetFile?.url) return;
    const finalUrl = targetFile.url.startsWith('/') || targetFile.url.startsWith('http') ? targetFile.url : `/${targetFile.url}`;
    await performDownload(true, finalUrl, null, targetFile.name);
  };

  const handleAddToZipCart = (ids = null) => {
    const targetIds = ids || selectedFileIds;
    const filesToAdd = targetIds.filter(id => {
      const f = displayedFiles.find(df => df.id === id);
      return f && f.type !== 'folder';
    });
    setZipCart(prev => {
      const newCart = [...prev];
      filesToAdd.forEach(id => {
        if (!newCart.includes(id)) newCart.push(id);
      });
      return newCart;
    });
    if (!ids) setSelectedFileIds([]);
    // showToast `${filesToAdd.length} archivo(s) añadido(s) al carrito`, 'success');
  };

  const handleCartDownload = async () => {
    if (zipCart.length === 0) return;
    if (!zipFileName.trim()) {
      showToast('Por favor, ingresa un nombre para el archivo', 'error');
      return;
    }
    
    const finalName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`;
    
    await performDownload(false, '/api/download_zip', { ids: zipCart }, finalName, true);
    setZipCart([]);
    setIsZipModalOpen(false);
    setZipFileName('');
  };

  const handleBulkDownload = async () => {
    if (selectedFileIds.length === 0) return;
    
    let singleFile = selectedFileIds.length === 1 ? displayedFiles.find(f => f.id === selectedFileIds[0]) : null;
    if (singleFile && singleFile.type !== 'folder') {
      return handleDownload(singleFile);
    }

    let defaultName = 'descarga_masiva.zip';
    if (singleFile && singleFile.type === 'folder') {
      defaultName = `${singleFile.name}.zip`;
    }

    setProcessingAction('Preparando ZIP...');
    try {
      await performDownload(false, '/api/download_zip', { ids: selectedFileIds }, defaultName);
    } finally {
      setProcessingAction(null);
    }
  };

  // ── Move ──
  const handleMove = async (destFolderId) => {
    setProcessingAction('Moviendo elementos...');
    try {
      for (const id of selectedFileIds) {
        const f = displayedFiles.find(x => x.id === id);
        await moveFile(id, destFolderId, f ? f.type : 'file', true);
      }
      showToast('Elementos movidos', 'success');
      setSelectedFileIds([]);
      setIsMoveModalOpen(false);
      fetchCurrentFolder();
    } catch {
      showToast('Error al mover elementos', 'error');
    } finally {
      setProcessingAction(null);
    }
  };


  // ── Computed states for Selection ──
  const selectedTypes = selectedFileIds.map(id => {
    const f = displayedFiles.find(df => df.id === id);
    return f ? f.type : null;
  });
  const isOnlyFolders = selectedFileIds.length > 0 && selectedTypes.every(t => t === 'folder');
  const isOnlyFiles = selectedFileIds.length > 0 && selectedTypes.every(t => t !== 'folder');

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section id="view-gestor" className="tab-view gestor-view active" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', position: 'relative', padding: 0, gap: '16px', background: 'transparent' }}>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileChange} />

      {/* ── SIDEBAR ── */}
      <aside className="gestor-panel" style={{ background: '#161616', borderRadius: '32px', border: 'none', padding: '24px' }}>
        <div className="gestor-panel-inner">

          {/* Nuevo button */}
          {perms.write && (
          <div className="gestor-btn-nuevo-container" ref={dropdownRef}>
            <button className="gestor-btn-nuevo" onClick={() => setIsNuevoOpen(!isNuevoOpen)}>
              <Icon icon="solar:add-circle-bold-duotone" size={18} />
              <span>Nuevo</span>
            </button>
            <div className="gestor-nuevo-dropdown" style={{ display: isNuevoOpen ? 'flex' : 'none' }}>
              <button className="gestor-dropdown-item" onClick={handleFileUploadClick}>
                <Icon icon="solar:upload-bold-duotone" size={18} /><span>Subir archivo</span>
              </button>
              <button className="gestor-dropdown-item" onClick={handleCreateFolderInline}>
                <Icon icon="solar:add-folder-bold-duotone" size={18} /><span>Nueva carpeta</span>
              </button>
            </div>
          </div>
          )}


          {/* Nav */}
          <div className="gestor-nav-title">Mi unidad</div>
          <nav className="gestor-navigation-menu">
            {[
              { key: 'mis-archivos', icon: 'solar:folder-bold-duotone',               label: 'Mis Archivos' },
              { key: 'compartidos',  icon: 'solar:share-bold-duotone',                label: 'Compartidos' },
              { key: 'destacados',   icon: 'solar:star-bold-duotone',                 label: 'Destacados' },
              { key: 'papelera',     icon: 'solar:trash-bin-minimalistic-bold-duotone', label: 'Papelera', badge: trashCount },
            ].map(({ key, icon, label, badge }) => (
              <button
                key={key}
                className={`gestor-nav-item ${activeTab === key ? 'active' : ''}`}
                onClick={() => { setActiveTab(key); setCurrentFolderId(''); setSelectedFileIds([]); setSearchInput(''); setSearchQuery(''); }}
              >
                <Icon icon={icon} size={16} color={key === 'papelera' ? '#ef4444' : 'currentColor'} />
                <span style={{ fontSize: '11px', color: key === 'papelera' ? '#ef4444' : 'inherit' }}>{label}</span>
                {badge > 0 && (
                  <span className="gestor-trash-count" style={{
                    marginLeft: 'auto',
                    background: key === 'papelera' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: key === 'papelera' ? '#ef4444' : '#fff',
                    border: key === 'papelera' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px'
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Pinned Folders */}
          <div className="gestor-nav-title" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px' }}>
            <span>Carpetas Ancladas</span>
            <button title="Organizar A-Z" onClick={sortPinsAZ} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Icon icon="solar:sort-by-alphabet-bold-duotone" size={18} />
            </button>
          </div>
          <nav className="gestor-navigation-menu">
            {pinnedFolders.length === 0 ? (
              <div style={{ padding: '0 16px', fontSize: '11px', color: 'var(--text-muted)' }}>No hay carpetas ancladas</div>
            ) : pinnedFolders.map(pin => (
              <button 
                key={pin.id} 
                className={`gestor-nav-item pin-item ${currentFolderId === pin.id ? 'active' : ''}`} 
                onClick={() => { setCurrentFolderId(pin.id); setActiveTab('mis-archivos'); setSearchInput(''); setSearchQuery(''); }}
                draggable
                onDragStart={(e) => handlePinDragStart(e, pin.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handlePinDrop(e, pin.id)}
              >
                <Icon icon="solar:folder-bold-duotone" size={16} color="var(--color-primary)" />
                <span style={{ flex: 1, fontSize: '11px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.name}</span>
                <Icon icon="solar:reorder-bold-duotone" size={12} className="pin-action-icon" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </nav>
        </div>

        {/* Abrir en Windows Button */}
        <div style={{ marginTop: 'auto', padding: '0' }}>
          <button 
            onClick={async () => {
              try {
                await fetch('/api/system/open-folder', { method: 'POST' });
              } catch (_err) {
                console.error('Error opening folder:', err);
              }
            }}
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '30px',
              color: 'var(--color-primary)',
              fontSize: '13px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(96,165,250,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(96,165,250,0.1)'}
          >
            <Icon icon="solar:folder-open-bold-duotone" size={18} />
            Abrir Carpeta Local
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="gestor-main" style={{ background: '#161616', borderRadius: '32px', border: 'none', padding: '24px', overflow: 'hidden', flex: 1, minHeight: 0, position: 'relative' }}>

        {/* Topbar & Breadcrumbs */}
        <header className="gestor-topbar" style={{ gap: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <div className="gestor-breadcrumb" style={{ margin: 0, padding: '4px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
              <span
                className="breadcrumb-item"
                style={{ cursor: 'pointer', fontWeight: breadcrumbs.length === 0 ? 600 : 500, color: breadcrumbs.length === 0 ? 'var(--color-primary)' : '#aaa', background: 'transparent', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', display: 'inline-block' }}
                onMouseEnter={e => { 
                  if(breadcrumbs.length > 0) {
                    e.target.style.background = 'rgba(255,255,255,0.08)';
                    e.target.style.color = '#fff';
                  }
                }}
                onMouseLeave={e => { 
                  if(breadcrumbs.length > 0) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#aaa';
                    e.target.style.transform = 'scale(1)';
                  }
                }}
                onMouseDown={e => { if(breadcrumbs.length > 0) e.target.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { if(breadcrumbs.length > 0) e.target.style.transform = 'scale(1)'; }}
                onClick={() => { setCurrentFolderId(''); setSelectedFileIds([]); setSearchInput(''); setSearchQuery(''); }}
              >
                {activeTab === 'mis-archivos' ? 'Mi unidad' :
                 activeTab === 'compartidos'  ? 'Compartidos conmigo' :
                 activeTab === 'destacados'   ? 'Destacados' : 'Papelera'}
              </span>
              {breadcrumbs.map((bc, i) => {
                const isActive = i === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={bc.id}>
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px', userSelect: 'none', margin: '0 2px' }}>/</span>
                    <span
                      className="breadcrumb-item"
                      style={{ cursor: isActive ? 'default' : 'pointer', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-primary)' : '#aaa', background: 'transparent', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', display: 'inline-block' }}
                      onMouseEnter={e => { 
                        if(!isActive) {
                          e.target.style.background = 'rgba(255,255,255,0.08)';
                          e.target.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={e => { 
                        if(!isActive) {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#aaa';
                          e.target.style.transform = 'scale(1)';
                        }
                      }}
                      onMouseDown={e => { if(!isActive) e.target.style.transform = 'scale(0.95)'; }}
                      onMouseUp={e => { if(!isActive) e.target.style.transform = 'scale(1)'; }}
                      onClick={() => { if(!isActive) { setCurrentFolderId(bc.id); setSearchInput(''); setSearchQuery(''); } }}
                    >
                      {bc.name}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div style={{ flex: '0 1 400px', display: 'flex', justifyContent: 'center' }}>
            <UniversalSearch
              value={searchInput}
              onChange={handleSearchChange}
              onClear={() => { setSearchInput(''); setSearchQuery(''); }}
              placeholder="Buscar archivos... (Ctrl+F)"
              inputRef={searchInputRef}
              style={{ width: '100%' }}
            />
          </div>

          <div className="gestor-topbar-actions" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            
            {activeTab === 'papelera' && perms.write && trashFiles && trashFiles.length > 0 && (
              <button 
                onClick={handleEmptyTrash}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 14px', borderRadius: '30px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={18} />
                Vaciar papelera
              </button>
            )}

            <div className="gestor-view-toggles" style={{ padding: '4px', display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.02)', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                className={`gestor-action-btn`} 
                title="Vista de lista" 
                onClick={() => setViewMode('list')}
                style={{ width: '28px', height: '28px', padding: 0, justifyContent: 'center', border: 'none', borderRadius: '50%', background: viewMode === 'list' ? 'rgba(255,255,255,0.12)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                <Icon icon="solar:list-bold-duotone" size={15} color={viewMode === 'list' ? '#fff' : 'var(--text-muted)'} />
              </button>
              <button 
                className={`gestor-action-btn`} 
                title="Vista de cuadrícula" 
                onClick={() => setViewMode('grid')}
                style={{ width: '28px', height: '28px', padding: 0, justifyContent: 'center', border: 'none', borderRadius: '50%', background: viewMode === 'grid' ? 'rgba(255,255,255,0.12)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                <Icon icon="solar:widget-3-bold-duotone" size={15} color={viewMode === 'grid' ? '#fff' : 'var(--text-muted)'} />
              </button>
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', margin: 'auto 4px' }}></div>
              <button 
                className={`gestor-action-btn`} 
                title="Detalles" 
                onClick={() => setIsInfoPanelOpen(p => !p)}
                style={{ width: '28px', height: '28px', padding: 0, justifyContent: 'center', border: 'none', borderRadius: '50%', background: isInfoPanelOpen ? 'rgba(255,255,255,0.12)' : 'transparent', color: isInfoPanelOpen ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                <Icon icon="solar:info-circle-bold-duotone" size={15} color={isInfoPanelOpen ? '#fff' : 'var(--text-muted)'} />
              </button>
            </div>
          </div>
        </header>

        {/* Content layout */}
        <div className={`gestor-content-layout ${isInfoPanelOpen ? 'has-details' : ''}`} style={{ position: 'relative' }}>
          {dragOverlay && (
            <div className="drag-upload-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '2px dashed var(--color-primary)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
              <div style={{ background: 'var(--bg-card)', padding: '20px 40px', borderRadius: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Icon icon="solar:cloud-upload-bold-duotone" size={48} />
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Suelta los archivos aquí</h2>
              </div>
            </div>
          )}

          <div
            className={`gestor-files-area ${isSearchAnimating ? 'search-animating' : ''}`}
            onDrop={handleContainerDrop}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
          >
            {/* List header (only in list mode) */}
            {viewMode === 'list' && (
              <div className="gestor-list-header" style={{ display: 'flex' }}>
                {(() => {
                  const renderSortHeader = (key, label, className) => {
                    const isActive = sortBy === key;
                    return (
                      <div 
                        className={`glh-col ${className} sortable-header ${isActive ? 'active' : ''}`} 
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none', transition: 'color 0.2s' }} 
                        onClick={() => {
                          if (isActive) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                          else { setSortBy(key); setSortOrder('asc'); }
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-muted)'}
                      >
                        <span style={{ color: isActive ? 'var(--text-primary)' : 'inherit' }}>{label}</span>
                        {isActive && sortOrder === 'desc' ? <Icon icon="solar:alt-arrow-down-bold-duotone" size={11} /> : <Icon icon="solar:alt-arrow-up-bold-duotone" size={11} />}
                      </div>
                    );
                  };
                  return (
                    <>
                      {renderSortHeader('name', 'NOMBRE', 'glh-name')}
                      {renderSortHeader('size', 'TAMAÑO', 'glh-size')}
                      {renderSortHeader('date', 'MODIFICADO', 'glh-date')}
                      <div className="glh-col glh-meta"></div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className={`gestor-files-container ${viewMode}-view`}>
              {/* Inline folder creation */}
              {isCreatingInline && (
                <div style={{ animation: 'fileSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards', padding: viewMode === 'list' ? '12px 16px' : '16px', display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', alignItems: 'center', justifyContent: viewMode === 'grid' ? 'center' : 'flex-start', gap: '16px', background: 'rgba(96,165,250,0.03)', border: '1px dashed rgba(96,165,250,0.5)', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', width: '28px', height: '24px', borderRadius: '30px' }}>
                    <Icon icon="solar:add-folder-bold-duotone" size={14} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: viewMode === 'grid' ? 'wrap' : 'nowrap', justifyContent: viewMode === 'grid' ? 'center' : 'flex-start' }}>
                    <input
                      ref={newFolderRef}
                      autoFocus
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitCreateFolder(); if (e.key === 'Escape') { setIsCreatingInline(false); setNewFolderName(''); } }}
                      placeholder="Nombre de la carpeta"
                      style={{ background: '#1a1a1a', color: 'white', border: '1px solid rgba(96,165,250,0.6)', padding: '8px 12px', borderRadius: '30px', outline: 'none', fontSize: '13px', width: newFolderName.length > 0 ? `${Math.max(18, newFolderName.length)}ch` : '180px', transition: 'width 0.2s ease', textAlign: viewMode === 'grid' ? 'center' : 'left' }}
                    />
                    <button onClick={(e) => { e.stopPropagation(); commitCreateFolder(); }} style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Crear</button>
                    <button onClick={(e) => { e.stopPropagation(); setIsCreatingInline(false); setNewFolderName(''); }} style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                  <Icon icon="solar:refresh-bold-duotone" size={32} />
                  <div style={{ fontSize: '15px' }}>Cargando archivos...</div>
                </div>
              ) : _searchLoading ? (
                <div className="dash-empty-state" style={{ gridColumn: '1 / -1', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', animation: 'fadeIn 0.3s ease-in-out' }}>
                  <div className="dash-empty-icon" style={{ background: 'transparent', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)' }}></div>
                  </div>
                  <p className="dash-empty-title" style={{ color: 'white', fontWeight: '600', fontSize: '18px', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
                    Buscando...
                  </p>
                  <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '24px' }}>
                    Explorando el sistema de archivos para "{searchQuery}"
                  </p>
                </div>
              ) : displayedFiles.length === 0 && !isCreatingInline ? (
                <div className="dash-empty-state" style={{ gridColumn: '1 / -1', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
                  <div className="dash-empty-icon" style={{ background: 'transparent', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    {activeTab === 'compartidos' ? <Icon icon="solar:users-group-two-rounded-bold-duotone" size={48} /> :
                     activeTab === 'destacados'  ? <Icon icon="solar:star-bold-duotone" size={48} /> :
                     activeTab === 'papelera'    ? <Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={48} /> :
                     <Icon icon="solar:folder-open-bold-duotone" size={48} />}
                  </div>
                  <p className="dash-empty-title" style={{ color: 'white', fontWeight: '600', fontSize: '18px', margin: '0 0 8px 0' }}>
                    {activeTab === 'mis-archivos' ? (searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay archivos en esta ubicación') : `No hay elementos en ${activeTab}`}
                  </p>
                  <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '24px' }}>
                    {activeTab === 'mis-archivos' ? 'Sube archivos o crea carpetas para empezar a organizar tu contenido.' : ''}
                  </p>
                  {activeTab === 'mis-archivos' && !searchQuery && (
                    <button className="btn-primary" onClick={handleFileUploadClick} style={{ padding: '12px 24px', borderRadius: '20px', background: 'var(--color-primary)', color: '#111111', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <Icon icon="solar:cloud-upload-bold-duotone" size={18} /> Subir archivos
                    </button>
                  )}
                </div>
              ) : (
                displayedFiles.map(file => {
                  const isSelected = selectedFileIds.includes(file.id);
                  const isRenaming = renamingFileId === file.id;
                  const iconInfo   = file.type === 'folder' ? { icon: 'solar:folder-bold-duotone', color: '#FFC107', bg: 'rgba(96,165,250,0.15)' } : getFileIconInfo(file.name);
                  const category   = getCategory(file.name);

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={file.id}
                        className={`file-item ${isSelected ? 'selected' : ''} ${dragOverFolderId === file.id ? 'drag-over-folder' : ''}`}
                        onClick={e => handleSelectFile(file, e)}
                        onDoubleClick={() => handleOpenFile(file)}
                        onContextMenu={e => e.preventDefault()}
                        draggable
                        onDragStart={e => { if (!isSelected) setSelectedFileIds([file.id]); e.dataTransfer.setData('text/plain', file.id); }}
                        onDragOver={e => {
                          if (file.type === 'folder' && !selectedFileIds.includes(file.id)) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverFolderId !== file.id) setDragOverFolderId(file.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (file.type === 'folder' && dragOverFolderId === file.id) {
                            setDragOverFolderId(null);
                          }
                        }}
                        onDrop={async e => {
                          if (!perms.move) {
                            e.preventDefault();
                            showToast('No tienes permisos para mover archivos', 'error');
                            setDragOverFolderId(null);
                            return;
                          }
                          if (file.type === 'folder' && !selectedFileIds.includes(file.id)) {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(null);
                            await handleMove(file.id);
                          }
                        }}
                        style={{ padding: '16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent', transition: 'background 0.15s' }}
                      >
                        <div className="glh-col glh-name" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon icon={iconInfo.icon} size={18} style={{color: iconInfo.color}} />
                          </div>
                          <div className="name-col-content" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            {isRenaming ? (
                              <div style={{ padding: '0', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                <input
                                  autoFocus
                                  value={inlineRenameValue}
                                  onChange={e => setInlineRenameValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') commitRename();
                                    if (e.key === 'Escape') setRenamingFileId(null);
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  style={{ background: '#111', color: 'white', border: '1px solid var(--color-primary)', padding: '4px 8px', borderRadius: '30px', width: `${Math.max(inlineRenameValue.length + 2, 8)}ch`, maxWidth: '100%', outline: 'none', fontSize: '13px', transition: 'width 0.1s' }}
                                />
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button onClick={(e) => { e.stopPropagation(); commitRename(); }} style={{ width: '28px', height: '28px', background: 'var(--color-primary)', color: '#111111', border: 'none', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="mdi:check-bold" size={18} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setRenamingFileId(null); }} style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #333', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="mdi:close" size={18} /></button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                  <span className="file-name-text">
                                    {renderHighlightedName(file, searchQuery)}
                                    {file.isStarred && <Icon icon="solar:star-bold-duotone" size={10} />}
                                    {filesWithNotes.includes(file.id) && <Icon icon="solar:paperclip-bold-duotone" size={12} title="Tiene actas o notas vinculadas" />}
                                  </span>
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>
                                    {searchQuery && file.parentId ? (
                                      (() => {
                                        const parts = file.parentId.split('/').filter(Boolean);
                                        return parts.length > 2 ? parts.slice(-2).join('/') : file.parentId;
                                      })()
                                    ) : (
                                      file.type === 'folder' ? 'Carpeta de archivos' : category === 'image' ? 'Imagen' : category === 'video' ? 'Video' : category === 'audio' ? 'Audio' : 'Archivo'
                                    )}
                                  </span>
                                  {file.tags && file.tags.length > 0 && !isRenaming && (
                                    <>
                                      <span>•</span>
                                      <span style={{ display: 'flex', gap: '4px' }}>
                                        {(file.tags || []).slice(0, 3).map((tag, i) => (
                                          <span key={i} style={{ background: tag.color, color: 'white', padding: '1px 6px', borderRadius: '20px', fontSize: '9px', fontWeight: 600, whiteSpace: 'nowrap' }}>{tag.label}</span>
                                        ))}
                                        {(file.tags || []).length > 3 && <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+{file.tags.length - 3}</span>}
                                      </span>
                                    </>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Size */}
                        <div className="glh-col glh-size" style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'none', letterSpacing: 'normal', fontWeight: 500 }}>{formatSize(file.size)}</div>
                        <div className="glh-col glh-date" style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'none', letterSpacing: 'normal', fontWeight: 500 }}>{formatDate(file.date)}</div>
                        <div className="glh-col glh-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); toggleStar(file.id); }}
                            title={file.isStarred ? 'Quitar de destacados' : 'Destacar'}
                            style={{ background: 'transparent', border: 'none', color: file.isStarred ? '#60a5fa' : 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '30px', opacity: 0, transition: '0.2s' }}
                            className="file-action-btn"
                          ><Icon icon={file.isStarred ? 'solar:star-bold-duotone' : 'solar:star-line-duotone'} size={14} style={{color: file.isStarred ? '#60a5fa' : 'currentColor'}} /></button>
                        </div>
                      </div>
                    );
                  } else {
                    // Grid view
                    return (
                      <div
                        key={file.id}
                        className={`file-item grid-item ${isSelected ? 'selected' : ''} ${dragOverFolderId === file.id ? 'drag-over-folder' : ''}`}
                        onClick={e => handleSelectFile(file, e)}
                        onDoubleClick={() => handleOpenFile(file)}
                        onContextMenu={e => e.preventDefault()}
                        draggable
                        onDragStart={e => { if (!isSelected) setSelectedFileIds([file.id]); e.dataTransfer.setData('text/plain', file.id); }}
                        onDragOver={e => {
                          if (file.type === 'folder' && !selectedFileIds.includes(file.id)) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverFolderId !== file.id) setDragOverFolderId(file.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (file.type === 'folder' && dragOverFolderId === file.id) {
                            setDragOverFolderId(null);
                          }
                        }}
                        onDrop={async e => {
                          if (!perms.move) {
                            e.preventDefault();
                            showToast('No tienes permisos para mover archivos', 'error');
                            setDragOverFolderId(null);
                            return;
                          }
                          if (file.type === 'folder' && !selectedFileIds.includes(file.id)) {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverFolderId(null);
                            await handleMove(file.id);
                          }
                        }}
                        style={{ borderRadius: '24px', overflow: 'hidden', background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)', border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-light)'}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: '0.15s', height: '100%', gap: 0 }}
                      >
                        <div className="grid-card-preview" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70px', minHeight: '70px', maxHeight: '70px', overflow: 'hidden', background: category === 'image' ? 'var(--bg-card)' : iconInfo.bg }}>
                          <div className="grid-card-header" style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                            <button onClick={e => { e.stopPropagation(); toggleStar(file.id); }} style={{ background: 'transparent', border: 'none', color: file.isStarred ? '#60a5fa' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                              <Icon icon={file.isStarred ? 'solar:star-bold-duotone' : 'solar:star-line-duotone'} size={11} style={{color: file.isStarred ? '#60a5fa' : 'white'}} />
                            </button>
                          </div>
                          {file.type !== 'folder' && ['image', 'pdf', 'word'].includes(category) ? (
                            <>
                              <img 
                                src={`/api/thumbnail/${file.id.split('/').map(encodeURIComponent).join('/')}`} 
                                alt={file.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                              />
                              <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon icon={iconInfo.icon} size={48} style={{color: iconInfo.color}} />
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon icon={iconInfo.icon} size={48} style={{color: iconInfo.color}} />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'var(--bg-card)', height: '70px', minHeight: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          {isRenaming ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <input
                                autoFocus
                                value={inlineRenameValue}
                                onChange={e => setInlineRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitRename();
                                  if (e.key === 'Escape') setRenamingFileId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="inline-rename-input"
                                style={{ background: '#111', color: 'white', border: '1px solid var(--color-primary)', padding: '6px 10px', borderRadius: '30px', width: '100%', outline: 'none' }}
                              />
                              <button onClick={(e) => { e.stopPropagation(); commitRename(); }} style={{ background: 'var(--color-primary)', color: '#111111', border: 'none', width: '32px', height: '32px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon icon="mdi:check-bold" size={18} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setRenamingFileId(null); }} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #333', width: '32px', height: '32px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon icon="mdi:close" size={18} /></button>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                              {renderHighlightedName(file, searchQuery)}
                              {filesWithNotes.includes(file.id) && <Icon icon="solar:paperclip-bold-duotone" size={12} title="Tiene actas o notas vinculadas" />}
                            </div>
                          )}
                          {/* File Tags in Grid */}
                          {file.tags && file.tags.length > 0 && !isRenaming && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px', height: '14px', overflow: 'hidden' }}>
                              {file.tags.map((tag, i) => (
                                <span key={i} style={{ background: tag.color, color: 'white', padding: '1px 6px', borderRadius: '20px', fontSize: '9px', fontWeight: 600 }}>{tag.label}</span>
                              ))}
                            </div>
                          )}
                          {!isRenaming && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.type === 'folder' ? 'Carpeta' : `${category === 'image' ? 'Imagen' : category === 'excel' ? 'Hoja de Cálculo' : category === 'word' ? 'Documento Word' : 'Archivo'}`}</span>
                              {file.type !== 'folder' && <span style={{ flexShrink: 0, marginLeft: '8px' }}>{formatSize(file.size)}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </div>
          
          {/* Details Pane and Tag Manager (Right Panel) */}
          <div className={`gestor-details-panel ${isInfoPanelOpen ? 'open' : ''}`}>
            {(() => {
              if (selectedFileIds.length > 1) {
                return (
                  <div className="details-panel-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', gap: '16px', padding: '20px', textAlign: 'center' }}>
                    <Icon icon="solar:layers-bold-duotone" size={48} />
                    <span>{selectedFileIds.length} elementos seleccionados</span>
                  </div>
                );
              }

              let file = null;
              if (selectedFileIds.length === 1) {
                file = displayedFiles.find(f => f.id === selectedFileIds[0]);
              } else if (currentFolderId) {
                file = files.find(f => f.id === currentFolderId);
              }
              
              if (!file && !currentFolderId) {
                return (
                  <div className="details-panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="details-header">
                      <h3>Mi unidad</h3>
                      <button className="details-close-btn" onClick={() => setIsInfoPanelOpen(false)}><Icon icon="mdi:close" size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#aaa', padding: '20px', textAlign: 'center' }}>
                      <Icon icon="solar:cloud-bold-duotone" size={64} />
                      <span>Estás en la raíz de tu unidad</span>
                    </div>
                  </div>
                );
              }

              if (!file) return null;
              const iconInfo = file.type === 'folder' ? { icon: 'solar:folder-bold-duotone', color: '#FFC107', bg: 'rgba(251, 191, 36, 0.1)' } : getFileIconInfo(file.name);
              const category = getCategory(file.name);

              return (
                <div className="details-panel-content">
                  <div className="details-header">
                    <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                      {selectedFileIds.length === 0 ? 'Detalles de la carpeta' : 'Detalles del elemento'}
                    </h3>
                    <button className="details-close-btn" onClick={() => setIsInfoPanelOpen(false)}><Icon icon="mdi:close" size={18} /></button>
                  </div>
                  
                  <div className="details-preview-box" style={{ background: iconInfo.bg || 'rgba(255,255,255,0.05)' }}>
                    {file.type !== 'folder' && ['image', 'pdf', 'word'].includes(category) ? (
                      <img 
                        src={`/api/thumbnail/${file.id.split('/').map(encodeURIComponent).join('/')}`} 
                        alt={file.name} 
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '30px' }} 
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div style={{ display: (file.type !== 'folder' && ['image', 'pdf', 'word'].includes(category)) ? 'none' : 'flex', width: '100%', height: '140px', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon icon={iconInfo.icon} size={64} style={{color: iconInfo.color}} />
                    </div>
                  </div>

                  <h4 className="details-title">{file.name}</h4>
                  
                  <div className="details-meta-list">
                    <div className="meta-row"><span>Tipo</span> <strong>{file.type === 'folder' ? 'Carpeta' : category.toUpperCase()}</strong></div>
                    <div className="meta-row"><span>Tamaño</span> <strong>{formatSize(file.size)}</strong></div>
                    <div className="meta-row"><span>Fecha</span> <strong>{formatDate(file.date)}</strong></div>
                  </div>

                  <hr className="details-divider" />
                  
                  <div className="details-tags-section">
                    <h4>Etiquetas</h4>
                    <div className="tags-container">
                      {(file.tags || []).map((tag, idx) => (
                        <span key={idx} className="tag-pill" style={{ background: tag.color }}>
                          {tag.label}
                          <button onClick={() => {
                            const newTags = file.tags.filter((_, i) => i !== idx);
                            handleSaveTags(file.id, newTags);
                          }}><Icon icon="mdi:close" size={18} /></button>
                        </span>
                      ))}
                      {(file.tags || []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin etiquetas</span>}
                    </div>
                    
                    <div className="tag-creator" style={{ marginTop: '16px' }}>
                      <input 
                        type="text" 
                        id="details-new-tag-input"
                        placeholder="Añadir etiqueta..." 
                        className="drive-input" 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = e.target.value.trim();
                            if (val) {
                              const newTags = [...(file.tags || []), { label: val, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)].value }];
                              handleSaveTags(file.id, newTags);
                              e.target.value = '';
                              showToast('Etiqueta añadida', 'success');
                            }
                          }
                        }}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginBottom: '8px', outline: 'none' }}
                      />
                      <div className="color-picker" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {TAG_COLORS.map(c => (
                          <div key={c.value} title={c.name} style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.value, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.2)', transition: 'transform 0.1s' }} onMouseEnter={e => e.target.style.transform = 'scale(1.1)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'} onClick={() => {
                            const input = document.getElementById('details-new-tag-input');
                            const val = input.value.trim();
                            if (val) {
                              const newTags = [...(file.tags || []), { label: val, color: c.value }];
                              handleSaveTags(file.id, newTags);
                              input.value = '';
                              showToast('Etiqueta añadida', 'success');
                            } else {
                              input.focus();
                              showToast('Escribe un nombre de etiqueta primero', 'error');
                            }
                          }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      {/* Global Processing Overlay */}
      {processingAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '300px' }}>
            <div style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pdf-spin 1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite', marginBottom: '20px' }}></div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600 }}>{processingAction}</h3>
          </div>
        </div>
      )}

      {/* Floating Download Manager */}
      {downloadQueue.length > 0 && (
        <div className="upload-manager-floating" style={{
          position: 'fixed', bottom: uploadQueue.length > 0 ? '300px' : '24px', right: '24px', width: '360px', background: '#1e1e1e', 
          borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 999999, border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDownloadManagerExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Descargando {downloadQueue.length} elemento{downloadQueue.length > 1 ? 's' : ''}</h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={() => setIsDownloadManagerExpanded(!isDownloadManagerExpanded)} title={isDownloadManagerExpanded ? "Minimizar" : "Expandir"}>
                {isDownloadManagerExpanded ? <Icon icon="solar:alt-arrow-down-bold-duotone" size={16} /> : <Icon icon="solar:alt-arrow-up-bold-duotone" size={16} />}
              </button>
              <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={clearDownloadQueue} title="Limpiar y cerrar">
                <Icon icon="mdi:close" size={16} />
              </button>
            </div>
          </div>
          {isDownloadManagerExpanded && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {downloadQueue.map(item => (
                <div 
                  key={item.id} 
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Icon icon="solar:document-bold-duotone" size={20} color="var(--color-primary)" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px', color: item.status === 'error' ? '#ef4444' : '#fff' }}>
                      {item.name} <span style={{ color: '#aaa', fontStyle: 'italic' }}>{item.status === 'compressing' ? '(Comprimiendo...)' : ''}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.progress}%`, height: '100%', background: item.status === 'error' ? '#ef4444' : item.status === 'success' ? '#22c55e' : item.status === 'compressing' ? '#60a5fa' : 'var(--color-primary)', transition: 'width 0.2s, background 0.2s' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                    {item.status === 'compressing' && <div style={{ animation: 'pulse 1.5s infinite' }}><Icon icon="solar:archive-bold-duotone" size={16} color="#60a5fa" /></div>}
                    {item.status === 'downloading' && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pdf-spin 1s linear infinite' }}></div>}
                    {item.status === 'success' && <Icon icon="solar:check-circle-bold-duotone" size={16} color="#22c55e" />}
                    {item.status === 'error' && <Icon icon="solar:close-circle-bold-duotone" size={16} color="#ef4444" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Floating Upload Manager */}
      {uploadQueue.length > 0 && (
        <div className="upload-manager-floating" style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '360px', background: '#1e1e1e', 
          borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 999999, border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isUploadManagerExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Subiendo {uploadQueue.length} elemento{uploadQueue.length > 1 ? 's' : ''}</h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={() => setIsUploadManagerExpanded(!isUploadManagerExpanded)} title={isUploadManagerExpanded ? "Minimizar" : "Expandir"}>
                {isUploadManagerExpanded ? <Icon icon="solar:alt-arrow-down-bold-duotone" size={16} /> : <Icon icon="solar:alt-arrow-up-bold-duotone" size={16} />}
              </button>
              <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={clearUploadQueue} title="Limpiar y cerrar">
                <Icon icon="mdi:close" size={16} />
              </button>
            </div>
          </div>
          {isUploadManagerExpanded && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {uploadQueue.map(item => (
                <div 
                  key={item.id} 
                  onMouseEnter={() => setHoveredUploadId(item.id)}
                  onMouseLeave={() => setHoveredUploadId(null)}
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <GetFileIcon name={item.name} size={20} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px', color: item.status === 'error' ? '#ef4444' : '#fff' }}>
                      {item.name}
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.progress}%`, height: '100%', background: item.status === 'error' ? '#ef4444' : item.status === 'success' ? '#22c55e' : 'var(--color-primary)', transition: 'width 0.2s' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                    {item.status === 'uploading' && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'pdf-spin 1s linear infinite' }}></div>}
                    {item.status === 'success' && (
                      hoveredUploadId === item.id ? (
                        <Icon icon="solar:folder-open-bold-duotone" size={16} color="#aaa" style={{cursor:'pointer'}} onClick={() => {
                          setCurrentFolderId(item.folderId || '');
                          setSearchQuery('');
                          setSearchInput('');
                          if (item.fileId) {
                            setSelectedFileIds([item.fileId]);
                          }
                        }} title="Ir a la ubicación del archivo" />
                      ) : (
                        <Icon icon="solar:check-circle-bold-duotone" size={16} />
                      )
                    )}
                    {item.status === 'error' && (
                      <div title={item.errorMsg} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon icon="solar:close-circle-bold-duotone" size={16} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && selectedFile && (
        <UniversalViewer 
          file={selectedFile} 
          onClose={handleAttemptClosePreview} 
          onRename={(newName) => renameFile(selectedFile.id, newName, selectedFile.type)}
          onToggleStar={() => toggleStar(selectedFile.id)}
          isStarred={selectedFile.isStarred}
          onGoToFolder={() => {
            handleAttemptClosePreview();
            const parts = selectedFile.id.split('/');
            parts.pop();
            setCurrentFolderId(parts.join('/'));
            setSearchQuery('');
            setSearchInput('');
            setSelectedFileIds([selectedFile.id]);
          }}
        />
      )}

      {/* Floating Action Bar */}
      {selectedFileIds.length > 0 && (
        <div style={{ position: 'absolute', bottom: '30px', left: 'calc(50% + 118px)', transform: 'translateX(-50%)', background: '#1a1a1a', padding: '12px 24px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100, border: '1px solid #333' }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{selectedFileIds.length} seleccionados</span>
          
          {activeTab === 'compartidos' ? (
            <button className="fab-btn fab-btn-delete" title="Cancelar compartición" onClick={async () => {
              setConfirmModal({
                isOpen: true,
                type: 'danger',
                title: 'Cancelar compartición',
                message: '¿Estás seguro de que quieres dejar de compartir este(os) archivo(s)? El enlace dejará de funcionar inmediatamente.',
                onConfirm: async () => {
                  setConfirmModal({ isOpen: false });
                  setProcessingAction('Cancelando...');
                  try {
                    for (const id of selectedFileIds) {
                      const file = displayedFiles.find(f => f.id === id);
                      if (file && file.token) {
                        await fetch(`/api/share/${file.token}`, { method: 'DELETE' });
                      }
                    }
                    const res = await fetch('/api/share');
                    const data = await res.json();
                    if (Array.isArray(data)) {
                      setSharedFiles(data.map(s => ({
                        id: s.path, name: s.name, type: s.type || 'file', token: s.token, date: s.date || new Date().toISOString(), isShared: true, size: 0
                      })));
                    }
                  } catch (_err) {
                    showToast('Error al cancelar compartición', 'error');
                  } finally {
                    setProcessingAction(null);
                    setSelectedFileIds([]);
                  }
                }
              });
            }}><Icon icon="solar:link-broken-bold-duotone" size={18} /></button>
          ) : activeTab === 'papelera' ? (
            <>
              <button className="fab-btn" title="Restaurar" onClick={async () => {
                setProcessingAction('Restaurando...');
                try {
                  for (const id of selectedFileIds) {
                    await restoreFile(id);
                  }
                } finally {
                  setProcessingAction(null);
                  setSelectedFileIds([]);
                }
              }}><Icon icon="solar:history-bold-duotone" size={18} /></button>
              {perms.delete && (
              <button className="fab-btn fab-btn-delete" title="Eliminar permanentemente" onClick={() => handleDeleteSelected()}><Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={18} /></button>
              )}
            </>
          ) : (
            <>
              {selectedFileIds.length === 1 && (
                <>
                  {perms.rename && (
                  <button className="fab-btn" title="Renombrar" onClick={() => {
                    setRenamingFileId(selectedFileIds[0]);
                    const f = displayedFiles.find(f => f.id === selectedFileIds[0]);
                    if (f) setInlineRenameValue(f.type === 'folder' ? f.name : f.name.replace(/\.[^/.]+$/, ''));
                  }}><Icon icon="solar:pen-bold-duotone" size={18} /></button>
                  )}
                  <button className="fab-btn" title="Información" onClick={() => setIsInfoPanelOpen(true)}><Icon icon="solar:info-circle-bold-duotone" size={18} /></button>
                </>
              )}
              {isOnlyFiles && (
                <button className="fab-btn" title="Añadir a comprimido" onClick={() => handleAddToZipCart()}><Icon icon="solar:cart-plus-bold-duotone" size={18} /></button>
              )}
              
              {perms.move && (
              <button className="fab-btn" title="Mover a..." onClick={() => setIsMoveModalOpen(true)}><Icon icon="solar:folder-with-files-bold-duotone" size={18} /></button>
              )}
              
              {perms.tag && isOnlyFiles && (
                <button className="fab-btn" title="Destacar" onClick={async () => {
                  const firstFile = displayedFiles.find(f => f.id === selectedFileIds[0]);
                  if (firstFile) {
                    const isStarred = firstFile.isStarred;
                    for (const id of selectedFileIds) {
                      await toggleStar(id, isStarred);
                    }
                  }
                }}><Icon icon="solar:star-bold-duotone" size={18} /></button>
              )}

              {isOnlyFolders && selectedFileIds.length === 1 && (() => {
                const firstFile = displayedFiles.find(f => f.id === selectedFileIds[0]);
                const isPinned = firstFile && pinnedFolders.some(p => p.id === firstFile.id);
                return (
                  <button className="fab-btn" title={isPinned ? 'Desanclar' : 'Anclar'} onClick={() => {
                    if (firstFile) handleTogglePin(firstFile);
                  }} style={isPinned ? { background: '#60a5fa', color: '#fff', border: 'none' } : {}}>
                    <Icon icon="solar:pin-bold-duotone" size={18} />
                  </button>
                );
              })()}
              
              {perms.print && (
                <button className="fab-btn" title="Descargar" onClick={handleBulkDownload}><Icon icon="solar:download-bold-duotone" size={18} /></button>
              )}
              {perms.delete && (
              <button className="fab-btn fab-btn-delete" title="Mover a papelera" onClick={() => handleDeleteSelected()}><Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={18} /></button>
              )}
            </>
          )}
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }}></div>
          <button className="fab-btn fab-close-no-hover" title="Cerrar selección" onClick={() => setSelectedFileIds([])}><Icon icon="mdi:close" size={18} /></button>
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirmModal.isOpen && (
        <div onClick={() => setConfirmModal({ isOpen: false })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999999, backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '30px', width: '400px', maxWidth: '90%', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: 0, color: confirmModal.type === 'danger' ? '#ef4444' : '#fff', fontSize: '18px', fontWeight: '600' }}>{confirmModal.title}</h3>
            <p style={{ margin: 0, color: '#aaa', fontSize: '14px', lineHeight: '1.6' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button onClick={() => setConfirmModal({ isOpen: false })} style={{ padding: '9px 18px', borderRadius: '20px', border: '1px solid #444', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>Cancelar</button>
              <button autoFocus onClick={confirmModal.onConfirm} style={{ padding: '9px 18px', borderRadius: '20px', border: 'none', background: confirmModal.type === 'danger' ? '#ef4444' : 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontWeight: '600', outlineOffset: '2px' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOVE MODAL ── */}
      {isMoveModalOpen && (
        <div onClick={() => setIsMoveModalOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100000, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', width: '460px', maxWidth: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#252525' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="solar:login-2-bold-duotone" size={18} style={{color:'#aaa'}} /> Mover a...
              </h3>
              <button onClick={() => setIsMoveModalOpen(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '16px' }} title="Cerrar">
                <Icon icon="mdi:close" size={18} />
              </button>
            </div>
            
            {isMoveCreatingFolder ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Icon icon="solar:add-folder-bold-duotone" size={24} />
                  <input
                    autoFocus
                    value={moveModalNewFolderName}
                    onChange={e => setMoveModalNewFolderName(e.target.value)}
                    placeholder="Nombre de la nueva carpeta"
                    className="drive-input"
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderBottom: '2px solid var(--color-primary)', background: 'transparent', color: 'white', outline: 'none', fontSize: '15px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setIsMoveCreatingFolder(false); setMoveModalNewFolderName(''); }} style={{ padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#ccc', cursor: 'pointer', fontWeight: 500, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Cancelar</button>
                  <button onClick={async () => {
                    if (!moveModalNewFolderName.trim()) return;
                    try {
                      await createFolder(moveModalNewFolderName.trim(), moveModalCurrentFolderId);
                      setIsMoveCreatingFolder(false);
                      setMoveModalNewFolderName('');
                      showToast('Carpeta creada', 'success');
                    } catch {
                      showToast('Error al crear carpeta', 'error');
                    }
                  }} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', background: 'var(--color-primary)', color: '#111111', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon icon="mdi:check-bold" size={18} /> Crear</button>
                </div>
              </div>
            ) : (
              <div style={{ height: '300px', overflowY: 'auto' }}>
                {moveModalCurrentFolderId && (
                  <div onClick={() => {
                    const currentFolder = files.find(f => f.id === moveModalCurrentFolderId);
                    if (currentFolder) setMoveModalCurrentFolderId(currentFolder.parentId || '');
                  }} style={{ padding: '12px 20px', cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <Icon icon="solar:arrow-left-bold-duotone" size={16} /> 
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Subir un nivel</span>
                  </div>
                )}
                {files.filter(f => f.type === 'folder' && (f.parentId || '') === moveModalCurrentFolderId && !selectedFileIds.includes(f.id)).map(folder => (
                  <div key={folder.id} onClick={() => setMoveModalCurrentFolderId(folder.id)} style={{ padding: '12px 20px', cursor: 'pointer', color: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.paddingLeft='24px'; }} onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.paddingLeft='20px'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon icon="solar:folder-bold-duotone" size={20} /> 
                      <span style={{ fontSize: '14px' }}>{folder.name}</span>
                    </div>
                    <Icon icon="solar:alt-arrow-right-bold-duotone" size={12} />
                  </div>
                ))}
                {files.filter(f => f.type === 'folder' && (f.parentId || '') === moveModalCurrentFolderId && !selectedFileIds.includes(f.id)).length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    <Icon icon="solar:folder-open-bold-duotone" size={32} />
                    <br />No hay carpetas aquí
                  </div>
                )}
              </div>
            )}
            
            {/* Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#252525' }}>
              <button onClick={() => { setIsMoveCreatingFolder(true); setMoveModalNewFolderName(''); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#3b82f6', border: 'none', padding: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#60a5fa'} onMouseLeave={e => e.currentTarget.style.color='#3b82f6'}>
                <Icon icon="solar:add-folder-bold-duotone" size={16} /> Crear carpeta
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsMoveModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Cancelar</button>
                <button autoFocus onClick={() => {
                  handleMoveFile(moveModalCurrentFolderId);
                  setIsMoveModalOpen(false);
                }} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', background: 'var(--color-primary)', color: '#111111', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', outlineOffset: '2px' }}><Icon icon="solar:square-bottom-down-bold-duotone" size={18} /> Mover Aquí</button>
              </div>
            </div>
          </div>
        </div>
      )}


        {/* Zip Cart Container */}
        {zipCart.length > 0 && (
          <div style={{ position: 'fixed', top: '80px', right: '30px', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            
            {/* Bubble */}
            <div style={{
              background: 'var(--color-primary)', 
              padding: '10px 16px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '12px', 
              cursor: 'pointer', color: '#111111',
              transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(96, 165, 250, 0.4)';}} onMouseLeave={e => {e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';}}
               onClick={() => setIsZipModalOpen(!isZipModalOpen)}>
              <Icon icon="solar:archive-bold-duotone" size={20} />
              <span style={{ fontWeight: '600', fontSize: '14px', letterSpacing: '0.2px' }}>{zipCart.length} en carrito ZIP</span>
              <button onClick={(e) => { e.stopPropagation(); setZipCart([]); setIsZipModalOpen(false); }} style={{ background: 'rgba(17,17,17,0.1)', border: 'none', color: '#111', cursor: 'pointer', marginLeft: '4px', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background='rgba(17,17,17,0.2)'}} onMouseLeave={e => {e.currentTarget.style.background='rgba(17,17,17,0.1)'}} title="Vaciar carrito">
                <Icon icon="mdi:close" size={16} />
              </button>
            </div>
  
            {/* Menu Dropdown */}
            {isZipModalOpen && (
              <div style={{
                background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', 
                width: '340px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <Icon icon="solar:archive-bold-duotone" size={18} color="var(--color-primary)" /> Archivos a comprimir
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{zipCart.length} item(s)</span>
                </div>
                
                {/* File List */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {zipCart.map(id => {
                    const f = files.find(x => x.id === id);
                    if (!f) return null;
                    const iconInfo = f.type === 'folder' ? { icon: 'solar:folder-bold-duotone', color: '#FFC107' } : getFileIconInfo(f.name);
                    return (
                      <div key={id} className="zip-cart-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                          <Icon icon={iconInfo.icon} size={22} style={{color: iconInfo.color}} />
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', fontWeight: '500' }}>{f.name}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{f.type === 'folder' ? 'Carpeta' : 'Archivo'}</span>
                          </div>
                        </div>
                        <button className="zip-cart-delete-btn" onClick={() => {
                          const newCart = zipCart.filter(x => x !== id);
                          setZipCart(newCart);
                          if (newCart.length === 0) setIsZipModalOpen(false);
                        }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color='#ef4444'}} title="Quitar">
                          <Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
  
                {/* Naming Input */}
                <input autoFocus type="text" value={zipFileName} onChange={e => setZipFileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCartDownload()} placeholder="Nombre del ZIP (ej: Reportes)" style={{ width: '100%', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'border 0.2s' }} onFocus={e=>e.target.style.borderColor='var(--color-primary)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                
                <button onClick={handleCartDownload} style={{ width: '100%', padding: '12px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, var(--color-primary), #60a5fa)', color: '#111111', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', transition: 'opacity 0.2s, transform 0.1s', boxShadow: '0 4px 12px rgba(96, 165, 250, 0.3)' }} onMouseEnter={e=>e.currentTarget.style.opacity=0.9} onMouseLeave={e=>e.currentTarget.style.opacity=1} onMouseDown={e=>e.currentTarget.style.transform='scale(0.98)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
                  <Icon icon="solar:download-bold-duotone" size={20} /> Descargar ZIP
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }
  
  export default GestorPage;
