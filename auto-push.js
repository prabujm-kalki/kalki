const { spawn } = require('child_process');
const p = spawn('npx', ['drizzle-kit', 'push', '--force'], { shell: true });

p.stdout.on('data', (d) => {
  const output = d.toString();
  process.stdout.write(output);
  if (output.includes('?')) {
    p.stdin.write('\n'); // just press enter to accept default (which might be Yes or No)
  }
});

p.stderr.on('data', d => process.stderr.write(d.toString()));
p.on('close', code => console.log(`Exited with code ${code}`));
