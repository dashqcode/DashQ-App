const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'SettingsPage.jsx');
let content = fs.readFileSync(file, 'utf8');

const target = `      const data = await res.json();
                </div>
                <div>
                  <button style={{ padding: '10px 20px'`;

const replacement = `      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.msg || "Inyección exitosa. El servidor destino se está actualizando.");
      } else {
        alert("Error al inyectar: " + (data.error || "Desconocido"));
      }
    } catch (e) {
      alert("Fallo de conexión: " + e.message);
    }
    setIsPushing(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpdate(file);
  };

  const formatDate = (iso) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Shared card style
  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px', boxShadow: 'none' };
  const navBtnStyle = (key) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: activeTab === key ? 'rgba(255, 255, 255, 0.08)' : 'transparent', border: 'none', borderRadius: '12px', color: activeTab === key ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activeTab === key ? '600' : '500', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', outline: 'none', width: '100%' });

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
                      {/* {user?.name ? user.name.charAt(0).toUpperCase() : 'A'} */}
                      U
                    </div>
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 700 }}>{/* user?.name || 'Administrador' */}Usuario</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>{/* user?.role || 'Administrador del Sistema' */}Rol</p>
                  </div>
                </div>
                <div>
                  <button style={{ padding: '10px 20px'`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed SettingsPage.jsx');
