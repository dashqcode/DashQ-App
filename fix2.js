
const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/ignorar. peticiones/g, 'ignorará peticiones');
c = c.replace(/perder. el/g, 'perderá el');
c = c.replace(/Esta acci.n/g, 'Esta acción');

fs.writeFileSync(file, c);
console.log('done');

