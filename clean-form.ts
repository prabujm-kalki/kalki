import * as fs from 'fs';

let content = fs.readFileSync('src/components/people/EmployeeForm.tsx', 'utf8');

// 1. Remove Zod schema properties
content = content.replace(/\s*\/\/ Salary fields\s*salaryType: z\.string\(\)\.optional\(\),\s*salaryAmount: z\.number\(\)\.optional\(\),\s*salaryEffectiveFrom: z\.string\(\)\.optional\(\),/, '');

// 2. Remove initialization
content = content.replace(/\s*\/\/ Salary Data\s*salaryType: initialData\?\.salaryInfo\?\.salaryType \|\| "Monthly",\s*salaryAmount: initialData\?\.salaryInfo\?\.amount \|\| "",\s*salaryEffectiveFrom: initialData\?\.salaryInfo\?\.effectiveFrom \|\| new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\],/, '');

// 3. Remove payload building
content = content.replace(/const salaryAmountNum = formData\.salaryAmount \? Number\(formData\.salaryAmount\) : undefined;/g, '');
content = content.replace(/salaryAmount: salaryAmountNum,/g, '');
content = content.replace(/const salaryPayload = \{[\s\S]*?\};\s*$/gm, '');

// 4. Update the section in JSX - we'll just regex the <KalkiSection title="Salary & Payment" ...> ... </KalkiSection>
content = content.replace(/<KalkiSection title="Salary & Payment"[\s\S]*?<\/KalkiSection>/g, '');

fs.writeFileSync('src/components/people/EmployeeForm.tsx', content);
console.log('Cleaned EmployeeForm');
