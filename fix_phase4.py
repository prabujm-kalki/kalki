import os
with open('tests/domains/employees.phase4.test.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('gpayNumber: "999"', 'gpayNumber: "9876543210"')
text = text.replace('gpayNumber: "888"', 'gpayNumber: "9876543211"')

with open('tests/domains/employees.phase4.test.ts', 'w', encoding='utf-8') as f:
    f.write(text)
