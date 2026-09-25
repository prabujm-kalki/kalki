import * as fs from 'fs';

// Fix EmployeeForm.tsx
let formContent = fs.readFileSync('src/components/people/EmployeeForm.tsx', 'utf8');
formContent = formContent.replace(/salaryAmount: salaryAmountNum,/g, '');
formContent = formContent.replace(/salaryAmountNum \? salaryPayload : undefined/g, 'undefined');
formContent = formContent.replace(/salaryAmount: undefined,/g, '');
formContent = formContent.replace(/salary: undefined,/g, '');
fs.writeFileSync('src/components/people/EmployeeForm.tsx', formContent);

// Fix EmployeeProfile.tsx
let profileContent = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf8');
profileContent = profileContent.replace(/import \{ EmployeeSalaryForm \} from ".\/EmployeeSalaryForm";/g, '');
fs.writeFileSync('src/components/people/EmployeeProfile.tsx', profileContent);

// Fix service.ts
let serviceContent = fs.readFileSync('src/domains/employees/service.ts', 'utf8');
serviceContent = serviceContent.replace(/salaryType: [^,\n]+,/g, '');
serviceContent = serviceContent.replace(/amount: [^,\n]+,/g, '');
serviceContent = serviceContent.replace(/effectiveFrom: [^,\n]+,/g, '');
// And fix employeeHistorySalary references
serviceContent = serviceContent.replace(/employeeHistorySalary,/g, '');
serviceContent = serviceContent.replace(/await tx\.insert\(employeeHistorySalary\)\.values\(\{[^}]+\}\);/g, '');
fs.writeFileSync('src/domains/employees/service.ts', serviceContent);
