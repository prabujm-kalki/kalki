import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('src/domains/employees/service.ts');

// 1. Remove from imports
const importDecls = sourceFile.getImportDeclarations();
for (const imp of importDecls) {
  const namedImports = imp.getNamedImports();
  for (const named of namedImports) {
    if (named.getName() === 'employeeSalaryInfo' || named.getName() === 'employeeHistorySalary') {
      named.remove();
    }
  }
}

// 2. Remove salaryInputSchema and SalaryInput type
const varDecl = sourceFile.getVariableDeclaration('salaryInputSchema');
if (varDecl) varDecl.getVariableStatement().remove();

const typeAlias = sourceFile.getTypeAlias('SalaryInput');
if (typeAlias) typeAlias.remove();

// 3. Remove salary from employeeInputSchema and proposeEmployeeChangeSchema
const schemas = ['employeeInputSchema', 'proposeEmployeeChangeSchema'];
for (const schemaName of schemas) {
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
}

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
  stmtsToRemove.forEach(s => s.remove());

  const nodesToRemove: Node[] = [];
  getEmployeeFunc.forEachDescendant(node => {
    if (Node.isPropertyAssignment(node)) {
      if (node.getName() === 'salaryInfo' || node.getName() === 'salary') {
        nodesToRemove.push(node);
      }
    }
  });
  nodesToRemove.forEach(n => n.remove());
}

// 5. Remove salary inserts/updates from createEmployee, proposeEmployeeChange, updateEmployeeLifecycle, processChangeRequest
const funcsToClean = ['createEmployee', 'proposeEmployeeChange', 'updateEmployeeLifecycle', 'processChangeRequest'];
for (const funcName of funcsToClean) {
  const func = sourceFile.getFunction(funcName);
  if (func) {
    const nodesToReplace: Node[] = [];
    const nodesToRemove: Node[] = [];
    
    func.forEachDescendant(node => {
      if (Node.isExpressionStatement(node)) {
        const text = node.getText();
        if (text.includes('tx.insert(employeeSalaryInfo)') || 
            text.includes('tx.update(employeeSalaryInfo)') || 
            text.includes('tx.insert(employeeHistorySalary)') ||
            text.includes('tx.delete(employeeSalaryInfo)')
           ) {
          nodesToRemove.push(node);
        }
      }
      
      if (Node.isIfStatement(node)) {
        const cond = node.getExpression().getText();
        if (cond.includes('parsed.data.salary') || cond.includes('payload.salary') || cond.includes('salaryInfo.length === 0') || cond.includes('salaryInfo[0]')) {
           nodesToReplace.push(node);
        }
      }

      if (Node.isVariableStatement(node) && node.getText().includes('tx.select().from(employeeSalaryInfo)')) {
          nodesToRemove.push(node);
      }
    });

    nodesToRemove.forEach(n => {
       try { n.remove(); } catch(e) {}
    });
    nodesToReplace.forEach(n => {
       try { n.replaceWithText('// Salary logic moved'); } catch(e) {}
    });
  }
}

// 6. Remove setEmployeeSalaryInfo entirely
const setSalaryFunc = sourceFile.getFunction('setEmployeeSalaryInfo');
if (setSalaryFunc) setSalaryFunc.remove();

sourceFile.saveSync();
console.log('Successfully refactored with AST!');
