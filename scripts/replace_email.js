const fs = require('fs');
let content = fs.readFileSync('src/domains/employees/service.ts', 'utf8');

const oldStr1 = 'phone: people.phone,\r\n      },\r\n    })';
const newStr1 = 'phone: people.phone,\r\n        email: people.email,\r\n      },\r\n    })';

const oldStr2 = 'phone: people.phone,\n      },\n    })';
const newStr2 = 'phone: people.phone,\n        email: people.email,\n      },\n    })';

let replaced = false;
if (content.includes(oldStr1)) {
  content = content.replace(oldStr1, newStr1);
  replaced = true;
} else if (content.includes(oldStr2)) {
  content = content.replace(oldStr2, newStr2);
  replaced = true;
} else {
  // Try regex
  const regex = /phone:\s*people\.phone,[\s\S]*?},[\s\S]*?}\)/;
  if (regex.test(content)) {
    content = content.replace(/phone:\s*people\.phone,/, 'phone: people.phone,\n        email: people.email,');
    replaced = true;
  }
}

if (replaced) {
  fs.writeFileSync('src/domains/employees/service.ts', content);
  console.log('Success replacing email in service.ts');
} else {
  console.log('Failed to find replacement target in service.ts');
}
