const fs = require('fs');

const filePath = 'c:\\Users\\HP\\.gemini\\antigravity\\scratch\\marketing-app\\src\\layouts\\MainLayout.jsx';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
