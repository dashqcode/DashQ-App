import os

file_path = r"c:\Users\alexs\Documents\FILE\src\react-frontend\src\pages\GestorPage.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state
state_search = "const [isUploadManagerExpanded, setIsUploadManagerExpanded] = useState(true);"
state_replace = """const [isUploadManagerExpanded, setIsUploadManagerExpanded] = useState(true);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [isDownloadManagerExpanded, setIsDownloadManagerExpanded] = useState(true);
  const clearDownloadQueue = () => setDownloadQueue([]);
"""
content = content.replace(state_search, state_replace)

# 2. Update performDownload
perform_search = """  // 📥 Download 📥
  const performDownload = async (isGet, url, postData, defaultFileName) => {
    try {
      if (window.showSaveFilePicker) {
        let handle;
        try {
          handle = await window.showSaveFilePicker({ suggestedName: defaultFileName });
        } catch (err) {
          if (err.name === 'AbortError') return;
          throw err;
        }
        
        showToast('Descargando archivo...', 'info');
        const fetchOptions = isGet ? {} : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        };
        const res = await fetch(url, fetchOptions);
        if (!res.ok) throw new Error('Error en descarga');
        const blob = await res.blob();

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 9999, colors: ['#6366f1', '#8b5cf6', '#d946ef', '#ffffff'] });
        showToast('Descarga guardada con éxito', 'success');
      } else {
        // Fallback for HTTP / Unsupported browsers: Native browser download
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
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 9999, colors: ['#6366f1', '#8b5cf6', '#d946ef', '#ffffff'] });
        showToast('Descarga iniciada con éxito', 'success');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Error al descargar', e);
        showToast('Error al descargar el archivo', 'error');
      }
    }
  };"""

perform_replace = """  // 📥 Download 📥
  const performDownload = async (isGet, url, postData, defaultFileName) => {
    const downloadId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setDownloadQueue(prev => [...prev, { id: downloadId, name: defaultFileName, status: 'downloading', progress: 50 }]);
    
    try {
      if (window.showSaveFilePicker) {
        let handle;
        try {
          handle = await window.showSaveFilePicker({ suggestedName: defaultFileName });
        } catch (err) {
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
  };"""

content = content.replace(perform_search, perform_replace)


# 3. Add Download Manager JSX right before Floating Upload Manager
jsx_search = "{/* Floating Upload Manager */}"
jsx_replace = """{/* Floating Download Manager */}
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
                      {item.name}
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.progress}%`, height: '100%', background: item.status === 'error' ? '#ef4444' : item.status === 'success' ? '#22c55e' : 'var(--color-primary)', transition: 'width 0.2s' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
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
      
      {/* Floating Upload Manager */}"""

content = content.replace(jsx_search, jsx_replace)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")
