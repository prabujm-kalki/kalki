async function test() {
  const res = await fetch("http://localhost:3001/api/payroll/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationId: "15d2d5c5-e9ba-4996-8c27-73161d633857",
      locationId: "7bd03522-3eee-4380-b6f7-2c16b61fe96c", // I might need to double check org/loc id
      periodStart: "2026-09-20",
      periodEnd: "2026-09-25",
      payBasis: "HOURLY"
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
