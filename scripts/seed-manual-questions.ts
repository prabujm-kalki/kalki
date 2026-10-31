import { seedAllManualQuestions } from "../src/domains/manual/seedQuestionsService";

async function main() {
  try {
    await seedAllManualQuestions();
    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

main();

