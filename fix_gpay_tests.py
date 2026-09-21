import os
with open('tests/domains/employees.edit.test.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('gpayNumber: "999"', 'gpayNumber: "9876543210"')
text = text.replace('gpayNumber: "888"', 'gpayNumber: "9876543211"')
text = text.replace('expect(salary[0].gpayNumber).toBe("888")', 'expect(salary[0].gpayNumber).toBe("9876543211")')
text = text.replace('expect(salary[0].gpayNumber).toBe("999")', 'expect(salary[0].gpayNumber).toBe("9876543210")')

with open('tests/domains/employees.edit.test.ts', 'w', encoding='utf-8') as f:
    f.write(text)
