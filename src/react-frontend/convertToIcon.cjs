const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith(".jsx") && !file.includes("Icon.jsx")) results.push(file);
  });
  return results;
}

const SRC = "c:/Users/alexs/Documents/FILE/src/react-frontend/src";
const files = walk(SRC);
let totalFixed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, "utf8");
  if (!content.includes("<iconify-icon")) return;

  let modified = false;

  // Replace <iconify-icon icon="X" width="N" style={{...}} onClick={...}></iconify-icon>
  // and <iconify-icon icon={X} width="N" style={{...}}></iconify-icon>
  // with <Icon icon="X" size={N} ... />
  content = content.replace(
    /<iconify-icon((?:[^>]|\n)*?)><\/iconify-icon>/g,
    (match, attrs) => {
      totalFixed++;
      modified = true;

      // Extract icon
      const iconMatch = attrs.match(/\bicon=(?:"([^"]+)"|'([^']+)'|\{([^}]+)\})/);
      const iconVal = iconMatch ? (iconMatch[1] || iconMatch[2] || iconMatch[3]) : '""';
      const iconStr = (iconMatch && (iconMatch[1] || iconMatch[2])) ? `"${iconMatch[1] || iconMatch[2]}"` : `{${iconVal}}`;

      // Extract width
      const widthMatch = attrs.match(/\bwidth=(?:"(\d+)"|'(\d+)'|\{(\d+)\})/);
      const width = widthMatch ? (widthMatch[1] || widthMatch[2] || widthMatch[3]) : '20';

      // Extract style={{ ... }}
      const styleMatch = attrs.match(/\bstyle=(\{\{[^}]*\}\})/);
      const styleStr = styleMatch ? ` style=${styleMatch[1]}` : '';

      // Extract onClick
      const onClickMatch = attrs.match(/\bonClick=(\{(?:[^{}]|\{[^{}]*\})*\})/);
      const onClickStr = onClickMatch ? ` onClick=${onClickMatch[1]}` : '';

      // Extract title
      const titleMatch = attrs.match(/\btitle="([^"]+)"/);
      const titleStr = titleMatch ? ` title="${titleMatch[1]}"` : '';

      // Extract className
      const classMatch = attrs.match(/\bclassName="([^"]+)"/);
      const classStr = classMatch ? ` className="${classMatch[1]}"` : '';

      return `<Icon icon=${iconStr} size={${width}}${styleStr}${onClickStr}${titleStr}${classStr} />`;
    }
  );

  if (modified) {
    // Add Icon import if not present
    const iconImport = "import Icon from '../components/ui/Icon';";
    const iconImportComponents = "import Icon from './ui/Icon';";
    const iconImportSameDir = "import Icon from './Icon';";

    if (!content.includes("from '../components/ui/Icon'") &&
        !content.includes("from './ui/Icon'") &&
        !content.includes("from './Icon'") &&
        !content.includes('@iconify/react')) {
      
      // Determine correct relative path
      const rel = path.relative(SRC, f).replace(/\\/g, '/');
      let imp;
      if (rel.startsWith('pages/') || rel.startsWith('layouts/') || rel === 'App.jsx' || rel === 'ErrorBoundary.jsx') {
        imp = "import Icon from '../components/ui/Icon';";
      } else if (rel.startsWith('components/ui/')) {
        imp = "import Icon from './Icon';";
      } else if (rel.startsWith('components/')) {
        imp = "import Icon from './ui/Icon';";
      } else {
        imp = "import Icon from './components/ui/Icon';";
      }

      // Insert after first import line
      const firstImportEnd = content.indexOf('\n', content.indexOf('import '));
      content = content.slice(0, firstImportEnd + 1) + imp + '\n' + content.slice(firstImportEnd + 1);
    }

    fs.writeFileSync(f, content, "utf8");
    console.log("Converted: " + path.basename(f));
  }
});

console.log("\nTotal iconify-icon tags converted: " + totalFixed);
