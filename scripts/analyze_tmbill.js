const fs = require('fs');

async function analyzeTMBillAPI() {
  const token = "dG1iaWxsXzQ3VGJGWWpXWEhFTTFJMGJseUx2U2ZtVElSS1ZTcnZ5Mk8wdWMxZzE=";
  const storeId = "38159666161524";
  const tmposId = "38159666";

  const headers = {
    "Content-Type": "application/json",
    "tmbill-key": token
  };

  const results = {};

  try {
    // 1. Check /tp/v1/order/list
    console.log("Analyzing /tp/v1/order/list...");
    const listRes = await fetch("https://api.tmbill.com/tp/v1/order/list", {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        from: "2026-09-01 00:00:00",
        to: "2026-10-08 23:59:59", // ~38 days
        offset: 0,
        limit: 2,
        order_id: ""
      })
    });
    
    if (listRes.ok) {
      const data = await listRes.json();
      results.orderList = {
        success: true,
        recordCount: data.data ? data.data.length : 0,
        sampleFields: data.data && data.data.length > 0 ? Object.keys(data.data[0]) : [],
        sampleRecord: data.data && data.data.length > 0 ? data.data[0] : null
      };
    } else {
      results.orderList = { success: false, status: listRes.status, text: await listRes.text() };
    }

    // 2. Check /tp/v1/order/adsr
    console.log("Analyzing /tp/v1/order/adsr...");
    const adsrRes = await fetch("https://api.tmbill.com/tp/v1/order/adsr", {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        from: "2026-09-01",
        to: "2026-10-08",
        offset: 1
      })
    });
    
    if (adsrRes.ok) {
      const data = await adsrRes.json();
      results.adsr = {
        success: true,
        message: data.message,
        summaryFields: data.data ? Object.keys(data.data) : [],
        sampleData: data.data
      };
    } else {
      results.adsr = { success: false, status: adsrRes.status, text: await adsrRes.text() };
    }

    // 3. Check /tp/v1/sales
    console.log("Analyzing /tp/v1/sales...");
    const salesRes = await fetch("https://api.tmbill.com/tp/v1/sales", {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        from_date: "2026-09-01",
        to_date: "2026-10-08"
      })
    });

    if (salesRes.ok) {
      const data = await salesRes.json();
      results.orderTypeSales = {
        success: true,
        dataTypes: Object.keys(data),
        sampleFields: data.data && data.data.length > 0 ? Object.keys(data.data[0]) : [],
      };
    } else {
      results.orderTypeSales = { success: false, status: salesRes.status, text: await salesRes.text() };
    }

    // 4. Check /tp/v1/order/GetSales
    console.log("Analyzing /tp/v1/order/GetSales...");
    const getSalesRes = await fetch("https://api.tmbill.com/tp/v1/order/GetSales", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: "2026-09-01 00:00:00",
        to: "2026-10-08 23:59:59",
        filter: {
          tmpos_id: tmposId,
          store_id: storeId
        }
      })
    });

    if (getSalesRes.ok) {
      const data = await getSalesRes.json();
      results.getSales = {
        success: true,
        dataTypes: Object.keys(data),
        sampleData: data.data ? data.data : null
      };
    } else {
      results.getSales = { success: false, status: getSalesRes.status, text: await getSalesRes.text() };
    }

    fs.writeFileSync('scratch/tmbill_analysis.json', JSON.stringify(results, null, 2));
    console.log("Analysis complete. Check scratch/tmbill_analysis.json");

  } catch (err) {
    console.error(err);
  }
}

analyzeTMBillAPI();
