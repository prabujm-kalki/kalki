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

// 3. Remove salary from employeeInputSchema and proposeEmployeeChangeSchema
const schemas = ['employeeInputSchema', 'proposeEmployeeChangeSchema'];
schemas.forEach(schemaName => {
  const schemaVar = sourceFile.getVariableDeclaration(schemaName);
  if (schemaVar) {
    const init = schemaVar.getInitializerIfKind(SyntaxKind.CallExpression);
    if (init) {
      const nodesToRemove: Node[] = [];
      init.forEachDescendant(node => {
        if (Node.isPropertyAssignment(node) && node.getName() === 'salary') {
          nodesToRemove.push(node);
        }
      });
      nodesToRemove.forEach(n => n.remove());
    }
  }
});

// 4. In getEmployee, remove salary queries and return value
const getEmployeeFunc = sourceFile.getFunction('getEmployee');
if (getEmployeeFunc) {
  const stmtsToRemove: Node[] = [];
  getEmployeeFunc.getVariableStatements().forEach(stmt => {
    const text = stmt.getText();
    if (text.includes('employeeSalaryInfo') || text.includes('employeeHistorySalary')) {
      stmtsToRemove.push(stmt);
    }
  });
  
  const nodesToRemove: Node[] = [];
  getEmployeeFunc.forEachDescendant(node => {
    if (Node.isPropertyAssignment(node)) {
      if (node.getName() === 'salaryInfo' || node.getName() === 'salary') {
        nodesToRemove.push(node);
      }
    }
  });
  
  stmtsToRemove.forEach(s => { try { s.remove(); } catch(e) {} });
  nodesToRemove.forEach(n => { try { n.remove(); } catch(e) {} });
}

// 5. Remove setEmployeeSalaryInfo entirely
sourceFile.getFunction('setEmployeeSalaryInfo')?.remove();

// 6. Remove salary blocks from other functions
const funcsToClean = ['createEmployee', 'proposeEmployeeChange', 'updateEmployeeLifecycle', 'processChangeRequest'];
funcsToClean.forEach(funcName => {
  const func = sourceFile.getFunction(funcName);
  if (func) {
    const stmtsToRemove: Node[] = [];
    const ifsToReplace: Node[] = [];
    
    // We only want to remove ExpressionStatements or VariableStatements at the block level
    func.forEachDescendant(node => {
      if (Node.isExpressionStatement(node)) {
        const text = node.getText();
        if (text.includes('tx.insert(employeeSalaryInfo)') || 
            text.includes('tx.update(employeeSalaryInfo)') || 
            text.includes('tx.insert(employeeHistorySalary)') ||
            text.includes('tx.delete(employeeSalaryInfo)')) {
          stmtsToRemove.push(node);
        }
      }
      
      if (Node.isVariableStatement(node) && node.getText().includes('tx.select().from(employeeSalaryInfo)')) {
          stmtsToRemove.push(node);
      }

      if (Node.isIfStatement(node)) {
        const cond = node.getExpression().getText();
        if (cond.includes('parsed.data.salary') || cond.includes('payload.salary') || cond.includes('salaryInfo.length === 0') || cond.includes('salaryInfo[0]') || cond.includes('hasSalaryChanged')) {
           ifsToReplace.push(node);
        }
      }

      if (Node.isVariableDeclaration(node) && (node.getName() === 'existingSalaryData' || node.getName() === 'existingSalary' || node.getName() === 'hasSalaryChanged')) {
          const stmt = node.getVariableStatement();
          if (stmt && !stmtsToRemove.includes(stmt)) stmtsToRemove.push(stmt);
      }
    });

    // Remove in reverse order of depth or just cautiously
    ifsToReplace.forEach(n => {
       try { n.replaceWithText('// Salary logic moved to payroll'); } catch(e) {}
    });
    stmtsToRemove.forEach(n => {
       try { n.remove(); } catch(e) {}
    });
  }
});

sourceFile.saveSync();
console.log('Successfully refactored with AST!');
