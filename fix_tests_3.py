import os
import re

for f in os.listdir('tests/domains'):
    if not f.endswith('.test.ts'):
        continue
    path = os.path.join('tests/domains', f)
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # fix the +9199 ones, whether it's 10000000 or 100000000
    content = re.sub(r'\+9199\$\{Math\.floor\(Math\.random\(\)\s*\*\s*100000000?\)\}', r'99${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}', content)
    
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)
