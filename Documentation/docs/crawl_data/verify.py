#!/usr/bin/env python3
"""Final verification of both JSON files."""
import json

files = {
    'marketing_specialist.json': 'Marketing Specialist',
    'marketing_manager.json': 'Marketing Manager'
}

grand_total = 0
all_pass = True

for filename, position in files.items():
    path = f'/home/nhatbang/EXE101/PRJ/docs/crawl_data/{filename}'
    with open(path) as f:
        data = json.load(f)
    
    print(f"=== {position} ({filename}) ===")
    assert data['position'] == position, f"Wrong position name!"
    
    position_total = 0
    for level in ['Intern', 'Fresher', 'Junior', 'Middle', 'Senior']:
        count = len(data['questions'].get(level, []))
        status = 'PASS' if count >= 100 else 'FAIL'
        if count < 100:
            all_pass = False
        print(f"  {level}: {count} questions [{status}]")
        position_total += count
    
    print(f"  Total: {position_total} questions")
    grand_total += position_total
    print()

print(f"Grand total: {grand_total} questions (min required: 1000)")
print(f"Status: {'ALL PASS' if all_pass and grand_total >= 1000 else 'SOME FAILURES'}")

# Show sample from each level
print("\n--- Sample Questions ---")
for filename in files:
    with open(f'/home/nhatbang/EXE101/PRJ/docs/crawl_data/{filename}') as f:
        data = json.load(f)
    print(f"\n{data['position']}:")
    for level in ['Intern', 'Senior']:
        qs = data['questions'].get(level, [])
        print(f"  {level} sample: {qs[0][:80]}...")
