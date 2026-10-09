const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf8');

// Replace padding
code = code.replace(/padding:\s*8px\s*12px;/g, 'padding: 10px 16px;');
// Replace font-size
code = code.replace(/font-size:\s*15px;/g, 'font-size: 16px;');

fs.writeFileSync('src/app/globals.css', code);
console.log('Sidebar link size increased again');
