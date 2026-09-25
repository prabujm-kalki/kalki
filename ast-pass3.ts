import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/domains/employees/service.ts');

const funcsToClean = ['createEmployee', 'proposeEmployeeChange', 'updateEmployeeLifecycle', 'processChangeRequest'];
funcsToClean.forEach(funcName => {
  const func = sourceFile.getFunction(funcName);
  if (func) {
    const ifsToReplace = [];
    
    func.forEachDescendant(node => {
      if (Node.isIfStatement(node)) {
        const cond = node.getExpression().getText();
        if (cond.includes('parsed.data.salary') || cond.includes('payload.salary') || cond.includes('salaryInfo.length === 0') || cond.includes('salaryInfo[0]') || cond.includes('hasSalaryChanged')) {
           ifsToReplace.push(node);
        }
      }
    });

    // Replace in reverse order so children are replaced first (if any overlapping, though there aren't many here)
    for (let i = ifsToReplace.length - 1; i >= 0; i--) {
        const n = ifsToReplace[i];
        try { n.replaceWithText('// Salary logic moved to payroll'); } catch(e) {}
    }
  }
});

sourceFile.saveSync();
console.log('Pass 3 done');
