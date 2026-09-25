import * as fs from 'fs';
let content = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf8');

content = content.replace(/import \{ EmployeeSalaryForm \} from "\.\/EmployeeSalaryForm";\n/, '');
content = content.replace(/const \[isEditingSalary, setIsEditingSalary\] = useState\(false\);\n/, '');
content = content.replace(/<KalkiSection title="Salary & Payment"[\s\S]*?<\/KalkiSection>\s*<KalkiSection title="History"/, '<KalkiSection title="History"');

fs.writeFileSync('src/components/people/EmployeeProfile.tsx', content);
console.log('Cleaned EmployeeProfile');
