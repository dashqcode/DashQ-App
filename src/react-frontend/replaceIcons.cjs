const fs = require("fs");
const path = require("path");

const iconMap = {
  "fa-arrow-left": "ArrowLeftBoldDuotone",
  "fa-arrow-right": "ArrowRightBoldDuotone",
  "fa-arrow-right-from-bracket": "Logout2BoldDuotone",
  "fa-arrow-right-to-bracket": "Login2BoldDuotone",
  "fa-arrow-turn-down": "SquareBottomDownBoldDuotone",
  "fa-arrow-down-a-z": "SortByAlphabetBoldDuotone",
  "fa-book-open": "BookBoldDuotone",
  "fa-box-archive": "ArchiveBoldDuotone",
  "fa-camera": "CameraBoldDuotone",
  "fa-cart-plus": "CartPlusBoldDuotone",
  "fa-chart-pie": "PieChartBoldDuotone",
  "fa-check": "CheckSquareBoldDuotone",
  "fa-check-circle": "CheckCircleBoldDuotone",
  "fa-circle-check": "CheckCircleBoldDuotone",
  "fa-chevron-down": "AltArrowDownBoldDuotone",
  "fa-chevron-left": "AltArrowLeftBoldDuotone",
  "fa-chevron-right": "AltArrowRightBoldDuotone",
  "fa-chevron-up": "AltArrowUpBoldDuotone",
  "fa-circle-info": "InfoCircleBoldDuotone",
  "fa-circle-notch": "RefreshBoldDuotone",
  "fa-circle-xmark": "CloseCircleBoldDuotone",
  "fa-clock": "ClockCircleBoldDuotone",
  "fa-clock-rotate-left": "HistoryBoldDuotone",
  "fa-cloud-arrow-up": "CloudUploadBoldDuotone",
  "fa-copy": "CopyBoldDuotone",
  "fa-database": "ServerPathBoldDuotone",
  "fa-download": "DownloadBoldDuotone",
  "fa-earth-americas": "GlobalBoldDuotone",
  "fa-ellipsis": "MenuDotsBoldDuotone",
  "fa-envelope": "LetterBoldDuotone",
  "fa-envelope-open-text": "LetterOpenedBoldDuotone",
  "fa-eye": "EyeBoldDuotone",
  "fa-eye-slash": "EyeClosedBoldDuotone",
  "fa-file": "DocumentBoldDuotone",
  "fa-file-arrow-up": "UploadSquareBoldDuotone",
  "fa-file-circle-question": "QuestionSquareBoldDuotone",
  "fa-file-excel": "DocumentTextBoldDuotone",
  "fa-file-export": "ExportBoldDuotone",
  "fa-file-image": "GalleryBoldDuotone",
  "fa-file-invoice": "BillListBoldDuotone",
  "fa-file-lines": "DocumentTextBoldDuotone",
  "fa-file-pdf": "DocumentBoldDuotone",
  "fa-file-word": "DocumentTextBoldDuotone",
  "fa-file-zipper": "ArchiveBoldDuotone",
  "fa-floppy-disk": "DisketteBoldDuotone",
  "fa-folder": "FolderBoldDuotone",
  "fa-folder-open": "FolderOpenBoldDuotone",
  "fa-folder-plus": "AddFolderBoldDuotone",
  "fa-folder-tree": "FolderWithFilesBoldDuotone",
  "fa-gear": "SettingsBoldDuotone",
  "fa-google-drive": "CloudBoldDuotone",
  "fa-grip-vertical": "ReorderBoldDuotone",
  "fa-handshake": "HandShakeBoldDuotone",
  "fa-hard-drive": "ServerSquareBoldDuotone",
  "fa-home": "HomeAngleBoldDuotone",
  "fa-id-card": "IdCardBoldDuotone",
  "fa-image": "GalleryBoldDuotone",
  "fa-layer-group": "LayersBoldDuotone",
  "fa-lightbulb": "LightbulbBoldDuotone",
  "fa-list": "ListBoldDuotone",
  "fa-lock": "LockBoldDuotone",
  "fa-magnifying-glass": "MagniferBoldDuotone",
  "fa-microchip": "CpuBoldDuotone",
  "fa-minus": "MinusCircleBoldDuotone",
  "fa-music": "MusicNotesBoldDuotone",
  "fa-note-sticky": "NotesBoldDuotone",
  "fa-paperclip": "PaperclipBoldDuotone",
  "fa-pen": "PenBoldDuotone",
  "fa-pencil": "PenBoldDuotone",
  "fa-plus": "AddCircleBoldDuotone",
  "fa-print": "PrinterBoldDuotone",
  "fa-rotate": "RefreshBoldDuotone",
  "fa-rotate-right": "RefreshBoldDuotone",
  "fa-server": "ServerMinimalisticBoldDuotone",
  "fa-share-nodes": "ShareBoldDuotone",
  "fa-shield-halved": "ShieldWarningBoldDuotone",
  "fa-spinner": "RefreshCircleBoldDuotone",
  "fa-star": "StarBoldDuotone",
  "fa-table-cells-large": "Widget3BoldDuotone",
  "fa-thumbtack": "PinBoldDuotone",
  "fa-times": "CloseSquareBoldDuotone",
  "fa-trash": "TrashBinMinimalisticBoldDuotone",
  "fa-trash-alt": "TrashBinMinimalisticBoldDuotone",
  "fa-trash-can": "TrashBinMinimalisticBoldDuotone",
  "fa-triangle-exclamation": "DangerTriangleBoldDuotone",
  "fa-user": "UserBoldDuotone",
  "fa-user-group": "UsersGroupTwoRoundedBoldDuotone",
  "fa-user-plus": "UserPlusRoundedBoldDuotone",
  "fa-users-gear": "UsersGroupRoundedBoldDuotone",
  "fa-xmark": "CloseSquareBoldDuotone"
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith(".jsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("c:/Users/alexs/Documents/FILE/src/react-frontend/src");

files.forEach(f => {
  let content = fs.readFileSync(f, "utf8");
  let modified = false;
  let importedIcons = new Set();
  
  // Find already imported icons from solar-icon-set to not double import
  const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]solar-icon-set['"]/);
  if (importMatch) {
    importMatch[1].split(",").forEach(i => importedIcons.add(i.trim()));
  }

  // Regex to match <i className="fa-solid fa-[name]" ...></i>
  const faRegex = /<i\s+className=["']([^"']*(?:fa-solid|fa-regular|fa-brands|fas|far|fab)\s+fa-([a-z0-9-]+)[^"']*)["']\s*([^>]*)>(.*?)<\/i>/g;
  
  content = content.replace(faRegex, (match, fullClass, iconName, attributes, innerContent) => {
    let key = "fa-" + iconName;
    let solarIcon = iconMap[key];
    
    if (solarIcon) {
      modified = true;
      importedIcons.add(solarIcon);
      let newTag = `<${solarIcon} ${attributes}`;
      // Add default size if not explicitly styled to be huge
      if (!attributes.includes("fontSize") && !attributes.includes("fa-2x") && !attributes.includes("size=")) {
        newTag += ` size={18}`;
      }
      
      if (innerContent.trim()) {
        newTag += `>${innerContent}</${solarIcon}>`;
      } else {
        newTag += ` />`;
      }
      return newTag;
    }
    return match;
  });

  if (modified) {
    const importStr = `import { ${Array.from(importedIcons).join(", ")} } from 'solar-icon-set';`;
    if (importMatch) {
      content = content.replace(importMatch[0], importStr);
    } else {
      // Find last import
      const lastImportIndex = content.lastIndexOf("import ");
      if (lastImportIndex !== -1) {
        const nextNewline = content.indexOf("\n", lastImportIndex);
        content = content.slice(0, nextNewline + 1) + importStr + "\n" + content.slice(nextNewline + 1);
      } else {
        content = importStr + "\n" + content;
      }
    }
    fs.writeFileSync(f, content, "utf8");
    console.log("Updated: " + path.basename(f));
  }
});
console.log("Done!");
