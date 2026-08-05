const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

const mapStr1 = '].map(page => (';
const newMapStr1 = `].map(page => {
  const isChecked = newUser.pageAccess?.[page.key] ?? false;
  return (
    <div key={page.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setNewUser({ ...newUser, pageAccess: { ...(newUser.pageAccess || {}), [page.key]: !isChecked } })}>
      <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: '0.3s', flexShrink: 0 }}>
        <div style=${{ position: 'absolute', top: '2px', left: isChecked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{page.label}</span>
    </div>
  );
})`;
const oldBody1Regex = /\]\.map\(page => \([\s\S]*0<\/label>\s*\)\)\}/;
c = c.replace(oldBody1Regex, newMapStr1);

const newMapStr2 = `].map(perm => {
  const isChecked = newUser.permissions?.[perm.key] ?? false;
  return (
    <div key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setNewUser({ ...newUser, permissions: { ...(newUser.permissions || {}), [perm.key]: !isChecked } })}>
      <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '20px', background: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', transition: '0.3s', flexShrink: 0 }}>
        <div style=${{ position: 'absolute', top: '2px', left: isChecked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: isChecked ? '#111' : '#888', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', transition: '0.3s', fontWeight: isChecked ? 600 : 400 }}>{perm.label}</span>
    </div>
  );
})`;
const oldBody2Regex = /\]\.map\(perm => \([\s\S]*0<\/label>\s*\)\)\}/;
c = c.replace(oldBody2Regex, newMapStr2);

const selectAll1 = /<label style=\{\{\s*display:\s*['\"]flex['\"],\s*alignItems:\s*['\"]center['\"],\s*gap:\s*['\"]6px['\"],\s*fontSize:\s*['\"]11px['\"],\s*color:\s*['\"]var\(--color-primary\)['\"],\s*cursor:\s*['\"]pointer['\"],\s*fontWeight:\s*600\s*\}\}>\s*<input\s*type=['\"]checkbox['\"][\s\S]*?Seleccionar Todo\s*<\/label>/;
const newSelectAll1 = `<button type="button" onClick={() => { const isAll = Object.values(newUser.pageAccess || {}).every(Boolean); const val = !isAll; setNewUser({ ...newUser, pageAccess: { dashboard: val, gestor: val, checklist: val, calendario: val, biblioteca: val, reportes: val, actividades: val, ajustes: val } }); }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{Object.values(newUser.pageAccess || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}</button>`;
c = c.replace(selectAll1, newSelectAll1);

const selectAll2 = /<label style=\{\{\s*display:\s*['\"]flex['\"],\s*alignItems:\s*['\"]center['\"],\s*gap:\s*['\"]6px['\"],\s*fontSize:\s*['\"]11px['\"],\s*color:\s*['\"]var\(--color-primary\)['\"],\s*cursor:\s*['\"]pointer['t"],\s*fontWeight:\s*600\s\*\}\}>\s*<input\s*type=['\"]checkbox['\"][\s\S]*?Seleccionar Todo\s*<\/label>/;
const newSelectAll2 = `<button type="button" onClick={() => { const isAll = Object.values(newUser.permissions || {}).every(Boolean); const val = !isAll; setNewUser({ ...newUser, permissions: { read: val, write: val, rename: val, copy: val, move: val, tag: val, delete: val, print: val } }); }} style={{ background: 'transparent', border: 'none', fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{Object.values(newUser.permissions || {}).every(Boolean) ? 'Desmarcar Todo' : 'Marcar Todo'}</button>`;
c = c.replace(selectAll2, newSelectAll2);

// Fix encoding issues (pginas, etc)
c = c.replace(/Acceso a P[i\.xFFϠ\\ufffd]+ginas/g, 'Acceso a Páginas');
c = c.replace(/Configuraci[i\.xFFϠ\\ufffd]+n/g, 'Configuración');

fs.writeFileSync(file, c);
console.log('done');