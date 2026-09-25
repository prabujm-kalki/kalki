const fs = require('fs');
let code = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf8');

// There's still <EmployeeSalaryForm /> being rendered?
code = code.replace(/<EmployeeSalaryForm[\s\S]*?\/>/g, '');

fs.writeFileSync('src/components/people/EmployeeProfile.tsx', code);
