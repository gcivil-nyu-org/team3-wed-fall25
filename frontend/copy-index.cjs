const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../backend/static/_app/index.html');
const destDir = path.resolve(__dirname, '../backend/templates');
const dest = path.join(destDir, 'index.html');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied ${src} -> ${dest}`);