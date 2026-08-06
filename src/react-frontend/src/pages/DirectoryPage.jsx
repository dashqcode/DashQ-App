import React, { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import UniversalSearch from '../components/ui/UniversalSearch';

function DirectoryPage() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashq_users_list');
      if (stored) {
        setUsers(JSON.parse(stored));
      }
    } catch (e) {
      console.warn(e);
    }
    setLoading(false);
  }, []);

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.oficina && u.oficina.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="view-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', flex: 1, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="title-area">
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Directorio Institucional</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Encuentra y contacta rápidamente a cualquier miembro de la institución.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <UniversalSearch
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
            placeholder="Buscar por nombre, área o cargo..."
            style={{ width: '320px', margin: 0 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-muted)' }}>
          <Icon icon="solar:refresh-bold-duotone" size={24} className="spin" />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Icon icon="solar:users-group-rounded-bold-duotone" size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ margin: 0, fontSize: '15px' }}>No se encontraron contactos que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredUsers.map((user, idx) => (
                <div key={idx} style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '24px', 
                  padding: '24px', 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255,255,255,0.02))';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                >
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', 
                    background: 'linear-gradient(135deg, var(--color-primary), #818cf8)', 
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '24px', fontWeight: 'bold', flexShrink: 0 
                  }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name || 'Sin Nombre'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                      <Icon icon="solar:buildings-bold-duotone" size={14} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.oficina || 'Sin Área'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <Icon icon="solar:user-id-bold-duotone" size={14} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role || 'Usuario'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                      <div style={{ 
                        background: user.status === 'Activo' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        color: user.status === 'Activo' ? '#22c55e' : '#ef4444', 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.status === 'Activo' ? '#22c55e' : '#ef4444' }} />
                        {user.status || 'Activo'}
                      </div>
                      
                      <button style={{ 
                        background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer',
                        marginLeft: 'auto'
                      }} title="Enviar Mensaje">
                        <Icon icon="solar:chat-round-dots-bold-duotone" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DirectoryPage;
