import * as fs from 'fs';

let content = fs.readFileSync('src/domains/employees/service.ts', 'utf8');
content = content.replace(/export const salaryInputSchema = z\.object\(\{[\\s\\S]*?\}\);\\nexport type SalaryInput = z\.infer<typeof salaryInputSchema>;\\n/, '');
content = content.replace(/salary: salaryInputSchema\\.optional\\(\\),/g, '');
content = content.replace(/if \\(parsed\\.data\\.salary\\) \\{[\\s\\S]*?await tx\\.insert\\(employeeSalaryInfo\\)\\.values\\(\\{[\\s\\S]*?\\}\\);\\n\\s*\\}/, '');
content = content.replace(/salary: parsed\\.data\\.salary,/g, '');

fs.writeFileSync('src/domains/employees/service.ts', content);
console.log('Cleaned service.ts');
