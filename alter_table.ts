import { db } from './src/db/index';

const run = async () => {
  try {
    await db.execute(`ALTER TABLE employee_salary_structures ADD COLUMN IF NOT EXISTS pay_basis VARCHAR(50) NOT NULL DEFAULT 'MONTHLY'`);
    console.log('Column added');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
};

run();
