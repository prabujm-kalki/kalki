const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf8');

// Replace padding
code = code.replace(/padding:\s*10px\s*16px;/g, 'padding: 12px 18px;');
// Replace font-size
code = code.replace(/font-size:\s*16px;/g, 'font-size: 18px;');

fs.writeFileSync('src/app/globals.css', code);
console.log('Sidebar link size increased even more');
