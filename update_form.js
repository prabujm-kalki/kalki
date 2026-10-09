const fs = require('fs');
let code = fs.readFileSync('src/components/people/EmployeeForm.tsx', 'utf8');

code = code.replace(
  'biometricId: z.string().trim().min(1, "Biometric ID is required"),',
  'aadhaarNumber: z.string().trim().min(1, "Aadhaar Number is required"),\n  biometricId: z.string().trim().optional(),'
);

code = code.replace(
  'aadhaarDocumentUrl: initialData?.aadhaarDocumentUrl || "",',
  'aadhaarNumber: initialData?.aadhaarNumber || "",\n    aadhaarDocumentUrl: initialData?.aadhaarDocumentUrl || "",'
);

code = code.replace(
  'biometricId: formData.biometricId,',
  'aadhaarNumber: formData.aadhaarNumber,\n        biometricId: formData.biometricId || undefined,'
);

code = code.replace(
  '<KalkiSection title="System Integration" icon="🔗">',
  '<KalkiSection title="System Integration" icon="🔗">\n            <div className="kalki-field">\n              <KalkiInput label="Aadhaar Number" required value={formData.aadhaarNumber} onChange={e => handleChange("aadhaarNumber", e.target.value)} error={fieldErrors.aadhaarNumber} disabled={pending} />\n            </div>'
);

code = code.replace(
  '<KalkiInput label="Biometric ID" required value={formData.biometricId}',
  '<KalkiInput label="Biometric ID" value={formData.biometricId}'
);

fs.writeFileSync('src/components/people/EmployeeForm.tsx', code);
console.log(code.includes('Aadhaar Number is required'));
