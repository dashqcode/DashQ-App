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

  // Fix double-comma artifacts left by the previous script: ", ," -> ","
  const before = content;
  content = content.replace(/,\s*,/g, ',');
  if (content !== before) {
    modified = true;
    totalFixed++;
  }

  // Also fix trailing comma before closing brace: ", }" -> " }"
  content = content.replace(/,\s*\}\}/g, '}}');

  if (modified) {
    fs.writeFileSync(f, content, "utf8");
    console.log("Fixed: " + path.basename(f));
  }
});
console.log("Total files fixed: " + totalFixed);
console.log("Done!");
