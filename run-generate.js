Object.defineProperty(process.stdout, 'isTTY', { value: true });
Object.defineProperty(process.stdin, 'isTTY', { value: true });

const { spawn } = require('child_process');
const child = spawn('cmd.exe', ['/c', 'npx', 'drizzle-kit', 'generate'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (d) => {
  const str = d.toString();
  console.log(str);
  if (str.includes('You are about to delete') || str.includes('statements?')) {
    child.stdin.write('\n'); // Select first option and press enter
  }
});
child.stderr.on('data', (d) => process.stderr.write(d));
child.on('close', (c) => process.exit(c));
