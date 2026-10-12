const fs = require('fs');
const file = 'src/db/schema.ts';
let content = fs.readFileSync(file, 'utf8');
const searchStr = 'returnPolicies: jsonb("return_policies").default({\n      maxReturnDays: 30,\n      allowMultipleReturns: true,\n      requireApproval: true,\n      applyRestockingFee: "None"\n    }),';
const replaceStr = searchStr + '\r\n    whatsappConfig: jsonb("whatsapp_config").default({}),';

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated src/db/schema.ts');
} else {
  console.error('Could not find search string in src/db/schema.ts');
}
