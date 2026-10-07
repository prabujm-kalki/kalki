async function test() {
  try {
    const res = await fetch("http://localhost:3001/api/integrations/tmbill/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "b5334ab2-b652-432b-8c16-774c90406261",
        locationId: "d7f7131b-58e4-4e28-a4de-9b216c5b9649",
        fromDate: "2026-10-06 00:00:00",
        toDate: "2026-10-06 23:59:59"
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error(err);
  }
}
test();
