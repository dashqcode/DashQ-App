const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'electron-app', 'package.json');
let content = fs.readFileSync(file, 'utf8');

const targetPublish = `"publish": {
      "provider": "generic",
      "url": "http://127.0.0.1:5000/api/updates"
    }`;

const newPublish = `"publish": {
      "provider": "github",
      "owner": "dashqcode",
      "repo": "DashQ-App"
    }`;

if (content.includes(targetPublish)) {
    content = content.replace(targetPublish, newPublish);
    fs.writeFileSync(file, content);
    console.log('package.json updated for GitHub publish');
} else {
    console.log('Could not find generic publish config to replace');
}
