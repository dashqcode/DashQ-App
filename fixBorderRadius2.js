const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'react-frontend', 'src', 'components', 'CustomSelect.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/borderRadius:\s*'12px'/g, "borderRadius: '30px'");
content = content.replace(/borderRadius:\s*'8px'/g, "borderRadius: '30px'");

fs.writeFileSync(file, content);
console.log('Updated border-radius in CustomSelect.jsx');
