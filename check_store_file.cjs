const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const baileysPath = path.join(__dirname, 'node_modules', '@whiskeysockets', 'baileys');
if (fs.existsSync(baileysPath)) {
  const files = walk(baileysPath);
  console.log('Searching files for makeInMemoryStore...');
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('makeInMemoryStore')) {
      console.log('Found in file:', path.relative(baileysPath, f));
    }
  }
} else {
  console.log('Baileys path not found');
}
process.exit(0);
