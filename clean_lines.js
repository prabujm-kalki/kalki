const fs = require('fs');
const lines = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');

let newLines = [];
let i = 0;

while (i < lines.length) {
    const line = lines[i];

    // 1. Remove createEmployee salary insert
    if (line.includes('if (parsed.data.salary) {')) {
        // Skip until the line that has '}' at same indentation (6 spaces)
        i++;
        while (i < lines.length && !lines[i].startsWith('      }')) {
            i++;
        }
        i++; // skip the '}'
        continue;
    }

    // 2. Remove getEmployee queries
    if (line.includes('const salaryInfoRows = await db.select().from(employeeSalaryInfo)') ||
        line.includes('const salaryHistory = await db.select().from(employeeHistorySalary)') ||
        line.includes('salaryInfo: salaryInfoRows[0] ?? null,') ||
        line.includes('salary: salaryHistory,')) {
        i++;
        continue;
    }

    // 3. Remove proposeEmployeeChange block
    if (line.includes('if (parsed.data.salary !== undefined) {')) {
        // Find closing brace at indentation 4
        i++;
        while (i < lines.length && !lines[i].startsWith('    }')) {
            i++;
        }
        i++; // skip the '}'
        continue;
    }

    // 4. Remove updateEmployeeLifecycle block
    if (line.includes('const salaryInfo = await tx.select().from(employeeSalaryInfo)')) {
        // Skip until the end of the block. The last is `      }` at indentation 6
        i++;
        let braceCount = 1; // we assume it's part of a block? No, it's just lines.
        // Let's just skip until we see `      }` that closes the `if (salaryInfo[0])` block
        while (i < lines.length) {
            if (lines[i].includes('if (salaryInfo[0]) {')) {
                i++;
                while (i < lines.length && !lines[i].startsWith('      }')) { i++; }
                i++; // skip the '}'
                break;
            }
            i++;
        }
        continue;
    }

    // 5. Remove processChangeRequest block
    if (line.includes('// Salary update')) {
        i++; // skip comment
        if (lines[i].includes('if (payload.salary) {')) {
            i++;
            while (i < lines.length && !lines[i].startsWith('    }')) {
                i++;
            }
            i++; // skip '}'
        }
        continue;
    }

    // 6. Remove setEmployeeSalaryInfo function entirely
    if (line.includes('export async function setEmployeeSalaryInfo')) {
        i++;
        while (i < lines.length && !lines[i].startsWith('}')) {
            i++;
        }
        i++; // skip '}'
        continue;
    }

    newLines.push(line);
    i++;
}

fs.writeFileSync('src/domains/employees/service.ts', newLines.join('\n'));
console.log('Line-by-line clean done!');
