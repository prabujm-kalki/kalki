const fs = require('fs');
const cp = require('child_process');

const binPath = 'node_modules/drizzle-kit/bin.cjs';
let code = fs.readFileSync(binPath, 'utf8');

// We don't want to permanently break it, just wrap it
fs.writeFileSync('fake-tty.js', 
  Object.defineProperty(process.stdout, 'isTTY', { value: true, enumerable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: true, enumerable: true });
  
  // Provide auto answers for prompts (which use readline/inquirer)
  const originalRead = process.stdin.read;
  let sent = false;
  
  // This is a bit hacky, but better than nothing
  require('./node_modules/drizzle-kit/bin.cjs');
);
