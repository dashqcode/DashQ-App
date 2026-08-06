const fs = require("fs");

const filePath = "c:/Users/alexs/Documents/FILE/src/react-frontend/src/pages/GestorPage.jsx";
let content = fs.readFileSync(filePath, "utf8");

// 1. Replace the getFileIconInfo function to return component names + colors
const oldFn = `const getFileIconInfo = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                          return { icon: 'fa-file-pdf',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return { icon: 'fa-file-image', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
  if (['doc','docx'].includes(ext))                   return { icon: 'fa-file-word',  color: '#2563eb', bg: 'rgba(37,99,235,0.15)' };
  if (['xls','xlsx'].includes(ext))                   return { icon: 'fa-file-excel', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' };
  if (['zip','rar','7z'].includes(ext))               return { icon: 'fa-file-zipper',color: '#d97706', bg: 'rgba(217,119,6,0.15)' };
  return { icon: 'fa-file-lines', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
};`;

const newFn = `const getFileIconInfo = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                          return { Icon: DocumentBoldDuotone,      color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return { Icon: GalleryBoldDuotone,       color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
  if (['doc','docx'].includes(ext))                   return { Icon: DocumentTextBoldDuotone,  color: '#2563eb', bg: 'rgba(37,99,235,0.15)' };
  if (['xls','xlsx'].includes(ext))                   return { Icon: DocumentBoldDuotone,      color: '#16a34a', bg: 'rgba(22,163,74,0.15)' };
  if (['zip','rar','7z'].includes(ext))               return { Icon: ArchiveBoldDuotone,       color: '#d97706', bg: 'rgba(217,119,6,0.15)' };
  if (['mp4','avi','mov','mkv'].includes(ext))        return { Icon: VideoFrameBoldDuotone,    color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };
  if (['mp3','wav','flac','ogg'].includes(ext))       return { Icon: MusicNote2BoldDuotone,    color: '#ec4899', bg: 'rgba(236,72,153,0.15)' };
  if (['txt','csv'].includes(ext))                    return { Icon: DocumentTextBoldDuotone,  color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
  return { Icon: FileBoldDuotone, color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
};`;

if (content.includes(oldFn)) {
  content = content.replace(oldFn, newFn);
  console.log("Replaced getFileIconInfo function");
} else {
  console.log("WARNING: getFileIconInfo not found exactly - trying partial match");
}

// 2. Replace folder iconInfo objects
content = content.replace(
  /\{ icon: 'fa-folder', color: '#fbbf24', bg: 'rgba\(251,191,36,0\.15\)' \}/g,
  "{ Icon: FolderBoldDuotone, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' }"
);
content = content.replace(
  /\{ icon: 'fa-folder', color: '#fbbf24', bg: 'rgba\(251, 191, 36, 0\.1\)' \}/g,
  "{ Icon: FolderBoldDuotone, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' }"
);
content = content.replace(
  /\{ icon: 'fa-folder', color: '#fbbf24' \}/g,
  "{ Icon: FolderBoldDuotone, color: '#fbbf24' }"
);
console.log("Replaced folder iconInfo objects");

// 3. Replace all usages of iconInfo.icon in fa-solid className pattern
// Pattern: <i className={`fa-solid ${iconInfo.icon}`} style={{ color: iconInfo.color, fontSize: 'Xpx' }}></i>
content = content.replace(
  /<i\s+className=\{`fa-solid \$\{iconInfo\.icon\}`\}\s+style=\{\{([^}]+)\}\}><\/i>/g,
  (match, styleContent) => {
    return `<iconInfo.Icon ${styleContent.includes('fontSize') ? 'size={' + (styleContent.match(/fontSize:\s*'(\d+)px'/) ? styleContent.match(/fontSize:\s*'(\d+)px'/)[1] : '24') + '}' : 'size={24}'} color={iconInfo.color} />`;
  }
);
console.log("Replaced iconInfo.icon usages");

// 4. Replace getFileIconInfo(item.name).icon usages
content = content.replace(
  /<i\s+className=\{`fa-solid \$\{getFileIconInfo\(item\.name\)\.icon\}`\}\s+style=\{\{([^}]+)\}\}><\/i>/g,
  (match, styleContent) => {
    const sizeMatch = styleContent.match(/fontSize:\s*'(\d+)px'/);
    const size = sizeMatch ? sizeMatch[1] : '20';
    return `<GetFileIcon name={item.name} size={${size}} />`;
  }
);

// Add helper component before the main component
const helperComponent = `
const GetFileIcon = ({ name, size = 20 }) => {
  const info = getFileIconInfo(name);
  return <info.Icon size={size} color={info.color} />;
};
`;
// Insert it after the getFileIconInfo function definition
content = content.replace(
  newFn,
  newFn + "\n" + helperComponent
);

console.log("Added GetFileIcon helper component");

// 5. Add VideoFrameBoldDuotone, MusicNote2BoldDuotone, FileBoldDuotone to imports
const importMatch = content.match(/import \{([^}]+)\} from 'solar-icon-set';/);
if (importMatch) {
  let importedIcons = new Set(importMatch[1].split(',').map(s => s.trim()));
  ['VideoFrameBoldDuotone', 'MusicNote2BoldDuotone', 'FileBoldDuotone'].forEach(i => importedIcons.add(i));
  const newImport = `import { ${Array.from(importedIcons).join(', ')} } from 'solar-icon-set';`;
  content = content.replace(importMatch[0], newImport);
  console.log("Updated imports");
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Done!");
