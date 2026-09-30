const fs = require('fs');
let c = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

c = c.replace(
  'if (payload.targetEmployeeUpdatedAt && new Date(payload.targetEmployeeUpdatedAt).getTime() !== emp.updatedAt.getTime()) {',
  'if (payload.targetEmployeeUpdatedAt && Math.abs(new Date(payload.targetEmployeeUpdatedAt).getTime() - emp.updatedAt.getTime()) > 1000) {'
);

const newFields = `
    if (payload.person) {
      if (payload.person.firstName !== undefined) personChanges.firstName = payload.person.firstName;
      if (payload.person.lastName !== undefined) personChanges.lastName = payload.person.lastName;
      if (payload.person.displayName !== undefined) personChanges.displayName = payload.person.displayName;
      if (payload.person.phone !== undefined) personChanges.phone = payload.person.phone;
      if (payload.person.email !== undefined) personChanges.email = payload.person.email;
      if (payload.person.dateOfBirth !== undefined) personChanges.dateOfBirth = payload.person.dateOfBirth;
      hasPersonChanges = Object.keys(personChanges).length > 1;
    }

    const simpleFields = [
      'jobTitle', 'category', 'locationId', 'employmentStartDate', 'employmentEndDate',
      'aadhaarDocumentUrl', 'photoUrl', 'otherDocument1Url', 'otherDocument2Url', 'otherDocument3Url',
      'residentialAddress', 'bloodGroup', 'gender', 'maritalStatus', 'biometricId', 'defaultShiftId', 'departmentId'
    ];
    for (const field of simpleFields) {
      if (payload[field] !== undefined) {
        employeeChanges[field] = payload[field];
        hasEmployeeChanges = true;
      }
    }

    if (payload.reportingEmployeeId !== undefined) {
      await validateReportingAssignment(tx, emp.id, payload.reportingEmployeeId, emp.organizationId);
      employeeChanges.reportingEmployeeId = payload.reportingEmployeeId; 
      hasEmployeeChanges = true;
    }
`;

c = c.replace(
  /if \(payload\.person\) \{[\s\S]*?\/\/ \.\.\.other fields if needed\.\.\./,
  newFields.trim()
);

fs.writeFileSync('src/domains/employees/service.ts', c);
console.log('Patched service.ts');
