import re

with open('src/components/people/EmployeeProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
content = content.replace(
    'import { EmployeeForm } from "./EmployeeForm";',
    'import { EmployeeForm } from "./EmployeeForm";\nimport { EmployeeCompensationTab } from "@/components/payroll/EmployeeCompensationTab";'
)

# 2. Replace the Salary & Payment section
# Find <section className="kalki-section"> ... Salary & Payment ... </section>
pattern = re.compile(r'<section className="kalki-section">\s*<div className="kalki-section-header">\s*<h2 className="kalki-section-title">Salary & Payment</h2>.*?</section>', re.DOTALL)

replacement = '<EmployeeCompensationTab employeeId={emp.id} organizationId={selected.organizationId} />'
content = pattern.sub(replacement, content, count=1)

with open('src/components/people/EmployeeProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
