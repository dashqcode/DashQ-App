const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith(".jsx")) results.push(file);
  });
  return results;
}

const files = walk("c:/Users/alexs/Documents/FILE/src/react-frontend/src");

let totalFixed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, "utf8");
  let modified = false;

  // Pattern 1: <IconName style={{ fontSize: 'Xpx', ...otherProps }} />
  // Convert fontSize in style to size prop
  content = content.replace(
    /(<[A-Z][a-zA-Z]+BoldDuotone)\s+([^>]*?)style=\{\{([^}]*?)fontSize:\s*['"](\d+)px['"]([^}]*?)\}\}([^/]*?)\/>/g,
    (match, tag, beforeStyle, beforeFontSize, size, afterFontSize, afterStyle) => {
      modified = true;
      totalFixed++;
      const remainingStyle = (beforeFontSize + afterFontSize).trim().replace(/^,|,$/, '').trim();
      const styleAttr = remainingStyle ? ` style={{${remainingStyle}}}` : '';
      return `${tag} size={${size}}${styleAttr} ${afterStyle}/>`;
    }
  );

  // Pattern 2: <IconName style={{ fontSize: 'Xpx' }} /> (clean, no other props in style)
  content = content.replace(
    /(<[A-Z][a-zA-Z]+BoldDuotone)\s+style=\{\{\s*fontSize:\s*['"](\d+)px['"]\s*\}\}\s*\/>/g,
    (match, tag, size) => {
      modified = true;
      totalFixed++;
      return `${tag} size={${size}} />`;
    }
  );

  // Pattern 3: <IconName style={{ fontSize: 'Xpx', color: '...' }} /> 
  content = content.replace(
    /(<[A-Z][a-zA-Z]+BoldDuotone)\s+style=\{\{\s*fontSize:\s*['"](\d+)px['"],\s*color:\s*['"]([^'"]+)['"]\s*\}\}\s*\/>/g,
    (match, tag, size, color) => {
      modified = true;
      totalFixed++;
      return `${tag} size={${size}} color="${color}" />`;
    }
  );

  // Pattern 4: <IconName style={{ color: '...', fontSize: 'Xpx' }} />
  content = content.replace(
    /(<[A-Z][a-zA-Z]+BoldDuotone)\s+style=\{\{\s*color:\s*['"]([^'"]+)['"],\s*fontSize:\s*['"](\d+)px['"]\s*\}\}\s*\/>/g,
    (match, tag, color, size) => {
      modified = true;
      totalFixed++;
      return `${tag} size={${size}} color="${color}" />`;
    }
  );

  // Pattern 5: <IconName style={{ fontSize: 'Xpx', color: 'var(...)' }} />
  content = content.replace(
    /(<[A-Z][a-zA-Z]+BoldDuotone)\s+style=\{\{\s*fontSize:\s*['"](\d+)px['"],\s*color:\s*(var\([^)]+\))[^}]*\}\}\s*\/>/g,
    (match, tag, size, color) => {
      modified = true;
      totalFixed++;
      return `${tag} size={${size}} color="${color}" />`;
    }
  );

  if (modified) {
    fs.writeFileSync(f, content, "utf8");
    console.log("Fixed: " + path.basename(f));
  }
});

console.log("Total fixes: " + totalFixed);
console.log("Done!");
