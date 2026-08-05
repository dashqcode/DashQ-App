const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/A¯ade/g, 'Añade');
c = c.replace(/P\ufffdrez/g, 'Pérez');
c = c.replace(/A\ufffdade/g, 'Añade');
c = c.replace(/TEL\ufffFONO/g, 'TELEFONO');
c = c.replace(/CONTRASE\ufffa DE ACCESO/g, 'CONTRASEÑA DE ACCESO');
c = c.replace(/una contrase\ufffa/g, 'una contraseña');
c = c.replace(/Tesorer\ufffa/g, 'Tesorería');
c = c.replace(/Administraci\ufffn/g, 'Administración');
c = c.replace(/PX\ufffdginas/g, 'Páginas');
c = c.replace(/P[^0x00-0x7F]inas/g, 'Páginas');
c = c.replace(/Configuraci[^0x00-0x7F]n/g, 'Configuración');

// Also just in case replace the literal characters
c = c.replace(/A�ade/g, 'Añade');
c = c.replace(/P�rez/g, 'Pérez');
c = c.replace(/TEL�FONO/g, 'TELÆFONO');
c = c.replace(/CONTRASE�A DE ACCESO/g, 'CONTRASEÑA DE ACCESO');
c = c.replace(/una contrase�a/g, 'una contraseña');
c = c.replace(/Tesorer�a/g, 'Tesorería');
c = c.replace(/Administraci�n/g, 'Administración');
c = c.replace(/P�ginas/g, 'Páginas');
c = c.replace(/Configuraci�n/g, 'Configuración');

fs.writeFileSync(file, c);
console.log('done');