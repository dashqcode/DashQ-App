const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'SettingsPage.jsx');
let content = fs.readFileSync(file, 'utf8');

// Replace border-radius for inputs and buttons specifically
// It's mostly inline styles.
// e.g., borderRadius: '12px' -> borderRadius: '30px'
// For inputs:
content = content.replace(/borderRadius:\s*'12px'/g, "borderRadius: '30px'");
// For buttons that might have 8px:
content = content.replace(/borderRadius:\s*'8px'/g, "borderRadius: '30px'");
// For inputs that might have 14px:
content = content.replace(/borderRadius:\s*'14px'/g, "borderRadius: '30px'");
// Let's also make sure we didn't mess up things that shouldn't be 30px, like navBtnStyle.
// Actually, making navBtnStyle 30px is fine (round pills in sidebar).
// The user asked for "botones y input redondooos 30px".

fs.writeFileSync(file, content);
console.log('Updated border-radius to 30px in SettingsPage.jsx');
