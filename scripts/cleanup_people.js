const fs = require('fs');
let content = fs.readFileSync('src/components/people/PeopleDashboard.tsx', 'utf8');

// 1. Update lucide-react imports
content = content.replace('Mail, Edit, Trash', 'Eye, Edit');
content = content.replace('import { RoleDefinitionForm } from "./RoleDefinitionForm";\n', '');
content = content.replace('import { RoleDefinitionForm } from "./RoleDefinitionForm";\r\n', '');

// 2. Remove RoleDefinitionView type
content = content.replace(/type RoleDefinitionView = {[\s\S]*?};\n\n/g, '');
content = content.replace(/type RoleDefinitionView = {[\s\S]*?};\r\n\r\n/g, '');

// 3. Remove roles and showRoleForm states
content = content.replace(/  const \[roles, setRoles\].*\n/g, '');
content = content.replace(/  const \[showRoleForm, setShowRoleForm\].*\n/g, '');
content = content.replace(/  const \[roles, setRoles\].*\r\n/g, '');
content = content.replace(/  const \[showRoleForm, setShowRoleForm\].*\r\n/g, '');

// 4. Remove roles apiGet
content = content.replace(/      apiGet<{ roles: RoleDefinitionView\[\] }>\(`\/api\/role-definitions\?\${query\.toString\(\)}`\),\n/g, '');
content = content.replace(/      apiGet<{ roles: RoleDefinitionView\[\] }>\(`\/api\/role-definitions\?\${query\.toString\(\)}`\),\r\n/g, '');

// 5. Update then block
content = content.replace(/\.then\(\(\[empPayload, rolePayload, proposalsPayload\]\) => {/g, '.then(([empPayload, proposalsPayload]) => {');
content = content.replace(/      setRoles\({ requestKey, items: rolePayload\.roles }\);\n/g, '');
content = content.replace(/      setRoles\({ requestKey, items: rolePayload\.roles }\);\r\n/g, '');

// 6. Update Action buttons
const oldActions = '<div className="actions-cell">\n                      <button className="action-btn" title="Email"><Mail size={16} /></button>\n                      <Link href={`/people/${emp.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}>\n                        <button className="action-btn" title="Edit"><Edit size={16} /></button>\n                      </Link>\n                      <button className="action-btn danger" title="Delete"><Trash size={16} /></button>\n                    </div>';
const oldActionsWin = oldActions.replace(/\n/g, '\r\n');
const newActions = '<div className="actions-cell">\n                      <Link href={`/people/${emp.id}?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}>\n                        <button className="action-btn" title="View"><Eye size={16} /></button>\n                      </Link>\n                      <Link href={`/people/${emp.id}/edit?organizationId=${selected.organizationId}&locationId=${selected.locationId}`}>\n                        <button className="action-btn" title="Edit"><Edit size={16} /></button>\n                      </Link>\n                    </div>';

content = content.replace(oldActions, newActions);
content = content.replace(oldActionsWin, newActions);

// 7. Remove Role Definitions section at the end
const regexEnd = /      <section className="panel" style={{ marginTop: "2rem" }}>[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\);\s*\}/;
const newEnd = '    </div>\n  );\n}';
content = content.replace(regexEnd, newEnd);

fs.writeFileSync('src/components/people/PeopleDashboard.tsx', content);
console.log('Success cleaning up PeopleDashboard.tsx');
