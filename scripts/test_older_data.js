const fs = require('fs');

async function testOlderData() {
  const token = "dG1iaWxsXzQ3VGJGWWpXWEhFTTFJMGJseUx2U2ZtVElSS1ZTcnZ5Mk8wdWMxZzE=";
  const storeId = "38159666161524";

  const headers = {
    "Content-Type": "application/json",
    "tmbill-key": token
  };

  try {
    console.log("Testing older data fetch for July 2026...");
    const listRes = await fetch("https://api.tmbill.com/tp/v1/order/list", {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        from: "2026-07-01 00:00:00",
        to: "2026-07-31 23:59:59",
        offset: 0,
        limit: 10,
        order_id: ""
      })
    });
    
    if (listRes.ok) {
      const data = await listRes.json();
      console.log("Success! Record count:", data.data ? data.data.length : 0);
      if (data.data && data.data.length > 0) {
        console.log("Oldest record date:", data.data[0].created_date);
      }
    } else {
      console.log("Failed:", listRes.status, await listRes.text());
    }
  } catch (err) {
    console.error(err);
  }
}

testOlderData();
