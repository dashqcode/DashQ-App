const fs = require("fs");
const path = require("path");

// Convert PieChartBoldDuotone -> solar:pie-chart-bold-duotone
function toIconify(compName) {
  const base = compName.replace("BoldDuotone", "");
  // Handle acronyms like CPU, HTML etc.
  const kebab = base
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .toLowerCase();
  return "solar:" + kebab + "-bold-duotone";
}

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

  // Match self-closing Solar icon tags: <XxxBoldDuotone [attrs] />
  // We need to handle multi-line and complex attribute combinations
  content = content.replace(
    /<([A-Z][a-zA-Z]+BoldDuotone)((?:[^>]|(?!\/>))*?)\/>/gs,
    (match, compName, attrs) => {
      const iconName = toIconify(compName);
      
      // Extract size prop: size={N} or size="N"
      const sizeMatch = attrs.match(/\bsize=\{(\d+)\}|\bsize="(\d+)"/);
      const size = sizeMatch ? (sizeMatch[1] || sizeMatch[2]) : "20";
      
      // Extract color prop: color="..." or color={...}
      const colorMatch = attrs.match(/\bcolor="([^"]+)"|\bcolor=\{['"]([^'"]+)['"]\}/);
      let colorStyle = "";
      if (colorMatch) {
        const c = colorMatch[1] || colorMatch[2];
        colorStyle = ` style="color: ${c};"`;
      }
      
      // Extract color from style prop: style={{ color: '...' }}
      if (!colorMatch) {
        const styleColorMatch = attrs.match(/style=\{\{\s*color:\s*['"]([^'"]+)['"]/);
        if (styleColorMatch) {
          colorStyle = ` style="color: ${styleColorMatch[1]};"`;
        }
      }
      
      // Extract onClick if present (keep it as is for the wrapper)
      const onClickMatch = attrs.match(/onClick=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
      const titleMatch = attrs.match(/title="([^"]+)"/);
      
      let extraAttrs = "";
      if (titleMatch) extraAttrs += ` title="${titleMatch[1]}"`;
      
      modified = true;
      totalFixed++;
      
      if (onClickMatch) {
        // Wrap in a span for click events since iconify-icon doesn't support onClick directly in React
        return `<span style={{display:'inline-flex',alignItems:'center',cursor:'pointer'}} onClick={${onClickMatch[1]}}${titleMatch ? ` title="${titleMatch[1]}"` : ""}><iconify-icon icon="${iconName}" width="${size}"${colorStyle}></iconify-icon></span>`;
      }
      
      return `<iconify-icon icon="${iconName}" width="${size}"${colorStyle}${extraAttrs}></iconify-icon>`;
    }
  );

  // Remove solar-icon-set imports since we no longer need the React components
  content = content.replace(/\nimport \{[^}]+\} from ['"]solar-icon-set['"];?\n/g, "\n");
  
  if (modified) {
    fs.writeFileSync(f, content, "utf8");
    console.log("Converted: " + path.basename(f) + " (" + totalFixed + " total so far)");
  }
});
console.log("\nTotal icons converted to Iconify: " + totalFixed);
console.log("Done!");
