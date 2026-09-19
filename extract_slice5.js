const fs = require('fs');
const transcriptPath = 'C:\\Users\\Asus\\.gemini\\antigravity-ide\\brain\\c2ebd627-c396-4448-bd73-af30b3fa39a9\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let snippets = [];

for (const line of lines) {
    if (!line) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes("employees.slice5.test.ts")) {
            snippets.push(obj.content);
        }
        if (obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (JSON.stringify(call).includes("employees.slice5.test.ts")) {
                    snippets.push(JSON.stringify(call));
                }
            }
        }
    } catch(e) {}
}

fs.writeFileSync('C:\\Users\\Asus\\Kalki-BOS\\kalki\\scratch_slice5_mentions.txt', snippets.join('\n\n=====\n\n'));
