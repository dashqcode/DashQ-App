const fs = require("fs");

const filePath = "c:/Users/alexs/Documents/FILE/src/react-frontend/src/pages/GestorPage.jsx";
let content = fs.readFileSync(filePath, "utf8");

// Fix the empty state icon (conditional)
const oldEmptyState = `<i className={\`fa-solid \${
                        activeTab === 'compartidos' ? 'fa-user-group' :
                        activeTab === 'destacados' ? 'fa-star' :
                        activeTab === 'papelera' ? 'fa-trash-can' :
                        'fa-folder-open'
                      }\`} style={{ fontSize: '36px', color: 'rgba(255,255,255,0.2)' }}></i>`;
const newEmptyState = `{activeTab === 'compartidos' ? <UsersGroupTwoRoundedBoldDuotone size={36} color="rgba(255,255,255,0.2)" /> :
                       activeTab === 'destacados' ? <StarBoldDuotone size={36} color="rgba(255,255,255,0.2)" /> :
                       activeTab === 'papelera' ? <TrashBinMinimalisticBoldDuotone size={36} color="rgba(255,255,255,0.2)" /> :
                       <FolderOpenBoldDuotone size={36} color="rgba(255,255,255,0.2)" />}`;

if (content.includes(oldEmptyState)) {
  content = content.replace(oldEmptyState, newEmptyState);
  console.log("Fixed empty state icon");
} else {
  console.log("WARNING: empty state icon not matched exactly");
}

// Fix the sort arrow icon
content = content.replace(
  /<i\s+\n\s+className=\{`fa-solid fa-arrow-\$\{isActive && sortOrder === 'desc' \? 'down' : 'up'\}`\}\s+style=\{\{[^}]+\}\}\s+><\/i>/g,
  `{isActive && sortOrder === 'desc' ? <AltArrowDownBoldDuotone size={11} style={{ opacity: isActive ? 1 : 0.15, color: isActive ? 'var(--color-primary)' : 'inherit', transition: 'all 0.2s' }} /> : <AltArrowUpBoldDuotone size={11} style={{ opacity: isActive ? 1 : 0.15, color: isActive ? 'var(--color-primary)' : 'inherit', transition: 'all 0.2s' }} />}`
);

// Fix upload manager chevron
content = content.replace(
  /<i className=\{`fa-solid \$\{isUploadManagerExpanded \? 'fa-chevron-down' : 'fa-chevron-up'\}`\} style=\{\{ fontSize: '16px' \}\}><\/i>/g,
  `{isUploadManagerExpanded ? <AltArrowDownBoldDuotone size={16} /> : <AltArrowUpBoldDuotone size={16} />}`
);

// Fix folder-open in upload success
content = content.replace(
  `<i className="fa-solid fa-folder-open" style={{ color: '#aaa', cursor: 'pointer', fontSize: '16px' }} onClick={() => {`,
  `<FolderOpenBoldDuotone size={16} color="#aaa" style={{ cursor: 'pointer' }} onClick={() => {`
);

// Add AltArrowDownBoldDuotone, AltArrowUpBoldDuotone to imports if not there
const importMatch = content.match(/import \{([^}]+)\} from 'solar-icon-set';/);
if (importMatch) {
  let importedIcons = new Set(importMatch[1].split(',').map(s => s.trim()));
  ['AltArrowDownBoldDuotone', 'AltArrowUpBoldDuotone', 'FolderOpenBoldDuotone', 'VideoFrameBoldDuotone', 'MusicNote2BoldDuotone', 'FileBoldDuotone'].forEach(i => importedIcons.add(i));
  const newImport = `import { ${Array.from(importedIcons).join(', ')} } from 'solar-icon-set';`;
  content = content.replace(importMatch[0], newImport);
  console.log("Updated imports");
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Done!");
