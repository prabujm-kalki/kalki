const fs = require('fs');
const text = fs.readFileSync('scratch_slice5_mentions.txt', 'utf8');

// Find all code blocks
const regex = /```(?:typescript|ts)?\s*([\s\S]*?)```/g;
let match;
let count = 0;
while ((match = regex.exec(text)) !== null) {
    const code = match[1];
    if (code.includes('describe') && code.includes('Phase 5 Slice 5 Tests')) {
        fs.writeFileSync(`slice5_code_block_${count}.ts`, code);
        count++;
    }
}
console.log('Found', count, 'code blocks');
