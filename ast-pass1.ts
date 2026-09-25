import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/domains/employees/service.ts');

// 1. Remove from imports
sourceFile.getImportDeclarations().forEach(imp => {
  imp.getNamedImports().forEach(named => {
    if (named.getName() === 'employeeSalaryInfo' || named.getName() === 'employeeHistorySalary') {
      named.remove();
    }
  });
});

// 2. Remove salaryInputSchema and SalaryInput type
sourceFile.getVariableDeclaration('salaryInputSchema')?.getVariableStatement()?.remove();
sourceFile.getTypeAlias('SalaryInput')?.remove();

// 3. Remove salary from schemas
['employeeInputSchema', 'proposeEmployeeChangeSchema'].forEach(schemaName => {
  const schemaVar = sourceFile.getVariableDeclaration(schemaName);
  if (schemaVar) {
    const init = schemaVar.getInitializerIfKind(SyntaxKind.CallExpression);
    if (init) {
      const nodesToRemove = [];
      init.forEachDescendant(node => {
        if (Node.isPropertyAssignment(node) && node.getName() === 'salary') {
          nodesToRemove.push(node);
        }
      });
      nodesToRemove.forEach(n => n.remove());
    }
  }
});

sourceFile.saveSync();
console.log('Pass 1 done');
