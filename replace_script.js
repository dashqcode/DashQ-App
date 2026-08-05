const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "{activeTab === 'users' && (\n            <div style={{ display: \"flex\", flexDirection: \"column\", gap: \"24px\" }}>",
  "{activeTab === 'users' && (\n            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>\n              {!showUserModal ? (\n                <>"
);

c = c.replace(
  "                ))}\n\n              </div>\n            </div>\n          )}",
  "                ))}\n              </div>\n            </>\n          ) : (\n            <>\n              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>\n                <button onClick={() => setShowUserModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>\n                  <Icon icon=\"solar:arrow-left-bold-duotone\" size={20} />\n                </button>\n                <div>\n                  <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>Crear Nuevo Usuario</h2>\n                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Añade a un nuevo miembro del equipo y configura sus permisos.</p>\n                </div>\n              </div>\n            </>\n          )}\n            </div>\n          )}"
);

fs.writeFileSync(file, c);
console.log('done');
