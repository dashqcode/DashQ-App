const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'SettingsPage.jsx');
let content = fs.readFileSync(file, 'utf8');

const target = `          {activeTab === 'info' && (`;

const newTabContent = `          {activeTab === 'alerts' && (
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
                      <div style={{ width: '44px', height: '24px', background: 'var(--color-primary)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', background: '#111', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Alertas por Correo</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Recibe un resumen diario de las actividades.</div>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', left: '2px', width: '20px', height: '20px', background: 'var(--text-secondary)', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#fff', fontSize: '14px' }}>Sonidos de Alerta</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Reproducir un sonido cuando llegue una notificación.</div>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'var(--color-primary)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px', background: '#111', borderRadius: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--color-primary)', color: '#111', fontWeight: 600, fontSize: '13px', cursor: 'pointer', border: 'none' }}>Guardar Preferencias</button>
              </div>
            </div>
          )}

          {activeTab === 'info' && (`;

content = content.replace(target, newTabContent);
fs.writeFileSync(file, content);
console.log('Injected Alerts tab in SettingsPage.jsx');
