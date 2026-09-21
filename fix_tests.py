import os
import re

for f in os.listdir('tests/domains'):
    if not f.endswith('.test.ts'):
        continue
    path = os.path.join('tests/domains', f)
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = re.sub(r'mobile:\s*"123"', 'mobile: "9876543210"', content)
    content = re.sub(r'phone:\s*`\+123\$\{randomUUID\(\)\.slice\(0, 10\)\}`', r'phone: `99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`', content)
    
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)
