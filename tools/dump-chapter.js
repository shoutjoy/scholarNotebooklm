const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'prompts', 'prompts.js'), 'utf8');
const idx = s.indexOf('\uCC45(\uB610\uB294 ');
if (idx < 0) {
  console.log('not found');
  process.exit(1);
}
const start = idx + '\uCC45(\uB610\uB294 '.length;
const slice = s.slice(start, start + 8);
for (let i = 0; i < slice.length; i++) {
  const c = slice[i];
  if (c === ')') break;
  console.log(JSON.stringify(c), 'U+' + c.charCodeAt(0).toString(16).toUpperCase());
}
