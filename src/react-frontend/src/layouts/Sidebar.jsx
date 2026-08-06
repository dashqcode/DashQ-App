import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notifications = [
    { id: 1, title: 'Nuevo documento', text: 'Se ha subido un nuevo comprobante.', time: '10 min' },
    { id: 2, title: 'Revisión pendiente', text: 'Tienes un archivo pendiente en Tesorería.', time: '1 hr' },
    { id: 3, title: 'Actualización', text: 'El sistema ha sido actualizado con éxito.', time: '2 hrs' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <img src="/logo.svg" alt="DashQ" className="brand-logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        </div>
        <h2>DashQ</h2>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-section">
          <span className="section-title">PRINCIPAL</span>
          <ul>
            <li className={`menu-item ${path.startsWith('/dashboard') ? 'active' : ''}`} data-tooltip="Dashboard">
              <Link to="/dashboard">
                <Icon icon="solar:pie-chart-bold-duotone" size={22} />
                <span>Dashboard</span>
              </Link>
            </li>
            <li className={`menu-item ${path.startsWith('/gestor') ? 'active' : ''}`} data-tooltip="Gestor de Archivos">
              <Link to="/gestor">
                <Icon icon="solar:folder-with-files-bold-duotone" size={22} />
                <span>Gestor de Archivos</span>
              </Link>
            </li>
            <li className={`menu-item ${path.startsWith('/settings') ? 'active' : ''}`} data-tooltip="Configuración">
              <Link to="/settings">
                <Icon icon="solar:settings-bold-duotone" size={22} />
                <span>Configuración</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '16px', position: 'relative' }} ref={menuRef}>
        
        {/* NEW USER MENU TRIGGER (Reference matched) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Notifications Button */}
          <button 
            type="button" 
            onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: showNotifMenu ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: '0.2s' }}
            onMouseEnter={e => { if(!showNotifMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if(!showNotifMenu) e.currentTarget.style.background = 'transparent' }}
          >
            <Icon icon="solar:letter-bold-duotone" size={20} />
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px var(--bg-tertiary)' }}>
              3
            </div>
          </button>

          {/* User Profile Button */}
          <button 
            type="button" 
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px 4px 4px', background: showUserMenu ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '100px', border: 'none', cursor: 'pointer', transition: '0.2s' }}
            onMouseEnter={e => { if(!showUserMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if(!showUserMenu) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
              {user?.name ? user.name.split(' ')[0] : 'Usuario'}
            </span>
            <Icon icon="solar:alt-arrow-down-bold-duotone" size={14} color="var(--text-secondary)" style={{ transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
          </button>
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifMenu && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '16px', right: '16px', background: '#1c1c1c', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '8px', zIndex: 100, animation: 'fadeInUp 0.2s ease-out', width: '260px' }}>
            <div style={{ padding: '16px 16px 8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Notificaciones</h3>
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>Marcar leídas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '16px', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '6px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.time}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USER DROPDOWN (Matched to reference) */}
        {showUserMenu && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '16px', right: '16px', background: '#1c1c1c', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', padding: '8px', zIndex: 100, animation: 'fadeInUp 0.2s ease-out', width: '240px' }}>
            
            {/* Header / Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 16px 16px', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Usuario'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user?.email || 'usuario@dashq.com'}</span>
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
              <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', textDecoration: 'none', transition: '0.2s', fontSize: '13px', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setShowUserMenu(false)}>
                <Icon icon="solar:user-bold-duotone" size={18} color="var(--text-secondary)" />
                Mi Cuenta
              </Link>
              <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', textDecoration: 'none', transition: '0.2s', fontSize: '13px', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setShowUserMenu(false)}>
                <Icon icon="solar:users-group-two-rounded-bold-duotone" size={18} color="var(--text-secondary)" />
                Gestionar Usuarios
              </Link>
              <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: '0.2s', fontSize: '13px', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setShowUserMenu(false)}>
                <Icon icon="solar:bell-bold-duotone" size={18} color="var(--text-secondary)" />
                Configurar Alertas
              </button>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
              
              <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: '0.2s', fontSize: '13px', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setShowUserMenu(false)}>
                <Icon icon="solar:question-circle-bold-duotone" size={18} color="var(--text-secondary)" />
                Soporte Técnico
              </button>
            </div>

            {/* Logout Button */}
            <div style={{ padding: '8px', marginTop: '8px' }}>
              <button onClick={handleLogout} style={{ width: '100%', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onMouseEnter={e => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                Cerrar Sesión
              </button>
            </div>
            
          </div>
        )}

      </div>
    </aside>
  );
}

export default Sidebar;
