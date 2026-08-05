/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';

const FileContext = createContext();

export const useFiles = () => useContext(FileContext);

export const FileProvider = ({ children }) => {
  const [files, setFiles] = useState([]); // Current folder contents
  const [trashFiles, setTrashFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [error, setError] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(() => {
    return sessionStorage.getItem('dashq_current_folder') || '';
  }); // path relative to root

  useEffect(() => {
    sessionStorage.setItem('dashq_current_folder', currentFolderId);
  }, [currentFolderId]);
  const [globalStats, setGlobalStats] = useState({ totalFiles: 0, totalSize: 0, recentFiles: [], allFiles: [] });

  // 1. Fetch current folder contents
  const fetchCurrentFolder = async (background = false) => {
    if (!background) setIsLoading(true);
    
    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/browse?path=${encodeURIComponent(currentFolderId)}`);
        if (res.ok) {
          const data = await res.json();
          // Map backend response to our standard format
          const mappedFolders = (data.folders || []).map(f => ({
            id: f.path, // folder path is its ID
            name: f.name,
            type: 'folder',
            size: 0,
            date: new Date().toISOString(), // Mock date as backend doesn't provide folder date
            category: 'folder',
            parentId: currentFolderId
          }));
          const mappedFiles = (data.files || []).map(f => ({
            id: f.relative_path, // relative path is its ID
            name: f.original_name,
            filename: f.filename, // raw backend filename
            type: 'application/pdf',
            size: f.size,
            date: f.date,
            category: 'document',
            parentId: currentFolderId,
            url: encodeURI(f.path)
          }));
          
          setFiles([...mappedFolders, ...mappedFiles]);
        } else {
          setFiles([]);
          setError(`Error del servidor al cargar la carpeta (Status: ${res.status})`);
        }
      } catch (e) {
        console.error('Error fetching folder contents:', e);
        setError('Fallo de conexión al cargar archivos.');
      }
    })();

    if (!background) {
      // Artificial minimum delay of 400ms to prevent visual flickering on fast networks
      const delayPromise = new Promise(resolve => setTimeout(resolve, 400));
      await Promise.all([fetchPromise, delayPromise]);
      setIsLoading(false);
    } else {
      await fetchPromise;
    }
  };

  // 2. Fetch global stats
  const fetchStats = async () => {
    try {
      // Storage info
      const stRes = await fetch('/api/storage-info');
      let tFiles = 0; let tSize = 0; let tFolders = 0; let tCategories = null; let tTopFolders = [];
      if (stRes.ok) {
        const stData = await stRes.json();
        tFiles = stData.total_files || 0;
        tSize = stData.total_size || 0;
        tFolders = stData.total_folders || 0;
        tCategories = stData.categories || null;
        tTopFolders = stData.top_folders || [];
      }
      
      // For recent files, we have to use /api/files which lists all files in root (flat list legacy)
      // Note: server.py /api/files only gets root files. That's a backend limitation but ok for dashboard.
      const fRes = await fetch('/api/files');
      let rFiles = [];
      let allFiles = [];
      if (fRes.ok) {
        const fData = await fRes.json();
        const mappedFiles = (fData.files || []).map(f => ({
          id: f.relative_path,
          name: f.original_name,
          size: f.size,
          date: f.upload_date,
          category: 'pdf'
        }));
        
        allFiles = mappedFiles;
        rFiles = mappedFiles.slice(0, 5);
      }

      setGlobalStats({ totalFiles: tFiles, totalSize: tSize, totalFolders: tFolders, categories: tCategories, recentFiles: rFiles, allFiles: allFiles, topFolders: tTopFolders });
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  const fetchTrashFiles = async () => {
    try {
      const res = await fetch('/api/trash');
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.items || []).map(f => ({
          id: f.filename,
          name: f.original_name,
          type: f.is_dir ? 'folder' : 'file',
          size: f.size,
          date: f.trash_date,
          category: 'other',
          url: '', // can't view trash files directly
          isStarred: false,
          originalPath: f.original_path
        }));
        setTrashFiles(mapped);
      }
    } catch(e) { console.error('Error fetching trash:', e); }
  };

  useEffect(() => {
    fetchCurrentFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  useEffect(() => {
    fetchStats();
    fetchTrashFiles();
  }, []);

  const uploadFile = (fileObj, skipRefresh = false) => {
    const queueId = Date.now() + '-' + fileObj.name;
    setUploadQueue(prev => [...prev, { id: queueId, name: fileObj.name, progress: 0, status: 'uploading', errorMsg: '', folderId: currentFolderId }]);

    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', fileObj);
      if (currentFolderId) {
        formData.append('folder', currentFolderId);
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, progress: percentComplete } : q));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, progress: 100, status: 'success' } : q));
          if (!skipRefresh) {
            fetchCurrentFolder();
            fetchStats();
          }
          resolve();
        } else {
          let msg = 'Error';
          try {
             const resData = JSON.parse(xhr.responseText);
             if (resData.error) msg = resData.error;
          } catch {}
          setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'error', errorMsg: msg } : q));
          resolve(); // Resolve anyway so Promise.all doesn't crash the whole batch
        }
      };

      xhr.onerror = () => {
        setUploadQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'error', errorMsg: 'Red' } : q));
        resolve(); // Resolve to not break batch
      };

      xhr.send(formData);
    });
  };

  const clearUploadQueue = () => setUploadQueue([]);

  const createFolder = async (folderName) => {
    const fullPath = currentFolderId ? `${currentFolderId}/${folderName}` : folderName;
    try {
      const res = await fetch('/api/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath })
      });
      if (!res.ok) throw new Error('Failed to create folder');
      fetchCurrentFolder();
    } catch (e) { 
      console.error('Create folder error', e); 
      throw e;
    }
  };

  const renameFile = async (id, newName, type) => {
    if (type === 'folder') {
      const res = await fetch('/api/rename_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: id, new_name: newName })
      });
      if (!res.ok) throw new Error(`Rename folder failed: ${res.statusText}`);
    } else {
      const parts = id.split('/');
      const filename = parts.pop();
      const folder = parts.join('/');
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, folder, new_filename: newName })
      });
      if (!res.ok) throw new Error(`Rename failed: ${res.statusText}`);
    }
    fetchCurrentFolder();
    if (type !== 'folder') fetchStats();
  };

  const removeFile = async (id, type, skipRefresh = false) => {
    if (type === 'folder') {
      const res = await fetch(`/api/rmdir?path=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete folder failed: ${res.statusText}`);
      if (!skipRefresh) fetchCurrentFolder();
    } else {
      const parts = id.split('/');
      const filename = parts.pop();
      const folder = parts.join('/');
      const res = await fetch(`/api/trash`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, folder })
      });
      if (!res.ok) throw new Error(`Move to trash failed: ${res.statusText}`);
      if (!skipRefresh) {
        fetchCurrentFolder();
        fetchTrashFiles();
        fetchStats();
      }
    }
  };

  const bulkMoveToTrash = async (fileIds, skipRefresh = false) => {
    const res = await fetch(`/api/files/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: fileIds })
    });
    if (!res.ok) throw new Error(`Bulk move to trash failed: ${res.statusText}`);
    if (!skipRefresh) {
      fetchCurrentFolder();
      fetchTrashFiles();
      fetchStats();
    }
  };

  const permanentDeleteFile = async (id, skipRefresh = false) => {
    const res = await fetch(`/api/trash/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Permanent delete failed: ${res.statusText}`);
    if (!skipRefresh) {
      fetchTrashFiles();
      fetchStats();
    }
  };

  const bulkPermanentDelete = async (fileIds, skipRefresh = false) => {
    const res = await fetch(`/api/trash/bulk`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: fileIds })
    });
    if (!res.ok) throw new Error(`Bulk permanent delete failed: ${res.statusText}`);
    if (!skipRefresh) {
      fetchTrashFiles();
      fetchStats();
    }
  };

  const restoreFile = async (id, skipRefresh = false) => {
    const res = await fetch(`/api/trash/${encodeURIComponent(id)}/restore`, { method: 'POST' });
    if (!res.ok) throw new Error(`Restore failed: ${res.statusText}`);
    if (!skipRefresh) {
      fetchCurrentFolder();
      fetchTrashFiles();
      fetchStats();
    }
  };

  const moveFile = async (targetId, destFolderId, type, skipRefresh = false) => {
    const res = await fetch('/api/move', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetId, destination: destFolderId || '' }) 
    });
    if (!res.ok) throw new Error(`Move failed: ${res.statusText}`);
    if (!skipRefresh) fetchCurrentFolder();
  };

  const toggleStar = async (id, skipRefresh = false) => {
    // Optimistic UI update
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isStarred: !f.isStarred } : f));
    
    try {
      const res = await fetch('/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error(`Star failed: ${res.statusText}`);
      if (!skipRefresh) {
        fetchStats();
      }
    } catch (e) {
      console.error(e);
      // Revert optimistic update on failure
      setFiles(prev => prev.map(f => f.id === id ? { ...f, isStarred: !f.isStarred } : f));
    }
  };

  const updateTags = async (id, tags) => {
    // Optimistic UI update
    setFiles(prev => prev.map(f => f.id === id ? { ...f, tags } : f));
    
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags })
      });
      if (!res.ok) throw new Error(`Update tags failed: ${res.statusText}`);
    } catch (e) {
      console.error(e);
      // Revert optimistic update? For simplicity, we can just trigger a refresh
      fetchCurrentFolder();
    }
  };

  return (
    <FileContext.Provider value={{
      files, trashFiles, isLoading, uploadQueue, clearUploadQueue, currentFolderId, setCurrentFolderId, globalStats,
      error, clearError: () => setError(null),
      fetchCurrentFolder, fetchTrashFiles, fetchStats, uploadFile, createFolder, removeFile, renameFile, moveFile,
      permanentDeleteFile, restoreFile, bulkMoveToTrash, bulkPermanentDelete,
      toggleStar, updateTags 
    }}>
      {children}
    </FileContext.Provider>
  );
};
