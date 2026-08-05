const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

// Replace Acceta a Páginas label
c = c.replace(
  /<label style=\{\{\s*fontSize:\s*'11px',\s*fontWeight:\s*'600',\s*color:\s*'var\(--text-muted\)',\s*textTransform:\s*'uppercase',\s*letterSpacing:\s*'0\.5px'\s*\}\}>Accet\uFFFD+a a P\uFFFD+ginas<\/label>/g,
  '<label style={{ fontSize: \'11px\', fontWeight: \'600\', color: \'var(--text-muted)\', textTransform: \'uppercase\', letterSpacing: \'0.5px\' }}>Acceso a Páginas</label>'
);
c = c.replace(
  /<label style=\{\{\s*fontSize:\s*'11px',\s*fontWeight:\s*'600',\s*color:\s*'var\(--text-muted\)',\s*textTransform:\s*'uppercase',\s*letterSpacing:\s*'0\.5px'\s*\}\}>Accet[^<]+a a P[^<]+ginas<\/label>/g,
  '<label style={{ fontSize: \'11px\', fontWeight: \'600\', color: \'var(--text-muted)\', textTransform: \'uppercase\', letterSpacing: \'0.5px\' }}>Acceso a Páginas</label>'
);

// We know the exact string for Page Access Grid from previous view_file
const pageGridTarget = `                          {[
                            { key: 'dashboard', label: 'Dashboard' },
                            { key: 'gestor', label: 'Gestor de Archivos' },
                            { key: 'checklist', label: 'Control Documental' },
                            { key: 'calendario', label: 'Calendario' },
                            { key: 'biblioteca', label: 'Biblioteca' },
                            { key: 'reportes', label: 'Reportes' },
                            { key: 'actividades', label: 'Centro de Actividades' },
                            { key: 'ajustes', label: 'Configuración' }
                          ].map(page => (
                            <label key={page.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={newUser.pageAccess?.[page.key] ?? false}
                                onChange={e => setNewUser({ ...newUser, pageAccess: { ...(newUser.pageAccess || {}), [page.key]: e.target.checked } })}
                                style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                              {page.label}
                            </label>
                          ))}`;

const pageGridReplacement = `                          {[
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
                          })}`;

if (c.includes(pageGridTarget)) {
  c = c.replace(pageGridTarget, pageGridReplacement);
} else {
  console.log("Could not find Page Access Grid");
}

// Same for Detailed Permissions Grid
const permGridTarget = `                        {[
                          { key: 'read', label: 'Leer / Visualizar' },
                          { key: 'write', label: 'Crear / Editar' },
                          { key: 'rename', label: 'Renombrar' },
                          { key: 'copy', label: 'Copiar' },
                          { key: 'move', label: 'Mover' },
                          { key: 'tag', label: 'Etiquetar / Favs' },
                          { key: 'delete', label: 'Eliminar' },
                          { key: 'print', label: 'Exportar' }
                        ].map(perm => (
                          <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={newUser.permissions?.[perm.key] || false}
                              onChange={e => setNewUser({ ...newUser, permissions: { ...newUser.permissions, [perm.key]: e.target.checked } })}
                              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                            {perm.label}
                          </label>
                        ))}`;

const permGridReplacement = `                        {[
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
                        })}`;

if (c.includes(permGridTarget)) {
  c = c.replace(permGridTarget, permGridReplacement);
} else {
  console.log("Could not find Permissions Grid");
}

// Select All Buttons
const pageSelectAllRegex = /<label style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'6px',\s*fontSize:\s*'11px',\s*color:\s*'var\(--color-primary\)',\s*cursor:\s*'pointer',\s*fontWeight:\s*600\s*\}\}>\s*<input\s*type="checkbox"\s*checked=\{Object\.values\(newUser\.pageAccess \|\| \{\}\)\.every\(Boolean\)\}\s*onChange=\{e => \{\s*const val = e\.target\.checked;\s*setNewUser\(\{\s*\.\.\.newUser,\s*pageAccess:\s*\{\s*dashboard:\s*val,\s*gestor:\s*val,\s*checklist:\s*val,\s*calendario:\s*val,\s*biblioteca:\s*val,\s*reportes:\s*val,\s*actividades:\s*val,\s*ajustes:\s*val\s*\}\s*\}\);\s*\}\}\s*style=\{\{\s*accentColor:\s*'var\(--color-primary\)',\s*cursor:\s*'pointer',\s*width:\s*'12px',\s*height:\s*'12px'\s*\}\}\s*\/>\s*Seleccionar Todo\s*<\/label>/;

const pageSelectAllReplacement = `<button type="button" onClick={() => {
                          const isAll = Object.values(newUser.pageAccess || {}).every(Boolean);
                          const val = !isAll;
                          setNewUser({ ...newUser, pageAccess: { dashboard: val, gestor: val, checklist: val, calendario: val, biblioteca: val, reportes: val, actividades: val, ajustes: val } });
                        }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {Object.values(newUser.pageAccess || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}
                        </button>`;

if (pageSelectAllRegex.test(c)) {
  c = c.replace(pageSelectAllRegex, pageSelectAllReplacement);
} else {
  console.log("Could not find Page Access Select All");
}


const permSelectAllRegex = /<label style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'6px',\s*fontSize:\s*'11px',\s*color:\s*'var\(--color-primary\)',\s*cursor:\s*'pointer',\s*fontWeight:\s*600\s*\}\}>\s*<input\s*type="checkbox"\s*checked=\{Object\.values\(newUser\.permissions \|\| \{\}\)\.every\(Boolean\)\}\s*onChange=\{e => \{\s*const val = e\.target\.checked;\s*setNewUser\(\{\s*\.\.\.newUser,\s*permissions:\s*\{\s*read:\s*val,\s*write:\s*val,\s*rename:\s*val,\s*copy:\s*val,\s*move:\s*val,\s*tag:\s*val,\s*delete:\s*val,\s*print:\s*val\s*\}\s*\}\);\s*\}\}\s*style=\{\{\s*accentColor:\s*'var\(--color-primary\)',\s*cursor:\s*'pointer',\s*width:\s*'12px',\s*height:\s*'12px'\s*\}\}\s*\/>\s*Seleccionar Todo\s*<\/label>/;

const permSelectAllReplacement = `<button type="button" onClick={() => {
                          const isAll = Object.values(newUser.permissions || {}).every(Boolean);
                          const val = !isAll;
                          setNewUser({ ...newUser, permissions: { read: val, write: val, rename: val, copy: val, move: val, tag: val, delete: val, print: val } });
                        }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {Object.values(newUser.permissions || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}
                        </button>`;

if (permSelectAllRegex.test(c)) {
  c = c.replace(permSelectAllRegex, permSelectAllReplacement);
} else {
  console.log("Could not find Permissions Select All");
}

fs.writeFileSync(file, c);
console.log('done');
