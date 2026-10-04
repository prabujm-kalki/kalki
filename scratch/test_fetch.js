async function run() {
  const res = await fetch('http://localhost:3001/api/public/po?token=3b134ca3-f5e3-43d3-b2ee-38bb78fded50');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
