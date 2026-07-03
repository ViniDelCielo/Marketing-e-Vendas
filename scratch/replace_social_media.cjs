const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
            walk(file, function(err, res) {
              results = results.concat(res);
              if (!--pending) done(null, results);
            });
          } else {
            if (!--pending) done(null, results);
          }
        } else {
          if (/\.(js|jsx|ts|tsx|md|sql)$/i.test(file)) {
            results.push(file);
          }
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk(process.cwd(), function(err, results) {
  if (err) throw err;
  let changedFiles = 0;
  results.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('Social Mídia')) {
      const newContent = content.replace(/Social Mídia/g, 'Social Media');
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Updated:', file);
      changedFiles++;
    }
  });
  console.log(`Updated ${changedFiles} files.`);
});
