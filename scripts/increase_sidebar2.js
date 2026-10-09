const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf8');

// Replace padding
code = code.replace(/padding:\s*4px\s*8px;/g, 'padding: 8px 12px;');
// Replace font-size
code = code.replace(/font-size:\s*12\.5px;/g, 'font-size: 15px;');

fs.writeFileSync('src/app/globals.css', code);
console.log('Sidebar link size increased');
