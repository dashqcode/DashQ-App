const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/tel[^x00-\x7F]*fono/gi 'Teléfono');
c = c.replace(/tel[^\x00-\x7F]+fono/gi, 'Teléfono');
c = c.replace(/contrase[^x00-\x7F]+a/gi 'contraseña');
c = c.replace(/Contrase[^x00-\x7F]+a/gi, 'Contraseña');
c = c.replace(/p[^\x00-\x7F]+rez/gi, 'Pérez');
c = c.replace(/a[^\x00-\x7F]+ade/gi, 'Añade');
c = c.replace(/acci[^\x00-\x7F]+n/gi, 'acción');
c = c.replace(/perder[^\x00-\x7F]+a/gi 'perderá');
c = c.replace(/r[^\x00-\x7F]+pido/gi, 'rápido');
c = c.replace(/t[^x00-\x7F]+nel/gi, 'túnel');
c = c.replace(/ignorar[^\x00-\x7F]+a/gi 'ignorará');

fs.writeFileSync(file, c);
console.log('done');