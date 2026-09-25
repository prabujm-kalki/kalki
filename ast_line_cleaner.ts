import { Project, SyntaxKind, Node } from 'ts-morph';
import * as fs from 'fs';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/domains/employees/service.ts');

const linesToRemove = new Set();

const funcsToClean = ['createEmployee', 'proposeEmployeeChange', 'updateEmployeeLifecycle', 'processChangeRequest'];

funcsToClean.forEach(funcName => {
  const func = sourceFile.getFunction(funcName);
  if (func) {
    func.forEachDescendant(node => {
      if (Node.isIfStatement(node)) {
        const cond = node.getExpression().getText();
        if (cond.includes('parsed.data.salary') || cond.includes('payload.salary') || cond.includes('salaryInfo.length === 0') || cond.includes('salaryInfo[0]') || cond.includes('hasSalaryChanged')) {
           const start = node.getStartLineNumber();
           const end = node.getEndLineNumber();
           for (let i = start; i <= end; i++) linesToRemove.add(i);
        }
      }
      
      if (Node.isVariableStatement(node) || Node.isExpressionStatement(node)) {
        const text = node.getText();
        if (text.includes('employeeSalaryInfo') || text.includes('employeeHistorySalary') || text.includes('salaryInfo:') || text.includes('salary: salaryHistory')) {
           const start = node.getStartLineNumber();
           const end = node.getEndLineNumber();
           for (let i = start; i <= end; i++) linesToRemove.add(i);
        }
      }
    });
  }
});

const getEmployeeFunc = sourceFile.getFunction('getEmployee');
if (getEmployeeFunc) {
  getEmployeeFunc.forEachDescendant(node => {
      if (Node.isVariableStatement(node) || Node.isExpressionStatement(node)) {
        const text = node.getText();
        if (text.includes('employeeSalaryInfo') || text.includes('employeeHistorySalary')) {
           const start = node.getStartLineNumber();
           const end = node.getEndLineNumber();
           for (let i = start; i <= end; i++) linesToRemove.add(i);
        }
      }
      if (Node.isPropertyAssignment(node)) {
        if (node.getName() === 'salaryInfo' || node.getName() === 'salary') {
           const start = node.getStartLineNumber();
           const end = node.getEndLineNumber();
           for (let i = start; i <= end; i++) linesToRemove.add(i);
        }
      }
  });
}

const setSalary = sourceFile.getFunction('setEmployeeSalaryInfo');
if (setSalary) {
  const start = setSalary.getStartLineNumber();
  const end = setSalary.getEndLineNumber();
  for (let i = start; i <= end; i++) linesToRemove.add(i);
}

const lines = fs.readFileSync('src/domains/employees/service.ts', 'utf8').split('\n');
const newLines = lines.map((line, index) => {
    if (linesToRemove.has(index + 1)) return '// REMOVED';
    return line;
});

fs.writeFileSync('src/domains/employees/service.ts', newLines.join('\n'));
console.log('Cleaned by lines!');
