const http = require('http');
const server = http.createServer((req, res) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] ACTIVITY DETECTED: ${req.method} ${req.url}`);
  console.log('Headers sent by machine:', req.headers);
  
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    if (body) console.log('Data Body:', body);
    // Always reply OK so the machine is happy
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK\n'); 
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Raw Test Server listening on port 3001...');
  console.log('Waiting for biometric machine to connect...');
});
