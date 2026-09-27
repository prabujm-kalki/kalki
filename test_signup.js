const http = require('http');

const data = JSON.stringify({ name: 'Test', email: 'test100@kalki.internal', password: 'password123' });

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/sign-up/email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Origin': 'http://192.168.31.96:3001',
    'Host': '192.168.31.96:3001'
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
