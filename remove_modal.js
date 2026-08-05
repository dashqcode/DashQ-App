const fs = require('fs');
const file = 'src/react-frontend/src/pages/SettingsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const modalStart = content.indexOf("{/* User Creation Modal */");
if(modalStart !== -1) {
  const modalEnd = content.indexOf("{/* MODAL ELIMINAR USUARIO */", modalStart);
  if(modalEnd !== -1) {
    content = content.substring(0, modalStart) + content.substring(modalEnd);
    fs.writeFileSync(file, content);
    console.log('done');
  } else {
    console.log('could not find modal end');
  }
} else {
  console.log('could not find modal start');
}
