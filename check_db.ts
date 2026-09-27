import { db } from './src/db/index';

const run = async () => {
  try {
    const res = await db.execute(`SELECT * FROM payroll_runs`);
    console.log(res);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
};

run();
