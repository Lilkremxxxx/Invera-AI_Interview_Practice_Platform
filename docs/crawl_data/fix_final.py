import re

path = '/home/nhatbang/EXE101/PRJ/docs/crawl_data/generate_answers.py'
with open(path) as f:
    content = f.read()

# Fix incorrect fallback calls - each f-string message before the call identifies the position
# Pattern: the f-string text + the wrong fallback call -> correct call

pairs = [
    # generate_generic_answer uses the `position` parameter
    (r'In an? \{level\.lower\(\)\} \{[^}]+\} interview.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback(position'),
    # Backend Developer
    (r'For an? \{level\.lower\(\)\} Backend Developer:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Backend Developer"'),
    # Data Scientist
    (r'For \{level\.lower\(\)\} Data Scientist:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Data Scientist"'),
    # ML Engineer
    (r'For \{level\.lower\(\)\} ML Engineer:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Machine Learning Engineer"'),
    # DevOps Engineer
    (r'For \{level\.lower\(\)\} DevOps Engineer:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("DevOps Engineer"'),
    # Product Manager
    (r'For an? \{level\.lower\(\)\} Product Manager:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Product Manager"'),
    # UX Designer
    (r'For an? \{level\.lower\(\)\} UX Designer:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("UX Designer"'),
    # Business Analyst
    (r'For an? \{level\.lower\(\)\} Business Analyst:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Business Analyst"'),
    # Operations Analyst
    (r'For an? \{level\.lower\(\)\} Operations Analyst:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Operations Analyst"'),
    # Sales Representative
    (r'For an? \{level\.lower\(\)\} Sales Representative:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Sales Representative"'),
    # Marketing Specialist
    (r'For an? \{level\.lower\(\)\} Marketing Specialist:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Marketing Specialist"'),
    # Marketing Manager
    (r'For an? \{level\.lower\(\)\} Marketing Manager:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Marketing Manager"'),
    # Financial Analyst
    (r'For an? \{level\.lower\(\)\} Financial Analyst:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Financial Analyst"'),
    # Accountant
    (r'For an? \{level\.lower\(\)\} Accountant:.*?generate_generic_fallback\("[^"]+"',
     r'generate_generic_fallback("Accountant"'),
]

for pattern, replacement in pairs:
    content = re.sub(pattern, replacement, content)

# Convert Auditor and IB to single quotes (consistent with others)
content = content.replace('generate_generic_fallback("Auditor"', "generate_generic_fallback('Auditor'")
content = content.replace('generate_generic_fallback("Investment Banking Analyst"', "generate_generic_fallback('Investment Banking Analyst'")

with open(path, 'w') as f:
    f.write(content)

# Verify: show all fallback calls
print("=== Final fallback calls ===")
for i, line in enumerate(content.split('\n'), 1):
    if 'generate_generic_fallback(' in line:
        print(f"  Line {i}: {line.strip()}")
print("=== DONE ===")
