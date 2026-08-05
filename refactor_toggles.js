const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace encoding issues in this area
content = content.replace(/Acceso a Pginas/g, 'Acceso a Páginas');
content = content.replace(/Configuracin/g, 'Configuración');
content = content.replace(/Tesorera/g, 'Tesorería');
content = content.replace(/Administracin/g, 'Administración');
content = content.replace(/Prez/g, 'Pérez');
content = content.replace(/Telfono/g, 'Teléfono');
content = content.replace(/Contrasea/g, 'Contraseña');
content = content.replace(/Aade/g, 'Añade');

// Replace Page Access Grid
const pageAccessGridRegex = /<div style=\{\{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]1fr 1fr['"],\s*gap:\s*['"]12px['"],\s*background:\s*['"]rgba\(255,255,255,0\.02\)['"],\s*padding:\s*['"]20px['"],\s*borderRadius:\s*['"]16px['"],\s*border:\s*['"]1px solid rgba\(255,255,255,0\.05\)['"]\s*\}\}>[\s\S]*?\}\)\]\.map\(page => \([\s\S]*?<\/[Ll]abel>\s*\)\)\}\s*<\/div>/;

const newPageAccessGrid = \<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                                <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: '0.3s', flexShrink: 0 }}>
                                  <div style={{ position: 'absolute', top: '2px', left: isChecked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                                </div>
                                <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{page.label}</span>
                              </div>
                            );
                          })}
                        </div>\;

content = content.replace(pageAccessGridRegex, newPageAccessGrid);


// Replace Permissions Grid
const permGridRegex = /<div style=\{\{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]1fr 1fr['"],\s*gap:\s*['"]12px['"],\s*background:\s*['"]rgba\(255,255,255,0\.02\)['"],\s*padding:\s*['"]20px['"],\s*borderRadius:\s*['"]16px['"],\s*border:\s*['"]1px solid rgba\(255,255,255,0\.05\)['"]\s*\}\}>[\s\S]*?\}\)\]\.map\(perm => \([\s\S]*?<\/[Ll]abel>\s*\)\)\}\s*<\/div>/;

const newPermGrid = \<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                                <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: '0.3s', flexShrink: 0 }}>
                                  <div style={{ position: 'absolute', top: '2px', left: isChecked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                                </div>
                                <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{perm.label}</span>
                              </div>
                            );
                          })}
                        </div>\;

content = content.replace(permGridRegex, newPermGrid);


// Replace Select All Toggle for Page Access
const selectAllPageAccess = /<label style=\{\{\s*display:\s*['"]flex['"],\s*alignItems:\s*['"]center['"],\s*gap:\s*['"]6px['"],\s*fontSize:\s*['"]11px['"],\s*color:\s*['"]var\(--color-primary\)['"],\s*cursor:\s*['"]pointer['"],\s*fontWeight:\s*600\s*\}\}>[\s\S]*?<\/label>/;

const newSelectAllPageAccess = \<button type="button" onClick={() => {
                              const isAll = Object.values(newUser.pageAccess || {}).every(Boolean);
                              const val = !isAll;
                              setNewUser({ ...newUser, pageAccess: { dashboard: val, gestor: val, checklist: val, calendario: val, biblioteca: val, reportes: val, actividades: val, ajustes: val } });
                            }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {Object.values(newUser.pageAccess || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}
                          </button>\;
                          
content = content.replace(selectAllPageAccess, newSelectAllPageAccess);

// Replace Select All Toggle for Permissions
const newSelectAllPerms = \<button type="button" onClick={() => {
                              const isAll = Object.values(newUser.permissions || {}).every(Boolean);
                              const val = !isAll;
                              setNewUser({ ...newUser, permissions: { read: val, write: val, rename: val, copy: val, move: val, tag: val, delete: val, print: val } });
                            }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {Object.values(newUser.permissions || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}
                          </button>\;
                          
content = content.replace(selectAllPageAccess, newSelectAllPerms);

fs.writeFileSync(file, content);
console.log('done');
