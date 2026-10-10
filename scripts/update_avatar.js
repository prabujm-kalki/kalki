const fs = require('fs');
let content = fs.readFileSync('src/components/people/PeopleDashboard.tsx', 'utf8');

// Update EmployeeView
content = content.replace(/email\?: string \| null;\r?\n  };\r?\n};/g, 'email?: string | null;\n  };\n  photoUrl?: string | null;\n};');

// Update Avatar using regex to avoid string escaping issues
const regex = /<div className="employee-avatar">[\s\S]*?<\/div>/;
const newAvatar = '<div className="employee-avatar">\n                        {emp.photoUrl ? <img src={emp.photoUrl} alt={emp.person.displayName} /> : emp.person.displayName.substring(0, 2).toUpperCase()}\n                      </div>';

content = content.replace(regex, newAvatar);

fs.writeFileSync('src/components/people/PeopleDashboard.tsx', content);
console.log('Updated PeopleDashboard.tsx');
