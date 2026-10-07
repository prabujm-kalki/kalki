const { TMBillService } = require('./src/domains/integrations/tmbill.service');

async function testApiLimit() {
  const service = new TMBillService("b5334ab2-b652-432b-8c16-774c90406261", "d7f7131b-58e4-4e28-a4de-9b216c5b9649");
  try {
    const config = await service.getConfig();
    const token = await service.authenticate(config);
    
    // Request with limit 50
    const res = await fetch(`${config.apiUrl}/order/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        store_id: config.storeId,
        from: "2026-10-06 00:00:00",
        to: "2026-10-06 23:59:59",
        offset: 0,
        limit: 50,
        order_id: ""
      })
    });
    
    const data = await res.json();
    console.log("With limit 50:");
    console.log("Returned count:", data.result ? data.result.length : 0);
    if (data.result && data.result.length > 0) {
      console.log("Pagination info in data?:", Object.keys(data));
      console.log("Total records info?", data.total_records || data.recordsTotal || "none");
    }
    
  } catch (err) {
    console.error(err);
  }
}
testApiLimit();
