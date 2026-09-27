import { db } from './src/db/index';

const run = async () => {
  try {
    await db.execute(`UPDATE payroll_runs SET status = 'LOCKED' WHERE status = 'COMPLETED'`);
    await db.execute(`UPDATE payslips SET status = 'LOCKED' WHERE status = 'GENERATED'`);
    console.log('Status updated successfully');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
};

run();
