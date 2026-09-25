import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/domains/employees/service.ts');

// 4. In getEmployee, remove salary queries and return value
const getEmployeeFunc = sourceFile.getFunction('getEmployee');
if (getEmployeeFunc) {
  const stmtsToRemove = [];
  getEmployeeFunc.getVariableStatements().forEach(stmt => {
    const text = stmt.getText();
    if (text.includes('employeeSalaryInfo') || text.includes('employeeHistorySalary')) {
      stmtsToRemove.push(stmt);
    }
  });
  
  const nodesToRemove = [];
  getEmployeeFunc.forEachDescendant(node => {
    if (Node.isPropertyAssignment(node)) {
      if (node.getName() === 'salaryInfo' || node.getName() === 'salary') {
        nodesToRemove.push(node);
      }
    }
  });
  
  stmtsToRemove.forEach(s => s.remove());
  nodesToRemove.forEach(n => n.remove());
}

// 5. Remove setEmployeeSalaryInfo entirely
sourceFile.getFunction('setEmployeeSalaryInfo')?.remove();

sourceFile.saveSync();
console.log('Pass 2 done');
