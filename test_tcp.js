const net = require('net');

const server = net.createServer((socket) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] ** CONNECTION OPENED ** from ${socket.remoteAddress}`);
  
  socket.on('data', (data) => {
    console.log(`=== DATA RECEIVED ===\n${data.toString()}\n=====================`);
  });
  
  socket.on('end', () => {
    console.log('Connection closed by device.');
  });
  
  socket.on('error', (err) => {
    console.log('Socket error:', err.message);
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Raw TCP Debug Server listening on port 3001...');
  console.log('Waiting for biometric machine to connect...');
});
