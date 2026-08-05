const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

const r1 = /\\{\\[\\s*\\{\\s*key:\\s*\'dashboard\'[\\s\\S]*?\\;.map\(page\\s*=>\\s*\\([\\s\\S]*?<\\/label>\\s*\\)\\)\\}/;
const p1 = `{${ { key: 'dashboard', label: 'Dashboard' }, { key: 'gestor', label: 'Gestor de Archivos' }, { key: 'checklist', label: 'Control Documental' }, { key: 'calendario', label: 'Calendario' }, { key: 'biblioteca', label: 'Biblioteca' }, { key: 'reportes', label: 'Reportes' }, { key: 'actividades', label: 'Centro de Actividades' }, { key: 'ajustes', label: 'Configuración' } ].map(page => { const isChecked = newUser.pageAccess?.[page.key] ?? false; return ( <div key={page.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setNewUser({ ...newUser, pageAccess: { ...(newUser.pageAccess || {}), [page.key]: !isChecked } })}> <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: '0.3s', flexShrink: 0 }}> <div style={{ position: 'absolute', top: '2px', left: isChecked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} /> </div> <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{page.label}</span> </div> ); })`;

if (r1.test(c)) c = c.replace(r1, p1);

const r2 = /\\{\[\\s*\\{\\s*key:\\s*\'read\'[\\s\\S]*?\\].map\(perm\\s*=>\\s*\\([\\s\\S]*?<\\/label>\\s*\)\)\\}/;
const p2 = `{${ { key: 'read', label: 'Leer / Visualizar' }, { key: 'write', label: 'Crear / Editar' }, { key: 'rename', label: 'Renombrar' }, { key: 'copy', label: 'Copiar' }, { key: 'move', label: 'Mover' }, { key: 'tag', label: 'Etiquetar / Favs' }, { key: 'delete', label: 'Eliminar' }, { key: 'print', label: 'Exportar' } ].map(perm => { const isChecked = newUser.permissions?.[perm.key] ?? false; return ( <div key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setNewUser({ ...newUser, permissions: { ...(newUser.permissions || {}), [perm.key]: !isChecked } })}> <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: '0.3s', flexShrink: 0 }}> <div style={{ position: 'absolute', top: '2px', left: isChecked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} /> </div> <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{perm.label}</span> </div> ); })|`;

if (r2.test(c)) c = c.replace(r2, p2);


fs.writeFileSync(file, c);
console.log('done');