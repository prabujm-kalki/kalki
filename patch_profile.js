const fs = require('fs');

let content = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf-8');

// 1. Add import
content = content.replace(
  'import { EmployeeForm } from "./EmployeeForm";',
  'import { EmployeeForm } from "./EmployeeForm";\nimport { EmployeeCompensationTab } from "@/components/payroll/EmployeeCompensationTab";'
);

// 2. Remove isEditingSalary state
content = content.replace(
  'const [isEditingSalary, setIsEditingSalary] = useState(false);',
  ''
);

// 3. Replace the Salary & Payment section
const startTag = '<h2 className="kalki-section-title">Salary & Payment</h2>';
const endTag = '<h2 className="kalki-section-title">Employment History</h2>';

const startIndex = content.indexOf('<section className="kalki-section">', content.indexOf(startTag) - 100);
const endIndex = content.indexOf('<section className="kalki-section">', content.indexOf(endTag) - 100);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `          <EmployeeCompensationTab employeeId={emp.id} organizationId={selected.organizationId} />\n\n          `;
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
}

fs.writeFileSync('src/components/people/EmployeeProfile.tsx', content);
console.log("Successfully patched EmployeeProfile.tsx");
