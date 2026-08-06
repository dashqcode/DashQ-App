import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import Icon from './components/ui/Icon';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/ui/PageTransition';
import { FileProvider, useFiles } from './context/FileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './ErrorBoundary';
import { getActivities } from './utils/activityUtils';
import CommandPalette from './components/CommandPalette';
import OnboardingModal from './components/OnboardingModal';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GestorPage = lazy(() => import('./pages/GestorPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const SharePage = lazy(() => import('./pages/SharePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', gap: '20px' }}>
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: '50px', height: '50px', background: 'var(--color-primary)', borderRadius: '50%', filter: 'blur(20px)', opacity: 0.3, animation: 'pulse 2s infinite' }}></div>
      <img src="/logo.svg" alt="Cargando..." style={{ width: '44px', height: '44px', zIndex: 1, animation: 'pulse 2s infinite' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '3px', textTransform: 'uppercase' }}>Iniciando</span>
      <div className="sleek-progress-container">
        <div className="sleek-progress-bar"></div>
      </div>
    </div>
  </div>
);

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  let setCurrentFolderId = null;
  try {
    const filesContext = useFiles();
    setCurrentFolderId = filesContext?.setCurrentFolderId;
  } catch (_e) {
    // If we're somehow rendered outside FileProvider, gracefully degrade
  }
  const [collapsed, setCollapsed] = React.useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [systemVersion, setSystemVersion] = React.useState('');
  
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifMenu, setShowNotifMenu] = React.useState(false);
  const [unreadActivities, setUnreadActivities] = React.useState(0);
  const profileRef = React.useRef(null);

  React.useEffect(() => {
    if (!user) return;
    const check = () => {
      const activities = getActivities(user);
      setUnreadActivities(activities.filter(a => !a.read || a.isPendingForMe).length);
    };
    check();
    const iv = setInterval(check, 2000);
    return () => clearInterval(iv);
  }, [user]);

  const canAccess = (pageKey) => {
    if (!user) return false;
    if (user.role === 'Administrador') return true;
    if (!user.pageAccess) return true; // legacy support
    return user.pageAccess[pageKey] === true;
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowUserMenu(false);
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    fetch('/api/system/version')
      .then(r => r.json())
      .then(d => setSystemVersion(d.version))
      .catch(e => console.error(e));
  }, []);

  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('sidebar_collapsed', newVal);
  };
  
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.svg" alt="DashQ Logo" style={{ width: '28px', height: '28px' }} />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, lineHeight: '1' }}>DashQ</span>
              {systemVersion && (
                <span style={{ fontSize: '9.5px', color: 'var(--color-primary)', fontWeight: 700, background: 'rgba(99, 102, 241, 0.12)', padding: '1.5px 5px', borderRadius: '30px', marginTop: '4px', letterSpacing: '0.5px' }}>
                  {systemVersion.startsWith('v') ? systemVersion : `v${systemVersion}`}
                </span>
              )}
            </div>
          )}
        </div>
        <button className="btn-collapse" onClick={toggleCollapse} data-tooltip={collapsed ? "Expandir" : "Colapsar"}>
          <Icon icon={collapsed ? 'solar:alt-arrow-right-bold-duotone' : 'solar:alt-arrow-left-bold-duotone'} size={14} />
        </button>
      </div>
      
      {(canAccess('dashboard') || canAccess('gestor') || canAccess('biblioteca') || canAccess('ajustes') || canAccess('reportes')) && (
        <>
          {!collapsed && <div className="nav-title">PRINCIPAL</div>}
          <nav className="nav-menu">
            {canAccess('dashboard') && (
              <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Dashboard" end>
                <Icon icon="solar:pie-chart-bold-duotone" size={18} />
                {!collapsed && <span>Dashboard</span>}
              </NavLink>
            )}
            {canAccess('gestor') && (
              <NavLink to="/gestor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Gestor de Archivos" onClick={() => setCurrentFolderId && setCurrentFolderId('')}>
                <Icon icon="solar:folder-with-files-bold-duotone" size={18} />
                {!collapsed && <span>Gestor de Archivos</span>}
              </NavLink>
            )}
            {canAccess('biblioteca') && (
              <NavLink to="/library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Biblioteca">
                <Icon icon="solar:book-bold-duotone" size={18} />
                {!collapsed && <span>Biblioteca</span>}
              </NavLink>
            )}
            {canAccess('dashboard') && (
              <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Mensajes">
                <Icon icon="solar:chat-round-dots-bold-duotone" size={18} />
                {!collapsed && <span>Mensajes</span>}
              </NavLink>
            )}
            {canAccess('reportes') && (
              <NavLink to="/reporte-vista" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Reportes">
                <Icon icon="solar:document-text-bold-duotone" size={18} />
                {!collapsed && <span>Reportes</span>}
              </NavLink>
            )}
            {canAccess('ajustes') && (
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Configuración">
                <Icon icon="solar:settings-bold-duotone" size={18} />
                {!collapsed && <span>Configuración</span>}
              </NavLink>
            )}
          </nav>
        </>
      )}

      {(canAccess('calendario') || canAccess('checklist') || canAccess('actividades')) && (
        <>
          {!collapsed && <div className="nav-title" style={{ marginTop: '12px' }}>HERRAMIENTAS</div>}
          <nav className="nav-menu" style={{ marginBottom: '12px' }}>
            {canAccess('calendario') && (
              <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Calendario">
                <Icon icon="solar:calendar-bold-duotone" size={18} />
                {!collapsed && <span>Calendario</span>}
              </NavLink>
            )}
            {canAccess('checklist') && (
              <NavLink to="/checklist" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Control Documental">
                <Icon icon="solar:checklist-bold-duotone" size={18} />
                {!collapsed && <span>Control Documental</span>}
              </NavLink>
            )}
            {canAccess('actividades') && (
              <NavLink to="/actividades" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} data-tooltip="Centro de Actividades">
                <Icon icon="solar:bell-bing-bold-duotone" size={18} />
                {!collapsed && <span>Centro de Actividades</span>}
              </NavLink>
            )}
          </nav>
        </>
      )}

      <div className="user-profile-container" ref={profileRef} style={{ padding: collapsed ? '8px' : '16px', position: 'relative' }}>
        
        {/* NEW USER MENU TRIGGER (Reference matched) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: collapsed ? 'column' : 'row', 
          alignItems: 'center', 
          gap: '8px',
          background: collapsed ? 'rgba(255,255,255,0.03)' : 'transparent',
          padding: collapsed ? '6px' : '0',
          borderRadius: '100px',
          border: collapsed ? '1px solid rgba(255,255,255,0.05)' : 'none'
        }}>
          
          {/* User Profile Button (FIRST) */}
          <button 
            type="button" 
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}
            style={{ 
              flex: 1, display: 'flex', alignItems: 'center', gap: '8px', 
              padding: collapsed ? '0' : '6px 12px 6px 6px', 
              background: collapsed ? 'transparent' : 'rgba(255,255,255,0.03)', 
              borderRadius: '100px', 
              border: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)', 
              cursor: 'pointer', transition: '0.2s', 
              width: collapsed ? '36px' : '100%', height: collapsed ? '36px' : 'auto',
              minWidth: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = collapsed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = collapsed ? 'transparent' : 'rgba(255,255,255,0.03)' }}
          >
            <div style={{ width: collapsed ? '36px' : '28px', height: collapsed ? '36px' : '28px', borderRadius: '50%', background: 'var(--color-primary)', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: collapsed ? '14px' : '12px', fontWeight: 'bold', flexShrink: 0, margin: collapsed ? '0 auto' : '0' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!collapsed && (
              <>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left', minWidth: 0 }}>
                  {user?.name || 'Usuario'}
                </span>
                <Icon icon="solar:alt-arrow-down-bold-duotone" size={14} color="var(--text-secondary)" style={{ transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: '0.3s', flexShrink: 0 }} />
              </>
            )}
          </button>

          {/* Notifications Button (SECOND) */}
          <button 
            type="button" 
            onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}
            style={{ 
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              width: collapsed ? '36px' : '40px', height: collapsed ? '36px' : '40px', 
              borderRadius: '50%', 
              background: collapsed ? 'transparent' : (unreadActivities > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)'), 
              border: collapsed ? 'none' : (unreadActivities > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.05)'), 
              cursor: 'pointer', color: unreadActivities > 0 ? 'var(--color-primary)' : 'var(--text-primary)', transition: '0.2s', flexShrink: 0 
            }}
            onMouseEnter={e => { e.currentTarget.style.background = collapsed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = collapsed ? 'transparent' : 'rgba(255,255,255,0.03)' }}
          >
            <Icon icon="solar:bell-bing-bold-duotone" size={20} />
            {unreadActivities > 0 && (
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-tertiary)' }}>
                {unreadActivities > 9 ? '9+' : unreadActivities}
              </div>
            )}
          </button>
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifMenu && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: collapsed ? '60px' : '16px', background: '#1c1c1c', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '8px', zIndex: 100, animation: 'fadeInUp 0.2s ease-out', width: '260px' }}>
            <div style={{ padding: '16px 16px 8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Notificaciones</h3>
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/actividades')}>Ver todo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {unreadActivities === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No hay notificaciones nuevas</div>
              ) : (
                <button 
                  onClick={() => { setShowNotifMenu(false); navigate('/actividades'); }}
                  style={{ display: 'block', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontWeight: '600' }}>
                    <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon icon="solar:bell-bing-bold-duotone" size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px' }}>{unreadActivities} {unreadActivities === 1 ? 'Nueva Actividad' : 'Nuevas Actividades'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>Toca para revisar</div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* USER DROPDOWN (Matched to reference) */}
        {showUserMenu && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: collapsed ? '60px' : '16px', background: '#1c1c1c', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '8px', zIndex: 100, animation: 'fadeInUp 0.2s ease-out', width: '240px' }}>
            
            {/* Header / Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 16px 16px', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Usuario'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user?.oficina || user?.role || 'usuario@dashq.com'}</span>
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: '0.2s', fontSize: '13px', fontWeight: 500, width: '100%' }} 
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'} 
                onClick={() => { setShowUserMenu(false); navigate('/settings'); window.dispatchEvent(new CustomEvent('changeSettingsTab', { detail: { tab: 'profile' } })); }}
              >
                <Icon icon="solar:user-bold-duotone" size={18} color="var(--text-secondary)" />
                Mi Cuenta
              </button>
              
              {user?.role === 'Administrador' && (
                <button 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: '0.2s', fontSize: '13px', fontWeight: 500, width: '100%' }} 
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'} 
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); window.dispatchEvent(new CustomEvent('changeSettingsTab', { detail: { tab: 'users' } })); }}
                >
                  <Icon icon="solar:users-group-two-rounded-bold-duotone" size={18} color="var(--text-secondary)" />
                  Gestionar Usuarios
                </button>
              )}
              
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: '0.2s', fontSize: '13px', fontWeight: 500, width: '100%' }} 
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'} 
                onClick={() => { setShowUserMenu(false); navigate('/settings'); window.dispatchEvent(new CustomEvent('changeSettingsTab', { detail: { tab: 'alerts' } })); }}
              >
                <Icon icon="solar:bell-bold-duotone" size={18} color="var(--text-secondary)" />
                Configurar Alertas
              </button>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
              
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: '0.2s', fontSize: '13px', fontWeight: 500, width: '100%' }} 
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'} 
                onClick={() => { setShowUserMenu(false); navigate('/settings'); window.dispatchEvent(new CustomEvent('changeSettingsTab', { detail: { tab: 'info' } })); }}
              >
                <Icon icon="solar:question-circle-bold-duotone" size={18} color="var(--text-secondary)" />
                Soporte Técnico
              </button>
            </div>

            {/* Logout Button */}
            <div style={{ padding: '8px', marginTop: '8px' }}>
              <button onClick={logout} style={{ width: '100%', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onMouseEnter={e => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                Cerrar Sesión
              </button>
            </div>
            
          </div>
        )}
      </div>
    </aside>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';
  const isEditorPage = location.pathname === '/editor';
  const isSharePage = location.pathname.startsWith('/share/');

  return (
    <div className={`app-container ${isAuthPage || isEditorPage || isSharePage ? 'auth-layout' : ''}`}>
      {!isAuthPage && !isEditorPage && !isSharePage && <Sidebar />}
      <main className={`main-content ${isAuthPage || isEditorPage || isSharePage ? 'auth-main' : ''}`} style={isEditorPage || isSharePage ? { padding: 0, overflow: 'hidden' } : { padding: '16px' }}>
        <div style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!isAuthPage && !isSharePage && <OnboardingModal />}
          {children}
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute({ children, pageKey }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (pageKey) {
    let hasAccess = true;
    if (user && user.role !== 'Administrador') {
      if (user.pageAccess) {
        hasAccess = user.pageAccess[pageKey] === true;
      }
    }
    
    if (!hasAccess) {
      const pa = user.pageAccess || {};
      if (pa.dashboard === true && pageKey !== 'dashboard') return <Navigate to="/" replace />;
      if (pa.gestor === true && pageKey !== 'gestor') return <Navigate to="/gestor" replace />;
      if (pa.biblioteca === true && pageKey !== 'biblioteca') return <Navigate to="/library" replace />;
      if (pa.calendario === true && pageKey !== 'calendario') return <Navigate to="/calendar" replace />;
      if (pa.checklist === true && pageKey !== 'checklist') return <Navigate to="/checklist" replace />;
      if (pa.actividades === true && pageKey !== 'actividades') return <Navigate to="/actividades" replace />;
      if (pa.reportes === true && pageKey !== 'reportes') return <Navigate to="/reporte-vista" replace />;
      if (pa.ajustes === true && pageKey !== 'ajustes') return <Navigate to="/settings" replace />;
      
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

function App() {
  React.useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      Promise.race([
        document.fonts.ready,
        new Promise(r => setTimeout(r, 3000))
      ]).then(() => {
        setTimeout(() => {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 500);
        }, 300);
      });
    }
  }, []);

  const location = useLocation();

  return (
    <AuthProvider>
      <ToastProvider>
        <FileProvider>
          <CommandPalette />
          <AppLayout>
            <AnimatePresence mode="wait">
              <Suspense fallback={<PageLoader />}>
                <Routes location={location} key={location.pathname}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<ProtectedRoute pageKey="dashboard"><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/gestor" element={<ProtectedRoute pageKey="gestor"><ErrorBoundary><PageTransition><GestorPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/editor" element={<ProtectedRoute><ErrorBoundary><PageTransition><EditorPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/library" element={<ProtectedRoute pageKey="biblioteca"><ErrorBoundary><PageTransition><LibraryPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><ErrorBoundary><PageTransition><ChatPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute pageKey="ajustes"><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/reporte-vista" element={<ProtectedRoute pageKey="reportes"><PageTransition><ReportsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute pageKey="calendario"><ErrorBoundary><PageTransition><CalendarPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/checklist" element={<ProtectedRoute pageKey="checklist"><ErrorBoundary><PageTransition><ChecklistPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/actividades" element={<ProtectedRoute pageKey="actividades"><ErrorBoundary><PageTransition><ActivityPage /></PageTransition></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/share/:token" element={<PageTransition><SharePage /></PageTransition>} />
                  <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </AppLayout>
        </FileProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
