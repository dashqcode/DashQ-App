const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'electron-app', 'package.json');
let content = fs.readFileSync(file, 'utf8');

// Replace local generic provider with github provider
content = content.replace(/"publish":\s*\{\s*"provider":\s*"generic",\s*"url":\s*"[^"]+"\s*\}/g, 
`"publish": {
      "provider": "github",
      "owner": "dashqcode",
      "repo": "DashQ-App"
    }`);

fs.writeFileSync(file, content);
console.log('package.json updated for GitHub Releases (Bóveda oculta)');
