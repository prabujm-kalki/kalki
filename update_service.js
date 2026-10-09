const fs = require('fs');
let code = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

code = code.replace(
  'aadhaarDocumentUrl: z.string().trim().nullable().optional(),\n  photoUrl:',
  'aadhaarNumber: z.string().trim().min(1, "Aadhaar Number is required"),\n  aadhaarDocumentUrl: z.string().trim().nullable().optional(),\n  photoUrl:'
);

code = code.replace(
  'aadhaarDocumentUrl: z.string().trim().nullable().optional(),\n    photoUrl:',
  'aadhaarNumber: z.string().trim().min(1, "Aadhaar Number is required").optional(),\n    aadhaarDocumentUrl: z.string().trim().nullable().optional(),\n    photoUrl:'
);

code = code.replace(
  'biometricId: z.string().trim().min(1),',
  'biometricId: z.string().trim().nullable().optional(),'
);

code = code.replace(
  'aadhaarDocumentUrl: employees.aadhaarDocumentUrl,',
  'aadhaarNumber: employees.aadhaarNumber,\n      aadhaarDocumentUrl: employees.aadhaarDocumentUrl,'
);

code = code.replace(
  'aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl ?? null,',
  'aadhaarNumber: parsed.data.aadhaarNumber,\n        aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl ?? null,'
);

code = code.replace(
  '...(parsed.data.aadhaarDocumentUrl !== undefined && { aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl }),',
  '...(parsed.data.aadhaarNumber !== undefined && { aadhaarNumber: parsed.data.aadhaarNumber }),\n      ...(parsed.data.aadhaarDocumentUrl !== undefined && { aadhaarDocumentUrl: parsed.data.aadhaarDocumentUrl }),'
);

fs.writeFileSync('src/domains/employees/service.ts', code);
console.log('done');
