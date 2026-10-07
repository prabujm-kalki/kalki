const fs = require('fs');

async function testApi() {
  const token = "dG1iaWxsXzQ3VGJGWWpXWEhFTTFJMGJseUx2U2ZtVElSS1ZTcnZ5Mk8wdWMxZzE=";
  const storeId = "38159666161524";
  const tmposId = "38159666";

  const headers = {
    "Content-Type": "application/json",
    "tmbill-key": token
  };

  try {
    console.log("Fetching order list...");
    const listRes = await fetch("https://api.tmbill.com/tp/v1/order/list", {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        from: "2026-10-06 00:00:00",
        to: "2026-10-07 23:59:59",
        offset: 0,
        limit: 5,
        order_id: ""
      })
    });
    
    if (listRes.ok) {
      const listData = await listRes.json();
      console.log("Order List Sample:", JSON.stringify(listData.data?.slice(0, 1), null, 2));
      fs.writeFileSync('scratch/order_list_sample.json', JSON.stringify(listData, null, 2));
    } else {
      console.log("Order List Failed:", listRes.status, await listRes.text());
    }

    console.log("\nFetching ADSR report...");
    const adsrRes = await fetch("https://api.tmbill.com/tp/v1/order/adsr", {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        from: "2026-10-06",
        to: "2026-10-07",
        offset: 1
      })
    });

    if (adsrRes.ok) {
      const adsrData = await adsrRes.json();
      console.log("ADSR Sample:", JSON.stringify(adsrData, null, 2).substring(0, 500));
    } else {
      console.log("ADSR Failed:", adsrRes.status, await adsrRes.text());
    }

  } catch (err) {
    console.error(err);
  }
}

testApi();
