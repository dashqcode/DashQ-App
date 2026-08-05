
const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/Tel[^\x00-\x7F]*fono/g, 'Teléfono');
c = c.replace(/tel[^\x00-\x7F]*fono/g, 'teléfono');
c = c.replace(/Contrase[^\x00-\x7F]*a/g, 'Contraseña');
c = c.replace(/contrase[^\x00-\x7F]*a/g, 'contraseña');
c = c.replace(/P[^\x00-\x7F]*rez/g, 'Pérez');
c = c.replace(/A[^\x00-\x7F]*ade/g, 'Añade');
c = c.replace(/acci[^\x00-\x7F]*n/g, 'acción');
c = c.replace(/perder[^\x00-\x7F]*/g, 'perderá'); // Wait, perder* could match too much.
// Safer:
c = c.replace(/perder\uFFFD/g, 'perderá');
c = c.replace(/r\uFFFdpido/g, 'rápido');
c = c.replace(/t\uFFFDnel/g, 'túnel');
c = c.replace(/ignorar\uFFFD/g, 'ignorará');
c = c.replace(/Tel\uFFFDfono/g, 'Teléfono');
c = c.replace(/Contrase\uFFFDa/g, 'Contraseña');
c = c.replace(/contrase\uFFFDa/g, 'contraseña');
c = c.replace(/P\uFFFDrez/g, 'Pérez');
c = c.replace(/A\uFFFDade/g, 'Añade');
c = c.replace(/acci\uFFFDn/g, 'acción');

// Let's also handle the ones Select-String saw as o (\u01ED) or  (\uFFFD)
c = c.replace(/ignorar\u01ED/g, 'ignorará');
c = c.replace(/perder\u01ED/g, 'perderá');
c = c.replace(/r\u01EDpido/g, 'rápido');
c = c.replace(/t\u01EDnel/g, 'túnel');
c = c.replace(/Tel\u01F8fono/g, 'Teléfono'); // ? is \u01F8

fs.writeFileSync(file, c);
console.log('done');

