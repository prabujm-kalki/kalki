const fs = require('fs');

function updatePage(path) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/inv\.orderCategory \|\| 'Dine-in'/g, "inv.channelName || 'Unassigned'");
  code = code.replace(/inv\.orderCategory/g, "inv.channelName");
  code = code.replace(/row\.orderCategory \|\| \"Dine-in\"/g, 'row.channelName || "Unassigned"');
  code = code.replace(/row\.orderCategory \|\| 'Dine-in'/g, "row.channelName || 'Unassigned'");
  code = code.replace(/row\.orderCategory \|\| \"\"/g, 'row.channelName || ""');
  code = code.replace(/row\.orderCategory/g, "row.channelName");
  fs.writeFileSync(path, code);
}

try { updatePage('src/app/sales/reports/sales/page.tsx'); } catch(e){}
try { updatePage('src/app/sales/reports/customer/page.tsx'); } catch(e){}
console.log('done');
