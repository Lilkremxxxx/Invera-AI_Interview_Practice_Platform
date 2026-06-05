#!/usr/bin/env python3
"""Extract questions from the existing DOCX and rebuild JSON files."""
import json, os, re
from docx import Document

DOCX_PATH = "/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx"
OUTPUT_DIR = "/home/nhatbang/EXE101/PRJ/docs/crawl_data"

doc = Document(DOCX_PATH)

positions = {
    'Frontend Developer': 'frontend_developer.json',
    'Backend Developer': 'backend_developer.json',
    'Full Stack Developer': 'full_stack_developer.json',
    'Data Scientist': 'data_scientist.json',
    'Machine Learning Engineer': 'machine_learning_engineer.json',
    'DevOps Engineer': 'devops_engineer.json',
    'Product Manager': 'product_manager.json',
    'UX Designer': 'ux_designer.json',
    'Business Analyst': 'business_analyst.json',
    'Operations Analyst': 'operations_analyst.json',
    'Sales Representative': 'sales_representative.json',
    'Marketing Specialist': 'marketing_specialist.json',
    'Marketing Manager': 'marketing_manager.json',
    'Financial Analyst': 'financial_analyst.json',
    'Accountant': 'accountant.json',
    'Auditor': 'auditor.json',
    'Investment Banking Analyst': 'investment_banking_analyst.json',
}

levels = ['Intern', 'Fresher', 'Junior', 'Middle', 'Senior']

current_pos = None
current_level = None
questions = {p: {l: [] for l in levels} for p in positions}

for para in doc.paragraphs:
    text = para.text.strip()
    
    # Check for position heading (Heading 2)
    if para.style.name.startswith('Heading 2'):
        for pos in positions:
            if text == pos:
                current_pos = pos
                current_level = None
                break
    
    # Check for level subheading (Heading 3)
    elif para.style.name.startswith('Heading 3') and current_pos:
        for lvl in levels:
            if text.startswith(f'Cấp độ: {lvl}') or text.startswith(f'Level: {lvl}'):
                current_level = lvl
                break
    
    # Extract question
    elif text.startswith('Câu ') and current_pos and current_level:
        # Remove "Câu N: " prefix to get the question text
        match = re.match(r'Câu \d+:\s*(.*)', text)
        if match:
            q_text = match.group(1).strip()
            questions[current_pos][current_level].append(q_text)

# Save all JSON files
os.makedirs(OUTPUT_DIR, exist_ok=True)
total_q = 0
for pos, filename in positions.items():
    data = {
        "position": pos,
        "questions": {lvl: questions[pos][lvl] for lvl in levels}
    }
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    q_count = sum(len(v) for v in data['questions'].values())
    total_q += q_count
    min_q = min(len(v) for v in data['questions'].values())
    status = "OK" if min_q >= 100 else "SHORT"
    print(f'{pos:40s} | {status} | {q_count} questions (min level: {min_q})')

print(f'\nTotal: {total_q} questions extracted from DOCX')
print(f'Files saved to {OUTPUT_DIR}')
