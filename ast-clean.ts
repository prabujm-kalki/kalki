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
      // Find the object literal passed to z.object or .extend
      init.forEachDescendant(node => {
        if (Node.isPropertyAssignment(node) && node.getName() === 'salary') {
          node.remove();
        }
      });
    }
  }
}

// 4. In getEmployee, remove salary queries and return value
const getEmployeeFunc = sourceFile.getFunction('getEmployee');
if (getEmployeeFunc) {
  getEmployeeFunc.getVariableStatements().forEach(stmt => {
    const text = stmt.getText();
    if (text.includes('employeeSalaryInfo') || text.includes('employeeHistorySalary')) {
      stmt.remove();
    }
  });

  getEmployeeFunc.forEachDescendant(node => {
    if (Node.isPropertyAssignment(node)) {
      if (node.getName() === 'salaryInfo' || node.getName() === 'salary') {
        node.remove();
      }
    }
  });
}

// 5. Remove salary inserts/updates from createEmployee, proposeEmployeeChange, updateEmployeeLifecycle, processChangeRequest
const funcsToClean = ['createEmployee', 'proposeEmployeeChange', 'updateEmployeeLifecycle', 'processChangeRequest'];
for (const funcName of funcsToClean) {
  const func = sourceFile.getFunction(funcName);
  if (func) {
    func.forEachDescendant(node => {
      // Remove inserts/updates to salary tables
      if (Node.isExpressionStatement(node)) {
        const text = node.getText();
        if (text.includes('tx.insert(employeeSalaryInfo)') || 
            text.includes('tx.update(employeeSalaryInfo)') || 
            text.includes('tx.insert(employeeHistorySalary)') ||
            text.includes('tx.delete(employeeSalaryInfo)')
           ) {
          node.remove();
        }
      }
      
      // Remove if (parsed.data.salary) blocks
      if (Node.isIfStatement(node)) {
        const cond = node.getExpression().getText();
        if (cond.includes('parsed.data.salary') || cond.includes('payload.salary')) {
           // wait, just removing the if statement removes the block
           node.replaceWithText('// Salary logic moved');
        }
      }

      // Remove salary validation in updateEmployeeLifecycle
      if (Node.isVariableStatement(node) && node.getText().includes('tx.select().from(employeeSalaryInfo)')) {
          node.remove();
      }
      if (Node.isIfStatement(node)) {
         const text = node.getText();
         if (text.includes('salaryInfo.length === 0') || text.includes('salaryInfo[0]')) {
             node.replaceWithText('// Salary validation moved');
         }
      }
    });
  }
}

// 6. Remove setEmployeeSalaryInfo entirely
const setSalaryFunc = sourceFile.getFunction('setEmployeeSalaryInfo');
if (setSalaryFunc) setSalaryFunc.remove();

sourceFile.saveSync();
console.log('Successfully refactored with AST!');
