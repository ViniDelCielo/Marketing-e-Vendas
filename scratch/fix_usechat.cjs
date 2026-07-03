const fs = require('fs');

const filePath = 'c:\\Users\\HP\\.gemini\\antigravity\\scratch\\marketing-app\\src\\hooks\\useChat.js';

let content = fs.readFileSync(filePath, 'utf8');

// The file currently has literal \` and \$ and \\n
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
content = content.replace(/\\\\n/g, '\\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
