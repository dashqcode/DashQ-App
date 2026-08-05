const fs = require('fs');
const path = require('path');

// CalendarPage.jsx
let calPath = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'CalendarPage.jsx');
let calContent = fs.readFileSync(calPath, 'utf8');
calContent = calContent.replace(/const calendars = \[\s*{\s*id: 'tes'[\s\S]*?\];\n/, '');
calContent = calContent.replace(/const isToday = day\.toDateString\(\) === new Date\(\)\.toDateString\(\);\n/, '');
fs.writeFileSync(calPath, calContent);

// ReportsPage.jsx
let repPath = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'ReportsPage.jsx');
let repContent = fs.readFileSync(repPath, 'utf8');
repContent = repContent.replace(/useNavigate,\s*/, '');
repContent = repContent.replace(/catch \(err\)/g, 'catch (_err)');
fs.writeFileSync(repPath, repContent);

// GestorPage.jsx
let gestorPath = path.join(__dirname, 'src', 'react-frontend', 'src', 'pages', 'GestorPage.jsx');
let gestorContent = fs.readFileSync(gestorPath, 'utf8');
gestorContent = gestorContent.replace(/useNavigate,\s*/, '');
gestorContent = gestorContent.replace(/const \[isPreviewLoading, setIsPreviewLoading\] = useState\(true\);\n/, '');
gestorContent = gestorContent.replace(/catch \(err\)/g, 'catch (_err)');
fs.writeFileSync(gestorPath, gestorContent);

console.log('Cleaned up unused variables in other pages');
