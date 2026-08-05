const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src', 'pages')).concat(walk(path.join(__dirname, 'src', 'components')));

let count = 0;
files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  // Reemplazar color: 'white' a '#111111' si est\u00E1 cerca de var(--color-primary)
  let newContent = content
    .replace(/(background:\s*['"]var\(--color-primary\)['"][^}]+color:\s*)['"](?:white|#fff|#ffffff)['"]/g, "$1'#111111'")
    .replace(/(color:\s*)['"](?:white|#fff|#ffffff)['"]([^}]+background:\s*['"]var\(--color-primary\)['"])/g, "$1'#111111'$2");
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed', file);
    count++;
  }
});
console.log('Done, fixed', count, 'files.');
