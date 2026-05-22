#!/usr/bin/env python3
"""Verify question counts in interview question JSON files."""
import json

files = [
    '/home/nhatbang/EXE101/PRJ/docs/crawl_data/financial_analyst.json',
    '/home/nhatbang/EXE101/PRJ/docs/crawl_data/accountant.json',
    '/home/nhatbang/EXE101/PRJ/docs/crawl_data/auditor.json'
]

levels = ['Intern', 'Fresher', 'Junior', 'Middle', 'Senior']
total_grand = 0
all_pass = True

for f in files:
    with open(f, 'r') as fh:
        data = json.load(fh)
    position = data['position']
    questions = data['questions']
    print(f'=== {position} ===')
    pos_total = 0
    for level in levels:
        count = len(questions.get(level, []))
        status = 'OK' if count >= 100 else 'LOW - NEEDS MORE'
        if count < 100:
            all_pass = False
        print(f'  {level}: {count} questions {status}')
        pos_total += count
    print(f'  TOTAL for {position}: {pos_total}')
    total_grand += pos_total
    print()

print(f'GRAND TOTAL: {total_grand} questions across all positions')
print(f'All levels >= 100: {all_pass}')
if all_pass:
    print('SUCCESS: Minimum requirements met.')
else:
    print('WARNING: Some levels need more questions.')
