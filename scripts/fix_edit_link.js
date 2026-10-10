const fs = require('fs');

// 1. Update PeopleDashboard
let dashboardContent = fs.readFileSync('src/components/people/PeopleDashboard.tsx', 'utf8');
dashboardContent = dashboardContent.replace('/edit?organizationId=', '?edit=true&organizationId=');
fs.writeFileSync('src/components/people/PeopleDashboard.tsx', dashboardContent);

// 2. Update EmployeeProfile
let profileContent = fs.readFileSync('src/components/people/EmployeeProfile.tsx', 'utf8');
if (!profileContent.includes('useSearchParams')) {
  profileContent = profileContent.replace('import { useEffect, useState, type FormEvent } from "react";', 'import { useEffect, useState, type FormEvent } from "react";\nimport { useSearchParams } from "next/navigation";');
}

// Find where isEditing is declared and update its initial state
profileContent = profileContent.replace('const [isEditing, setIsEditing] = useState(false);', 'const searchParams = useSearchParams();\n  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");');

fs.writeFileSync('src/components/people/EmployeeProfile.tsx', profileContent);

console.log('Fixed edit links and edit mode');
