const fs = require('fs');

const filePath = 'src/db/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace .notNull() on assignedToEmployeeId in kuabTasks
const searchStr = 'assignedToEmployeeId: uuid("assigned_to_employee_id")\r\n      .notNull()\r\n      .references(() => employees.id)';
const searchStrUnix = 'assignedToEmployeeId: uuid("assigned_to_employee_id")\n      .notNull()\n      .references(() => employees.id)';

const replaceStr = 'assignedToEmployeeId: uuid("assigned_to_employee_id")\r\n      .references(() => employees.id)';
const replaceStrUnix = 'assignedToEmployeeId: uuid("assigned_to_employee_id")\n      .references(() => employees.id)';

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated schema.ts (CRLF)');
} else if (content.includes(searchStrUnix)) {
  content = content.replace(searchStrUnix, replaceStrUnix);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated schema.ts (LF)');
} else {
  console.log('Search string not matched directly, inspecting...');
}
