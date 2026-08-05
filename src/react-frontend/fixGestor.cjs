const fs = require("fs");
const filePath = "c:/Users/alexs/Documents/FILE/src/react-frontend/src/pages/GestorPage.jsx";
let c = fs.readFileSync(filePath, "utf8");

// 1. Replace getFileIconInfo to use iconify icon strings instead of React components
c = c.replace(
`const getFileIconInfo = (name = '') => {
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
};`,
`const getFileIconInfo = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                          return { icon: 'solar:document-bold-duotone',      color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return { icon: 'solar:gallery-bold-duotone',       color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
  if (['doc','docx'].includes(ext))                   return { icon: 'solar:document-text-bold-duotone', color: '#2563eb', bg: 'rgba(37,99,235,0.15)' };
  if (['xls','xlsx'].includes(ext))                   return { icon: 'solar:document-bold-duotone',      color: '#16a34a', bg: 'rgba(22,163,74,0.15)' };
  if (['zip','rar','7z'].includes(ext))               return { icon: 'solar:archive-bold-duotone',       color: '#d97706', bg: 'rgba(217,119,6,0.15)' };
  if (['mp4','avi','mov','mkv'].includes(ext))        return { icon: 'solar:video-frame-bold-duotone',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };
  if (['mp3','wav','flac','ogg'].includes(ext))       return { icon: 'solar:music-note-2-bold-duotone',  color: '#ec4899', bg: 'rgba(236,72,153,0.15)' };
  if (['txt','csv'].includes(ext))                    return { icon: 'solar:document-text-bold-duotone', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
  return { icon: 'solar:file-bold-duotone', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
};`
);
console.log("Fixed getFileIconInfo");

// 2. Fix GetFileIcon helper
c = c.replace(
`const GetFileIcon = ({ name, size = 20 }) => {
  const info = getFileIconInfo(name);
  return <info.Icon size={size} color={info.color} />;
};`,
`const GetFileIcon = ({ name, size = 20 }) => {
  const info = getFileIconInfo(name);
  return <iconify-icon icon={info.icon} width={size} style={{color: info.color}}></iconify-icon>;
};`
);
console.log("Fixed GetFileIcon");

// 3. Fix sidebar nav items using Icon: FolderBoldDuotone etc
c = c.replace(`{ key: 'mis-archivos', Icon: FolderBoldDuotone,                 label: 'Mis Archivos' },`, `{ key: 'mis-archivos', icon: 'solar:folder-bold-duotone',               label: 'Mis Archivos' },`);
c = c.replace(`{ key: 'compartidos',  Icon: ShareBoldDuotone,                  label: 'Compartidos' },`, `{ key: 'compartidos',  icon: 'solar:share-bold-duotone',                label: 'Compartidos' },`);
c = c.replace(`{ key: 'destacados',   Icon: StarBoldDuotone,                   label: 'Destacados' },`, `{ key: 'destacados',   icon: 'solar:star-bold-duotone',                 label: 'Destacados' },`);
c = c.replace(`{ key: 'papelera',     Icon: TrashBinMinimalisticBoldDuotone,   label: 'Papelera', badge: trashCount },`, `{ key: 'papelera',     icon: 'solar:trash-bin-minimalistic-bold-duotone', label: 'Papelera', badge: trashCount },`);
console.log("Fixed nav items");

// 4. Fix the nav map to use icon string instead of Icon component
c = c.replace(
  `].map(({ key, Icon, label, badge }) => (
              <button
                key={key}
                className={\`gestor-nav-item \${activeTab === key ? 'active' : ''}\`}
                onClick={() => handleTabClick(key)}
              >
                <Icon size={20} color={key === 'papelera' ? '#ef4444' : 'currentColor'} />`,
  `].map(({ key, icon, label, badge }) => (
              <button
                key={key}
                className={\`gestor-nav-item \${activeTab === key ? 'active' : ''}\`}
                onClick={() => handleTabClick(key)}
              >
                <iconify-icon icon={icon} width="20" style={{color: key === 'papelera' ? '#ef4444' : 'currentColor'}}></iconify-icon>`
);
console.log("Fixed nav map");

// 5. Fix folder iconInfo objects in render
c = c.replace(/\{ Icon: FolderBoldDuotone, color: '#fbbf24', bg: 'rgba\(251,191,36,0\.15\)' \}/g, "{ icon: 'solar:folder-bold-duotone', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' }");
c = c.replace(/\{ Icon: FolderBoldDuotone, color: '#fbbf24', bg: 'rgba\(251, 191, 36, 0\.1\)' \}/g, "{ icon: 'solar:folder-bold-duotone', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' }");
c = c.replace(/\{ Icon: FolderBoldDuotone, color: '#fbbf24' \}/g, "{ icon: 'solar:folder-bold-duotone', color: '#fbbf24' }");
console.log("Fixed folder iconInfo objects");

// 6. Replace all <iconInfo.Icon size={N} color={iconInfo.color} /> with iconify-icon
c = c.replace(/<iconInfo\.Icon size=\{(\d+)\} color=\{iconInfo\.color\} \/>/g, '<iconify-icon icon={iconInfo.icon} width="$1" style={{color: iconInfo.color}}></iconify-icon>');
console.log("Fixed iconInfo.Icon usages");

// 7. Fix pinned folders Icon reference
c = c.replace(/<FolderBoldDuotone size=\{20\} color="#fbbf24" \/>/g, '<iconify-icon icon="solar:folder-bold-duotone" width="20" style={{color:"#fbbf24"}}></iconify-icon>');
console.log("Fixed pinned folder icons");

fs.writeFileSync(filePath, c, "utf8");
console.log("Done!");
