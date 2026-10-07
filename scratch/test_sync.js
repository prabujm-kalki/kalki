const { TMBillService } = require('./src/domains/integrations/tmbill.service');

async function testSync() {
  const service = new TMBillService("b5334ab2-b652-432b-8c16-774c90406261", "d7f7131b-58e4-4e28-a4de-9b216c5b9649");
  try {
    const res = await service.syncOrders("2026-10-06 00:00:00", "2026-10-06 23:59:59");
    console.log("Success:", res);
  } catch (error) {
    console.error("Error:", error);
  }
}
testSync();
