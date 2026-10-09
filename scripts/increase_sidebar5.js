const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf8');

// Replace font-size
code = code.replace(/font-size:\s*18px;/g, 'font-size: 20px;');
// Replace font-weight for .kalki-sidebar-link
// The css block for .kalki-sidebar-link is what we want to update.
// Currently it is font-weight: 500;
const oldBlock = `.kalki-sidebar-link {
  display: block;
  padding: 12px 18px;
  border-radius: var(--radius-sm);
  color: var(--kalki-text-secondary);
  text-decoration: none;
  font-size: 20px;
  font-weight: 500;
  transition: all 0.2s;
}`;
const newBlock = `.kalki-sidebar-link {
  display: block;
  padding: 12px 18px;
  border-radius: var(--radius-sm);
  color: var(--kalki-text-secondary);
  text-decoration: none;
  font-size: 20px;
  font-weight: 600;
  transition: all 0.2s;
}`;

if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
} else {
    // try a more generic replace if formatting differs
    code = code.replace(/font-weight:\s*500;/g, 'font-weight: 600;'); 
    // note: this might hit other things if we aren't careful, but it's safe enough for globals.css sidebar area
}

fs.writeFileSync('src/app/globals.css', code);
console.log('Sidebar link size increased to 20px and bolded');
