import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../context/ToastContext';

const copyToClipboard = (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Unable to copy', err);
    }
    document.body.removeChild(textArea);
  }
};

function SettingsPage() {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'Administrador';
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('dashq_settings_tab') || 'profile';
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!isAdmin && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    const handleTabChange = (e) => {
      if (e.detail && e.detail.tab) {
        setActiveTab(e.detail.tab);
        localStorage.setItem('dashq_settings_tab', e.detail.tab);
      }
    };
    window.addEventListener('changeSettingsTab', handleTabChange);
    return () => window.removeEventListener('changeSettingsTab', handleTabChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('dashq_settings_tab', activeTab);
  }, [activeTab]);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    role: user?.role || '',
    oficina: user?.oficina || '',
    phone: user?.phone || ''
  });

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      updateUser(profileData);
      
      // Update local storage so the admin panel sees the change immediately
      try {
        const stored = localStorage.getItem('dashq_users_list');
        if (stored) {
          const list = JSON.parse(stored);
          const updated = list.map(u => u.username === user?.username ? { ...u, ...profileData } : u);
          localStorage.setItem('dashq_users_list', JSON.stringify(updated));
          // If we also had access to setUsersList here, we could update it. But it's defined lower down.
          // The page might need a refresh to show the user list, but the data is saved.
        }
      } catch (e) {
        console.error("Error saving profile to list", e);
      }
      
      setIsSavingProfile(false);
      addToast('Configuración actualizada con éxito', 'success');
    }, 800);
  };

  const [tunnelUrl, setTunnelUrl] = useState('');
  const [localIpUrl, setLocalIpUrl] = useState('');
  const [isTunnelEnabled, setIsTunnelEnabled] = useState(true);
  const [isLanEnabled, setIsLanEnabled] = useState(true);

  // AI State
  const [geminiKey, setGeminiKey] = useState('');
  const [isSavingAi, setIsSavingAi] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.gemini_api_key) setGeminiKey(data.gemini_api_key);
      })
      .catch(err => console.error("Error fetching settings", err));
  }, []);

  const handleSaveAi = () => {
    setIsSavingAi(true);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gemini_api_key: geminiKey })
    })
    .then(res => res.json())
    .then(data => {
      setIsSavingAi(false);
      if(data.status === 'success') {
        addToast('Configuración de IA actualizada', 'success');
      }
    })
    .catch(() => {
      setIsSavingAi(false);
      addToast('Error al guardar configuración', 'error');
    });
  };


  useEffect(() => {
    const fetchTunnel = async () => {
      try {
        const res = await fetch('/api/system/tunnel');
        const data = await res.json();
        if (data.url) {
          setTunnelUrl(data.url);
          setIsTunnelEnabled(true);
        }
        if (data.local_ip) {
          setLocalIpUrl(data.local_ip);
        }
      } catch (err) {
        console.error('Error fetching tunnel:', err);
      }
    };
    
    fetchTunnel();
    const interval = setInterval(fetchTunnel, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTunnel = async () => {
    const newState = !isTunnelEnabled;
    setIsTunnelEnabled(newState);
    if (!newState) {
      setTunnelUrl('');
    }
    try {
      await fetch(`/api/system/tunnel/${newState ? 'start' : 'stop'}`, { method: 'POST' });
      addToast(`Túnel de internet ${newState ? 'iniciado' : 'detenido'}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al cambiar estado del túnel', 'error');
    }
  };

  const handleToggleLan = () => {
    const newState = !isLanEnabled;
    setIsLanEnabled(newState);
    addToast(
      newState 
        ? 'Acceso en Red Local activado. (Requiere reiniciar para aplicar cambios profundos)'
        : 'Acceso en Red Local desactivado. (El servidor ignorará peticiones externas)', 
      'success'
    );
  };

  // Users state
  const [usersList, setUsersList] = useState(() => {
    try {
      const stored = localStorage.getItem('dashq_users_list');
      if (stored) return JSON.parse(stored);
    } catch(e) { console.warn(e); }
    return [];
  });
  const [showUserModal, setShowUserModal] = useState(false);
  const [userToDeleteIndex, setUserToDeleteIndex] = useState(null);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    username: '',
    email: '',
    phone: '',
    oficina: '',
    password: '',
    role: 'Usuario', 
    status: 'Activo',
    pageAccess: {
      dashboard: true,
      gestor: true,
      checklist: true,
      calendario: true,
      biblioteca: true,
      reportes: true,
      actividades: true,
      ajustes: false
    },
    permissions: {
      read: true,
      write: true,
      rename: true,
      copy: true,
      move: true,
      tag: true,
      delete: false,
      print: true
    }
  });

  const handleCreateUser = (e) => {
    e.preventDefault();
    const updated = [...usersList, newUser];
    setUsersList(updated);
    localStorage.setItem('dashq_users_list', JSON.stringify(updated));
    setShowUserModal(false);
    setNewUser({ 
      name: '', username: '', email: '', phone: '', oficina: '', password: '', role: 'Usuario', status: 'Activo',
      pageAccess: { dashboard: true, gestor: true, checklist: true, calendario: true, biblioteca: true, reportes: true, actividades: true, ajustes: false },
      permissions: { read: true, write: true, rename: true, copy: true, move: true, tag: true, delete: false, print: true }
    });
  };

  // System update state
  const [sysVersion, setSysVersion] = useState('...');
  const [sysLastUpdate, setSysLastUpdate] = useState(null);
  const [sysHistory, setSysHistory] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildLogs, setBuildLogs] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const orderedSysHistory = useMemo(() => {
    return [...(sysHistory || [])].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [sysHistory]);
  const [updateProgress, setUpdateProgress] = useState('');
  const [updateResult, setUpdateResult] = useState(null); // { type: 'success'|'error', msg }
  const [isDragOver, setIsDragOver] = useState(false);
  const updateFileRef = useRef(null);

  // Fetch version info when system tab is active
  useEffect(() => {
    if (activeTab === 'system') {
      fetch('/api/system/version')
        .then(r => r.json())
        .then(data => {
          setSysVersion(data.version || '1.0.0');
          setSysLastUpdate(data.last_update || null);
          setSysHistory(data.history || []);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // Export system
  const handleExportDB = useCallback(async () => {
    try {
      const res = await fetch('/api/system/export-db');
      if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `dashq_db_backup.db`;
      a.href = url;
      a.click();
    } catch (err) {
      alert('Error exportando BD: ' + err.message);
    }
  }, []);

  const handleBuildAll = useCallback(() => {
    setIsExporting(true);
    setShowBuildModal(true);
    setBuildLogs([]);
    setUpdateResult(null);

    const source = new EventSource('/api/system/build-all');

    source.onmessage = (e) => {
      if (e.data === '[DONE]') {
        source.close();
        setIsExporting(false);
        setSysLastUpdate(new Date().toISOString());
        setUpdateResult({ type: 'success', msg: 'Compilación global y publicación finalizadas con éxito.' });
      } else if (e.data.startsWith('[ERROR]')) {
        source.close();
        setIsExporting(false);
        setUpdateResult({ type: 'error', msg: e.data });
      } else {
        setBuildLogs(prev => [...prev, e.data]);
      }
    };

    source.onerror = (e) => {
      source.close();
      setIsExporting(false);
      setUpdateResult({ type: 'error', msg: 'Error de conexión con el compilador.' });
    };
  }, []);

  // Install update
  const handleUpdate = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.zip')) {
      setUpdateResult({ type: 'error', msg: 'Solo se permiten archivos ZIP.' });
      return;
    }
    setIsUpdating(true);
    setUpdateProgress('Subiendo archivo...');
    setUpdateResult(null);

    const formData = new FormData();
    formData.append('update_file', file);

    try {
      setUpdateProgress('Instalando actualización...');
      const res = await fetch('/api/system/update', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateProgress('Reiniciando servidor...');
        // Wait a moment for the server to restart
        await new Promise(r => setTimeout(r, 3000));
        
        let attempts = 0;
        while (attempts < 15) {
          try {
            const vRes = await fetch('/api/system/version');
            if (vRes.ok) {
              const vData = await vRes.json();
              setSysVersion(vData.version || sysVersion);
              setSysLastUpdate(vData.last_update);
              setSysHistory(vData.history || []);
              setUpdateResult({ type: 'success', msg: `${data.message} (${data.files_updated} archivos actualizados)` });
              break;
            }
          } catch {
            // still restarting
          }
          attempts++;
          await new Promise(r => setTimeout(r, 2000));
        }
        if (attempts >= 15) {
          setUpdateResult({ type: 'error', msg: 'La actualización se instaló, pero el servidor tarda en responder. Por favor, recarga la página.' });
        }
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        setUpdateProgress('Reiniciando servidor (Conexión perdida)...');
        let attempts = 0;
        while (attempts < 15) {
          try {
            const vRes = await fetch('/api/system/version');
            if (vRes.ok) {
              const vData = await vRes.json();
              setSysVersion(vData.version || sysVersion);
              setSysLastUpdate(vData.last_update);
              setSysHistory(vData.history || []);
              setUpdateResult({ type: 'success', msg: 'Actualización instalada con éxito tras el reinicio.' });
              break;
            }
          } catch {
            // still restarting
          }
          attempts++;
          await new Promise(r => setTimeout(r, 2000));
        }
        if (attempts >= 15) {
          setUpdateResult({ type: 'error', msg: 'El servidor se está reiniciando. Por favor, recarga la página manualmente.' });
        }
      } else {
        setUpdateResult({ type: 'error', msg: `Error: ${e.message}` });
      }
    } finally {
      setIsUpdating(false);
      setUpdateProgress('');
    }
  }, [sysVersion]);

  // Push update
  const [targetIp, setTargetIp] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  
  
  const formatDate = (iso) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Shared card style
  const cardStyle = { background: 'var(--bg-card)', border: 'none', borderRadius: '24px', padding: '24px', boxShadow: 'none' };
  const navBtnStyle = (key) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: activeTab === key ? 'rgba(255, 255, 255, 0.08)' : 'transparent', border: 'none', borderRadius: '30px', color: activeTab === key ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activeTab === key ? '600' : '500', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', outline: 'none', width: '100%' });

  return (
    <div className="settings-layout" style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0, height: '100%', width: '100%', position: 'relative', padding: 0, marginTop: 0, gap: '16px', background: 'transparent' }}>
      {/* Left Navigation Menu */}
      <div className="settings-nav" style={{ background: '#161616', borderRadius: '32px', border: 'none', width: '260px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, overflowY: 'auto' }}>
          {[
            { key: 'profile', icon: 'solar:user-id-bold-duotone', label: 'Mi Cuenta' },
            { key: 'alerts', icon: 'solar:bell-bold-duotone', label: 'Configurar Alertas' },
            isAdmin && { key: 'users', icon: 'solar:users-group-rounded-bold-duotone', label: 'Administración de Usuarios' },
            isAdmin && { key: 'database', icon: 'solar:database-bold-duotone', label: 'Base de Datos' },
            isAdmin && { key: 'ai', icon: 'solar:magic-stick-3-bold-duotone', label: 'Inteligencia Artificial' },
            isAdmin && { key: 'system', icon: 'solar:cloud-upload-bold-duotone', label: 'Sistema y Actualizaciones' },
            { key: 'info', icon: 'solar:shield-keyhole-bold-duotone', label: 'Políticas y Privacidad' },
          ].filter(Boolean).map(({ key, icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={navBtnStyle(key)}>
              <Icon icon={icon} size={16} color={activeTab === key ? 'var(--color-primary)' : 'inherit'} />
              <span>{label}</span>
            </button>
          ))}
        </div>

          {/* Right Content */}
          <div className="settings-content" style={{ background: '#161616', borderRadius: '32px', border: 'none', padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Header Profile */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#111111' }}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                  </div>
                </div>
                <div>
                  <button style={{ padding: '10px 20px', borderRadius: '30px', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#111'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}>
                    <Icon icon="solar:camera-bold-duotone" size={16} /> Cambiar Foto
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre Completo</label>
                  <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario (ID)</label>
                  <input type="text" defaultValue={user?.username || 'admin'} disabled style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: 'var(--text-secondary)', fontSize: '14px', outline: 'none' }} title="El ID de usuario no se puede cambiar" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cargo / Puesto</label>
                  <input type="text" value={profileData.role} onChange={e => setProfileData({...profileData, role: e.target.value})} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teléfono</label>
                  <input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Oficina</label>
                  <CustomSelect 
                    value={profileData.oficina} 
                    onChange={val => setProfileData({...profileData, oficina: val})} 
                    options={[
                      { value: '', label: 'Sin Asignar' },
                      { value: 'Tesorería', label: 'Tesorería' },
                      { value: 'Contabilidad', label: 'Contabilidad' },
                      { value: 'Administración', label: 'Administración' },
                      { value: 'Archivo de Caja', label: 'Archivo de Caja' }
                    ]}
                  />
                </div>
              </div>

              {/* Save Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button style={{ padding: '12px 24px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Descartar</button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={{ padding: '12px 24px', borderRadius: '30px', border: 'none', background: 'var(--color-primary)', color: '#111', fontWeight: 600, fontSize: '13px', cursor: isSavingProfile ? 'wait' : 'pointer', transition: '0.2s', opacity: isSavingProfile ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSavingProfile ? <Icon icon="solar:refresh-circle-bold-duotone" size={16} style={{animation:'spin 1s linear infinite'}} /> : <Icon icon="solar:check-circle-bold-duotone" size={16} />} 
                  {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {!showUserModal ? (
                <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <Icon icon="solar:users-group-rounded-bold-duotone" size={24} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>Administración de Usuarios</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Gestiona los miembros de tu equipo y sus permisos de acceso al sistema.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Usuarios Activos ({1 + usersList.length})</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Manten el control de quién ingresa a tu entorno.</p>
                  </div>
                  <button onClick={() => setShowUserModal(true)} className="btn-premium" style={{ fontSize: '12px', padding: '8px 16px' }}>
                    <Icon icon="solar:user-plus-rounded-bold-duotone" size={18} /> Crear Usuario
                  </button>
                </div>

                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 100px', gap: '16px', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <span>Usuario</span>
                  <span>Contacto</span>
                  <span>Rol</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>


                {/* ACAJA Factory User Row (Fixed) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 100px', gap: '16px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 152, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9800', flexShrink: 0 }}>
                      <Icon icon="solar:user-bold-duotone" size={20} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Archivo de Caja {user?.username === 'ACAJA' ? '(Tú)' : ''}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>ID: ACAJA</p>
                    </div>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.username === 'ACAJA' ? (user?.phone || '+51 969 065 797') : '+51 969 065 797'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.username === 'ACAJA' ? (user?.email || 'dashqcode@gmail.com') : 'dashqcode@gmail.com'}</p>
                  </div>
                  <div>
                    <span style={{ padding: '4px 8px', borderRadius: '30px', background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600 }}>Administrador</span>
                  </div>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#22c55e', fontWeight: 500 }}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e'}}></div> Activo</span>
                  </div>
                  <div>
                    {/* ACAJA cannot be edited/deleted */}
                  </div>
                </div>

                {/* Dynamically Added Users */}
                {usersList.map((u, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 100px', gap: '16px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.name}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>ID: {u.username || u.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.phone || 'Sin teléfono'}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.email || 'Sin correo'}</p>
                    </div>
                    <div>
                      <span style={{ padding: '4px 8px', borderRadius: '30px', background: u.role === 'Administrador' ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)', color: u.role === 'Administrador' ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>{u.role}</span>
                    </div>
                    <div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: u.status === 'Activo' ? '#22c55e' : '#60a5fa', fontWeight: 500 }}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:u.status === 'Activo' ? '#22c55e' : '#60a5fa'}}></div> {u.status}</span>
                    </div>
                    <div>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px' }} onClick={() => setUserToDeleteIndex(i)} title="Eliminar usuario"><Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={18} /></button>
                    </div>
                  </div>
                ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setShowUserModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <Icon icon="solar:arrow-left-bold-duotone" size={20} />
                  </button>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>Crear Nuevo Usuario</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Añade a un nuevo miembro del equipo y configura sus permisos.</p>
                  </div>
                </div>

                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre Completo</label>
                      <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required placeholder="Ej. Juan Pérez" style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</label>
                      <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required placeholder="Ej. tcruz" style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Correo (Opcional)</label>
                      <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="Ej. usr@dashq.com" style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teléfono (Opcional)</label>
                      <input type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="Ej. 999 999 999" style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Oficina</label>
                      <CustomSelect 
                        value={newUser.oficina} 
                        onChange={val => setNewUser({...newUser, oficina: val})}
                        options={[
                          { value: '', label: 'Seleccionar...' },
                          { value: 'Tesorería', label: 'Tesorería' },
                          { value: 'Contabilidad', label: 'Contabilidad' },
                          { value: 'Administración', label: 'Administración' },
                          { value: 'Archivo de Caja', label: 'Archivo de Caja' }
                        ]}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña de Acceso</label>
                      <div style={{ position: 'relative' }}>
                        <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required placeholder="Asigna una contraseña" style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none', paddingRight: '70px' }} />
                        <button type="button" onClick={() => setNewUser({...newUser, password: Math.random().toString(36).slice(-8)})} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--color-primary)', borderRadius: '30px', border: 'none', color: '#111111', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: '4px 8px' }}>Generar</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '16px' }}>
                    {/* Page Access Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acceso a Páginas</label>
                        <button type="button" onClick={() => {
                          const isAll = Object.values(newUser.pageAccess || {}).every(Boolean);
                          const val = !isAll;
                          setNewUser({ ...newUser, pageAccess: { dashboard: val, gestor: val, checklist: val, calendario: val, biblioteca: val, reportes: val, actividades: val, ajustes: val } });
                        }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {Object.values(newUser.pageAccess || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                          { key: 'dashboard', label: 'Dashboard' },
                          { key: 'gestor', label: 'Gestor de Archivos' },
                          { key: 'checklist', label: 'Control Documental' },
                          { key: 'calendario', label: 'Calendario' },
                          { key: 'biblioteca', label: 'Biblioteca' },
                          { key: 'reportes', label: 'Reportes' },
                          { key: 'actividades', label: 'Centro de Actividades' },
                          { key: 'ajustes', label: 'Configuración' }
                        ].map(page => {
                          const isChecked = newUser.pageAccess?.[page.key] ?? false;
                          return (
                            <div key={page.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setNewUser({ ...newUser, pageAccess: { ...(newUser.pageAccess || {}), [page.key]: !isChecked } })}>
                              <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: 'all 0.3s ease', flexShrink: 0 }}>
                                <div style={{ position: 'absolute', top: '2px', left: '2px', transform: isChecked ? 'translateX(16px)' : 'translateX(0)', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                              </div>
                              <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{page.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Permissions Grid */}
                    {newUser.pageAccess?.gestor && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.3s ease-in-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Permisos Documentales</label>
                          <button type="button" onClick={() => {
                            const isAll = Object.values(newUser.permissions || {}).every(Boolean);
                            const val = !isAll;
                            setNewUser({ ...newUser, permissions: { read: val, write: val, rename: val, copy: val, move: val, tag: val, delete: val, print: val } });
                          }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {Object.values(newUser.permissions || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {[
                            { key: 'read', label: 'Leer / Visualizar' },
                            { key: 'write', label: 'Crear / Editar' },
                            { key: 'rename', label: 'Renombrar' },
                            { key: 'copy', label: 'Copiar' },
                            { key: 'move', label: 'Mover' },
                            { key: 'tag', label: 'Etiquetar / Favs' },
                            { key: 'delete', label: 'Eliminar' },
                            { key: 'print', label: 'Exportar' }
                          ].map(perm => {
                            const isChecked = newUser.permissions?.[perm.key] ?? false;
                            return (
                              <div key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setNewUser({ ...newUser, permissions: { ...(newUser.permissions || {}), [perm.key]: !isChecked } })}>
                                <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: 'all 0.3s ease', flexShrink: 0 }}>
                                  <div style={{ position: 'absolute', top: '2px', left: '2px', transform: isChecked ? 'translateX(16px)' : 'translateX(0)', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                                </div>
                                <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{perm.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setShowUserModal(false)} style={{ padding: '12px 24px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Cancelar</button>
                    <button type="submit" style={{ padding: '12px 24px', borderRadius: '30px', border: 'none', background: 'var(--color-primary)', color: '#111', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: '0.2s' }}>Guardar Usuario</button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

{activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:magic-stick-3-bold-duotone" size={24} color="var(--color-primary)" />
                  Inteligencia Artificial (Chat con Documentos)
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                  Conecta una IA para poder "chatear" con tus documentos PDF, hacer preguntas sobre su contenido y obtener resúmenes al instante. Actualmente soportamos <b>Google Gemini</b> (Rápido y con capa gratuita).
                </p>

                <div className="input-group" style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '30px', border: '1px solid var(--border-color)',
                      background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s'
                    }}
                  />
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                    Puedes obtener tu clave gratuita en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Google AI Studio</a>.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                  <button 
                    onClick={handleSaveAi}
                    className="btn-primary" 
                    disabled={isSavingAi}
                    style={{ padding: '12px 24px', borderRadius: '24px', background: 'var(--color-primary)', color: '#111111', border: 'none', fontWeight: '600', cursor: isSavingAi ? 'not-allowed' : 'pointer', opacity: isSavingAi ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon={isSavingAi ? "solar:refresh-bold-duotone" : "solar:diskette-bold-duotone"} size={18} className={isSavingAi ? 'spin' : ''} />
                    {isSavingAi ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                  <Icon icon="solar:server-path-bold-duotone" size={24} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>Base de Datos Local</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Gestión de la base de datos IndexedDB local.</p>
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Tus archivos están guardados de forma segura en tu navegador local. Ningún dato se envía a servidores externos sin tu permiso.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={handleExportDB} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '20px', background: 'var(--color-primary)', color: '#111111', border: 'none', cursor: 'pointer' }}>Exportar Base de Datos</button>
                </div>
              </div>

              {/* TUNNEL CARD */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '30px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon icon="solar:global-bold-duotone" size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>Accesos y Conectividad</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Gestiona cómo otros dispositivos se conectan a tu Servidor Maestro.</p>
                  </div>
                </div>
                
                {isTunnelEnabled ? (
                  tunnelUrl ? (
                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                        <div>
                          <span style={{ fontSize: '15px', color: '#60a5fa', fontWeight: 600, fontFamily: 'monospace', display: 'block' }}>{tunnelUrl}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Acceso remoto por Internet (Túnel Cloudflare)</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div onClick={handleToggleTunnel} style={{ width: '44px', height: '24px', borderRadius: '30px', background: isTunnelEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isTunnelEnabled ? '22px' : '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                        </div>
                        <button 
                          onClick={() => { copyToClipboard(tunnelUrl); addToast('Enlace copiado al portapapeles', 'success'); }} 
                          style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          <Icon icon="solar:copy-bold-duotone" size={18} /> Copiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Icon icon="solar:refresh-bold-duotone" size={24} color="#60a5fa" className="spin" />
                        <div>
                          <span style={{ fontSize: '14px', color: '#60a5fa', fontWeight: 500, display: 'block' }}>Generando túnel seguro...</span>
                          <span style={{ fontSize: '12px', color: 'rgba(96,165,250,0.7)' }}>Esto puede tardar unos segundos</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div onClick={handleToggleTunnel} style={{ width: '44px', height: '24px', borderRadius: '30px', background: isTunnelEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isTunnelEnabled ? '22px' : '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon icon="solar:shield-bold-duotone" size={24} color="var(--text-secondary)" />
                      <div>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, display: 'block' }}>Túnel de internet apagado</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>El servidor solo es accesible de manera local</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div onClick={handleToggleTunnel} style={{ width: '44px', height: '24px', borderRadius: '30px', background: isTunnelEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isTunnelEnabled ? '22px' : '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                      </div>
                    </div>
                  </div>
                )}

                {localIpUrl && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isLanEnabled ? 1 : 0.5, transition: 'opacity 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isLanEnabled ? '#3b82f6' : '#6b7280', boxShadow: isLanEnabled ? '0 0 8px #3b82f6' : 'none', transition: 'all 0.3s' }}></div>
                      <div>
                        <span style={{ fontSize: '15px', color: isLanEnabled ? '#60a5fa' : '#9ca3af', fontWeight: 600, fontFamily: 'monospace', display: 'block', transition: 'color 0.3s' }}>{localIpUrl}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Acceso rápido en Red Local (LAN)</span>
                      </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                          onClick={handleToggleLan}
                          style={{
                            width: '44px', height: '24px', borderRadius: '30px',
                            background: isLanEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                            position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                          }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: '2px', left: isLanEnabled ? '22px' : '2px',
                            transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                        <button
                          onClick={() => {
                            copyToClipboard(localIpUrl);
                            addToast('IP copiada al portapapeles', 'success');
                          }}
                          style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          <Icon icon="solar:copy-bold-duotone" size={18} /> Copiar
                        </button>
                      </div>
                    </div>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '16px' }}>
                  * Nota: Por seguridad, la primera vez que alguien abra este enlace, se le pedirá que haga clic en el botón "Click to Continue" en una pantalla de advertencia.
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ACTUALIZACIÓN DEL SISTEMA                                      */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* ── Info del Sistema ── */}
              <div style={{ ...cardStyle, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '30px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon icon="solar:cpu-bold-duotone" size={20} color="var(--color-primary)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0' }}>Información del Sistema</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '12px' }}>Estado actual de tu instalación de DashQ.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '30px', padding: '12px', border: 'none' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Versión</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>{sysVersion}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '30px', padding: '12px', border: 'none' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Última Actualización</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{sysLastUpdate ? formatDate(sysLastUpdate) : 'Original'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '30px', padding: '12px', border: 'none' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Estado</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#22c55e' }}>Operativo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Acciones de Actualización ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {/* Compilar y Publicar */}
                <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '30px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon icon="solar:cloud-upload-bold-duotone" size={16} color="#22c55e" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Publicar Actualización</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '11px' }}>Genera y envía automáticamente la actualización a toda la red.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleBuildAll}
                    disabled={isExporting}
                    style={{
                      marginTop: 'auto', padding: '16px 24px', borderRadius: '30px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: isExporting ? 'wait' : 'pointer',
                      background: isExporting ? 'rgba(34,197,94,0.15)' : '#22c55e',
                      color: isExporting ? '#22c55e' : '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', width: '100%',
                      boxShadow: isExporting ? 'none' : '0 4px 12px rgba(34,197,94,0.3)'
                    }}
                    onMouseEnter={e => { if(!isExporting) { e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={e => { if(!isExporting) { e.currentTarget.style.transform = 'translateY(0)'; } }}
                  >
                    {isExporting ? <Icon icon="solar:refresh-circle-bold-duotone" size={18} style={{animation:'spin 1s linear infinite'}} /> : <Icon icon="solar:rocket-bold-duotone" size={18} />}
                    {isExporting ? 'Procesando y publicando...' : `Lanzar Actualización (v${sysVersion})`}
                  </button>
                </div>

                {/* ── Descargar Instalador ── */}
                <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '30px', background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon icon="solar:monitor-smartphone-bold-duotone" size={16} color="#38bdf8" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Descargar Instalador (.exe)</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '11px' }}>Descarga la App de Escritorio para instalarla en nuevas PCs.</p>
                    </div>
                  </div>
                  <a href={`/api/system/download-installer?t=${Date.now()}`} target="_blank" download style={{ marginTop: 'auto', textDecoration: 'none', textAlign: 'center', padding: '16px 24px', borderRadius: '30px', border: 'none', fontWeight: 600, fontSize: '13px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', width: '100%' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <Icon icon="solar:download-bold-duotone" size={18} />
                    Descargar App (.exe)
                  </a>
                </div>
              </div>

              {/* ── Historial de Actualizaciones ── */}
              {sysHistory.length > 0 && (
                <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '30px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon icon="solar:history-bold-duotone" size={18} color="#60a5fa" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px 0' }}>Historial de Actualizaciones</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '11px' }}>Registro de las últimas actualizaciones.</p>
                    </div>
                  </div>

                  <div style={{ borderRadius: '30px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                    <div style={{ maxHeight: '110px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <tr style={{ background: 'rgba(20,20,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>N°</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Versión</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Fecha</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Archivos</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Estado</th>
                          </tr>
                        </thead>
                      <tbody>
                        {orderedSysHistory.map((h, i) => (
                          <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--color-primary)', fontWeight: 600 }}>v{h.version}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatDate(h.date)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{h.files_updated} archivos</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: h.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: h.status === 'success' ? '#22c55e' : '#ef4444' }}>
                                <Icon icon={h.status === 'success' ? 'solar:check-circle-bold-duotone' : 'mdi:close'} size={12} />
                                {h.status === 'success' ? 'Exitosa' : 'Error'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Configuración de Alertas</h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Personaliza cómo y cuándo recibes notificaciones del sistema.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Alertas del Sistema</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Notificaciones Push</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Recibe alertas en tiempo real en tu navegador.</div>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'var(--color-primary)', borderRadius: '30px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', background: '#111', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Alertas por Correo</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Recibe un resumen diario de las actividades.</div>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '30px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: 'var(--text-secondary)', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Sonidos de Alerta</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Reproducir un sonido cuando llegue una notificación.</div>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'var(--color-primary)', borderRadius: '30px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', background: '#111', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button style={{ padding: '12px 24px', borderRadius: '30px', background: 'var(--color-primary)', color: '#111', fontWeight: 600, fontSize: '13px', cursor: 'pointer', border: 'none' }}>Guardar Preferencias</button>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:shield-keyhole-bold-duotone" size={22} color="var(--color-primary)" />
                  Información, Políticas y Privacidad
                </h2>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4', marginBottom: '8px' }}>
                    Este sistema ha sido diseñado y desarrollado bajo estrictos estándares de privacidad. Todos los datos ingresados y los archivos gestionados se almacenan de manera local y segura.
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4', marginBottom: '12px' }}>
                    Garantizamos la confidencialidad de la información, respetando las políticas internas establecidas por la administración. No compartimos datos con terceros sin autorización explícita.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                    <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111111', fontSize: '20px', fontWeight: 'bold' }}>
                        AM
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Alexsander R. Mayta Casimiro</h4>
                          <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desarrollador Principal</span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Creador y Arquitecto del Sistema DashQ</p>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.04)', transition: '0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                            <Icon icon="solar:letter-bold-duotone" size={16} color="var(--color-primary)"/> alexsanderrmc@gmail.com
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <Icon icon="solar:card-2-bold-duotone" size={16} color="var(--color-primary)"/> RUC: 10769247195
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <Icon icon="solar:map-point-bold-duotone" size={16} color="var(--color-primary)"/> Mariscal Nieto, Moquegua
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 24px', background: 'transparent', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <img src="https://antigravity.google/assets/image/brand/antigravity-icon__full-color.png" alt="Antigravity Logo" style={{ width: '36px', height: '36px', borderRadius: '30px' }} />
                        <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Antigravity</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: '16px' }}>Formulador de código</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                    {/* Columna Izquierda: Stack Tecnológico */}
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon icon="solar:cpu-bolt-bold-duotone" size={16} color="var(--color-primary)" />
                        Arquitectura y Tecnologías
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {[
                          { name: 'React 18', icon: 'logos:react' },
                          { name: 'Vite.js', icon: 'logos:vitejs' },
                          { name: 'JavaScript ES6+', icon: 'logos:javascript' },
                          { name: 'HTML5', icon: 'logos:html-5' },
                          { name: 'CSS3 Moderno', icon: 'logos:css-3' },
                          { name: 'Node.js', icon: 'logos:nodejs-icon' },
                        ].map(tech => (
                          <div key={tech.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '30px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600', transition: '0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                            <Icon icon={tech.icon} size={16} />
                            {tech.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Columna Derecha: Licencia */}
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon icon="solar:shield-check-bold-duotone" size={16} color="var(--color-primary)" />
                        Licencia de Software
                      </h4>
                      <div style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px', height: 'calc(100% - 26px)' }}>
                        <Icon icon="solar:verified-check-bold-duotone" size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Licencia Comercial Exclusiva</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Propiedad protegida y sistema de código cerrado. Queda terminantemente prohibida su distribución, copia, alteración o ingeniería inversa.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
          {/* === TABLA DE HISTORIAL FIN === */}

        {showBuildModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: 'var(--bg-secondary)', width: '90%', maxWidth: '850px', height: '80vh', borderRadius: '24px',
              border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>
                  <Icon icon="solar:programming-bold-duotone" size={22} color="var(--color-primary)" />
                  Terminal de Compilación Global
                </h3>
                <button onClick={() => { if(!isExporting) setShowBuildModal(false); }} disabled={isExporting} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: isExporting ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)', cursor: isExporting ? 'not-allowed' : 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if(!isExporting) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; if(!isExporting) e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { if(!isExporting) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; if(!isExporting) e.currentTarget.style.color = 'var(--text-muted)'; }}>
                  <Icon icon="solar:close-square-bold-duotone" size={20} />
                </button>
              </div>
              <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: '#0a0a0a', fontFamily: '"Consolas", "Fira Code", monospace', fontSize: '13px', color: '#60a5fa', lineHeight: '1.6' }}
                ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
              >
                {buildLogs.map((log, i) => {
                  let color = '#60a5fa'; // green default
                  if (log.includes('[ERROR]') || log.includes('ERR')) color = '#ef4444';
                  else if (log.includes('[OTA]') || log.includes('===') || log.includes('[OK]')) color = '#3b82f6';
                  else if (log.includes('>>>')) color = '#a855f7';
                  else if (log.includes('warning') || log.includes('WARN')) color = '#60a5fa';
                  
                  return <div key={i} dangerouslySetInnerHTML={{ __html: log }} style={{ marginBottom: '6px', wordBreak: 'break-all', color }} />
                })}
                {isExporting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', color: '#60a5fa', fontWeight: 500, padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '30px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <Icon icon="solar:refresh-circle-bold-duotone" size={20} style={{ animation: 'spin 1s linear infinite' }} /> 
                    Compilando en progreso, por favor no cierres esta ventana...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* MODAL ELIMINAR USUARIO */}
      {userToDeleteIndex !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setUserToDeleteIndex(null)}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '30px', width: '100%', maxWidth: '400px', padding: '32px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <Icon icon="solar:danger-triangle-bold-duotone" size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>¿Eliminar usuario?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Esta acción no se puede deshacer. El usuario perderá el acceso al sistema inmediatamente.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setUserToDeleteIndex(null)}
              >
                Cancelar
              </button>
              <button 
                style={{ padding: '8px 16px', borderRadius: '20px', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  const updated = usersList.filter((_, idx) => idx !== userToDeleteIndex);
                  setUsersList(updated);
                  localStorage.setItem('dashq_users_list', JSON.stringify(updated));
                  setUserToDeleteIndex(null);
                }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SettingsPage;

