import re
import sys

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove from imports
    content = re.sub(r'employeeSalaryInfo,\s*employeeHistorySalary,\s*', '', content)

    # 2. Remove salaryInputSchema
    content = re.sub(r'export const salaryInputSchema =.*?export type SalaryInput = z\.infer<typeof salaryInputSchema>;\n', '', content, flags=re.DOTALL)

    # 3. Remove optional salary from employeeUpdateSchema
    content = re.sub(r'\s*salary: salaryInputSchema\.optional\(\),', '', content)

    # 4. Remove getEmployee salary history queries
    content = re.sub(r'const salaryInfoRows = await db\.select\(\)\.from\(employeeSalaryInfo\).*?;\n', '', content, flags=re.DOTALL)
    content = re.sub(r'const salaryHistory = await db\.select\(\)\.from\(employeeHistorySalary\).*?;\n', '', content, flags=re.DOTALL)
    content = re.sub(r'\s*salaryInfo: salaryInfoRows\[0\] \?\? null,', '', content)
    content = re.sub(r'\s*salary: salaryHistory,', '', content)

    # 5. Remove createEmployee salary insert
    content = re.sub(r'    if \(parsed\.data\.salary\) \{.*?\}\);\n    \}\n', '', content, flags=re.DOTALL)

    # 6. Remove proposeEmployeeChange salary checks
    content = re.sub(r'    if \(parsed\.data\.salary !== undefined\) \{.*?\}\s*\}\s*\}\n\n', '', content, flags=re.DOTALL)
    
    # Another proposeEmployeeChange check
    content = re.sub(r'    if \(parsed\.data\.salary !== undefined\) \{.*?if \(current\.status !== "DRAFT"\) \{.*?\n\s*\}\n\s*\}\n\s*\}\n', '', content, flags=re.DOTALL)

    # 7. Remove updateEmployeeLifecycle validation
    content = re.sub(r'      const salaryInfo = await tx\.select\(\)\.from\(employeeSalaryInfo\).*?\}\n\s*\}\n\s*\}\n\n', '', content, flags=re.DOTALL)

    # 8. Remove processChangeRequest update block
    content = re.sub(r'    // Salary update\s*if \(payload\.salary\) \{.*?\}\n\n', '', content, flags=re.DOTALL)

    # 9. Remove setEmployeeSalaryInfo
    content = re.sub(r'export async function setEmployeeSalaryInfo.*?\n\}\n', '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

clean_file('src/domains/employees/service.ts')
print("Cleaned!")
