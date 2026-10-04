import { runEscalationSweeper } from "./src/domains/tasks/sweeper";

async function run() {
  console.log("Running sweeper...");
  const result = await runEscalationSweeper();
  console.log("Sweeper result:", result);
  process.exit(0);
}

run().catch(console.error);
