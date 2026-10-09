const fs = require('fs');
const files = [
  'src/app/sales/orders/pending/page.tsx',
  'src/app/sales/orders/completed/page.tsx',
  'src/app/sales/orders/status/page.tsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/timeZone: 'Asia\/Kolkata'/g, "timeZone: 'UTC'");
  fs.writeFileSync(file, content);
});
console.log('Fixed timezone');
