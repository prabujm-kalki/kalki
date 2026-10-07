import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function testApiLimit() {
  const { TMBillService } = await import('../src/domains/integrations/tmbill.service');
  const service = new TMBillService("b5334ab2-b652-432b-8c16-774c90406261", "d7f7131b-58e4-4e28-a4de-9b216c5b9649");
  try {
    const config = await (service as any).getConfig();
    const token = await service.authenticate(config);
    
    // Page 1 (offset 0)
    let res = await fetch(`${config.apiUrl}/order/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "tmbill-key": token as string },
      body: JSON.stringify({
        store_id: config.storeId,
        from: "2026-10-06 00:00:00",
        to: "2026-10-06 23:59:59",
        offset: 0,
        limit: 50,
        order_id: ""
      })
    });
    let data = await res.json();
    console.log("Offset 0:", data.data ? data.data.length : 0);

    // Page 2? (offset 1)
    res = await fetch(`${config.apiUrl}/order/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "tmbill-key": token as string },
      body: JSON.stringify({
        store_id: config.storeId,
        from: "2026-10-06 00:00:00",
        to: "2026-10-06 23:59:59",
        offset: 1,
        limit: 50,
        order_id: ""
      })
    });
    data = await res.json();
    console.log("Offset 1:", data.data ? data.data.length : 0);

    // Page 2? (offset 15)
    res = await fetch(`${config.apiUrl}/order/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "tmbill-key": token as string },
      body: JSON.stringify({
        store_id: config.storeId,
        from: "2026-10-06 00:00:00",
        to: "2026-10-06 23:59:59",
        offset: 15,
        limit: 50,
        order_id: ""
      })
    });
    data = await res.json();
    console.log("Offset 15:", data.data ? data.data.length : 0);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
testApiLimit();
