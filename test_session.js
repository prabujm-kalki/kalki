const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/session-context',
  method: 'GET',
  headers: {
    'Origin': 'http://192.168.31.96:3001',
    'Host': '192.168.31.96:3001',
    'x-forwarded-proto': 'https',
    'Cookie': '__Secure-better-auth.session_token=QzzvH0lpYJ7w20XxaLRVwcn7l1nKaW9H.XrCRDS4%2Fz6o8FA%2F%2BRjusUnD39TnjVGVFKE9fmR57zHA%3D'
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
