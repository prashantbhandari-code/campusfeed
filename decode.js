const fs = require('fs');
const b64 = fs.readFileSync('D:/PROJECTS/socialhub/callmodal.b64.txt', 'utf8').trim();
const content = Buffer.from(b64, 'base64').toString('utf8');
fs.writeFileSync('D:/PROJECTS/socialhub/src/components/CallModal.tsx', content);
console.log('Written', content.split('
').length, 'lines');
