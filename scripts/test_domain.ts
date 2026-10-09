import { db } from "../src/db";
import { getCustomerBalances, getReceivablesSummary, getAgeingReport } from "../src/domains/finance/receivables-service";

async function run() {
  const orgId = "6a42ab1d-212d-45db-9c32-15f5fc8c5fcb";
  try {
    const balances = await getCustomerBalances(orgId);
    console.log("CustomerBalances success", balances.length);
  } catch(e) {
    console.error("getCustomerBalances ERROR:", e);
  }

  try {
    const sum = await getReceivablesSummary(orgId);
    console.log("ReceivablesSummary success", sum);
  } catch(e) {
    console.error("getReceivablesSummary ERROR:", e);
  }
}
run();
