const fs = require('fs');

let content = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf-8');

// The Salary & Payment section
const startSearch = '<section className="kalki-section">\n            <div className="kalki-section-header">\n              <h2 className="kalki-section-title">Salary & Payment</h2>';

const endSearch = '<section className="kalki-section">\n            <div className="kalki-section-header">\n              <h2 className="kalki-section-title">Employment History</h2>';

const sIndex = content.indexOf('<section className="kalki-section"', content.indexOf('Salary & Payment') - 100);
const eIndex = content.indexOf('<section className="kalki-section"', content.indexOf('Employment History') - 100);

if (sIndex !== -1 && eIndex !== -1) {
  const replacement = `          <EmployeeCompensationTab employeeId={emp.id} organizationId={selected.organizationId} />\n\n          `;
  content = content.substring(0, sIndex) + replacement + content.substring(eIndex);
}

// Remove duplicate EmployeeCompensationTab that was added incorrectly
content = content.replace('                    <EmployeeCompensationTab employeeId={emp.id} organizationId={selected.organizationId} />\n\n          ', '');

fs.writeFileSync('src/components/people/EmployeeProfile.tsx', content);
console.log("Successfully patched EmployeeProfile.tsx");
