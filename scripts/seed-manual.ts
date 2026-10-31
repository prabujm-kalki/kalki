import { seedPurchasingManual } from "../src/domains/manual/seedData";

async function main() {
  try {
    await seedPurchasingManual();
    console.log("Seeding finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

main();

