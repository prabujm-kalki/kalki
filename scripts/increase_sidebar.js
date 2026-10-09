const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf8');

const oldSidebarLink = `.kalki-sidebar-link {
  display: block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  color: var(--kalki-text-secondary);
  text-decoration: none;
  font-size: 12.5px;
  font-weight: 500;
  transition: all 0.2s;
}`;

const newSidebarLink = `.kalki-sidebar-link {
  display: block;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--kalki-text-secondary);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
}`;

if (code.includes(oldSidebarLink)) {
  code = code.replace(oldSidebarLink, newSidebarLink);
  fs.writeFileSync('src/app/globals.css', code);
  console.log('Sidebar link size increased');
} else {
  console.log('Sidebar link block not found');
}
