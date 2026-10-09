import { TMBillService } from "../src/domains/integrations/tmbill.service";

async function run() {
  try {
    const locId = "467e6ec4-e7c0-4b24-8aeb-4e641f849da2";
    
    // We don't have exact orgId yet, let's fetch from tmbill_configs
    const { db } = await import("../src/db");
    const { tmbillConfigs } = await import("../src/db/schema");
    const configs = await db.select().from(tmbillConfigs).limit(1);
    if (!configs.length) throw new Error("No configs");
    
    const service = new TMBillService(configs[0].organizationId, locId);
    console.log("Syncing orders...");
    const res = await service.syncOrders("2026-10-04", "2026-10-06");
    console.log("Synced:", res);
    
    console.log("Pushing to sales invoices...");
    const pushed = await service.pushToSalesInvoices("system");
    console.log("Pushed:", pushed);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
