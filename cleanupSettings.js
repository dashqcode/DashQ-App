const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'SettingsPage.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \[isUpdating, setIsUpdating\] = useState\(false\);\n/g, '');
content = content.replace(/const \[updateProgress, setUpdateProgress\] = useState\(''\);\n/g, '');
content = content.replace(/const \[updateResult, setUpdateResult\] = useState\(null\); \/\/ \{ type: 'success'\|'error', msg \}\n/g, '');
content = content.replace(/const \[isDragOver, setIsDragOver\] = useState\(false\);\n/g, '');
content = content.replace(/const updateFileRef = useRef\(null\);\n/g, '');

content = content.replace(/const \[targetIp, setTargetIp\] = useState\(''\);\n/g, '');
content = content.replace(/const \[isPushing, setIsPushing\] = useState\(false\);\n/g, '');

content = content.replace(/const handlePushUpdate = async \(\) => {[\s\S]*?setIsPushing\(false\);\n  };\n/g, '');
content = content.replace(/const handleDrop = \(e\) => {[\s\S]*?if \(file\) handleUpdate\(file\);\n  };\n/g, '');

fs.writeFileSync(file, content);
console.log('Removed unused variables from SettingsPage.jsx');
