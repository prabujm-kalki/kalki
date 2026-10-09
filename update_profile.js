const fs = require('fs');
let code = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf8');

code = code.replace(
  'aadhaarDocumentUrl: string | null;',
  'aadhaarNumber: string | null;\n  aadhaarDocumentUrl: string | null;'
);

code = code.replace(
  '<InfoItem label="Biometric ID" value={emp.biometricId} />',
  '<InfoItem label="Aadhaar Number" value={emp.aadhaarNumber} />\n                <InfoItem label="Biometric ID" value={emp.biometricId} />'
);

fs.writeFileSync('src/components/people/EmployeeProfile.tsx', code);
console.log('done');
