import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/domains/employees/service.ts');

const funcsToClean = ['createEmployee', 'proposeEmployeeChange', 'updateEmployeeLifecycle', 'processChangeRequest'];
funcsToClean.forEach(funcName => {
  const func = sourceFile.getFunction(funcName);
  if (func) {
    const stmtsToRemove = [];
    
    func.forEachDescendant(node => {
      if (Node.isVariableStatement(node) && node.getText().includes('employeeSalaryInfo')) {
          stmtsToRemove.push(node);
      }
    });

    stmtsToRemove.forEach(n => {
       try { n.remove(); } catch(e) {}
    });
  }
});

sourceFile.saveSync();
console.log('Pass 4 done');
