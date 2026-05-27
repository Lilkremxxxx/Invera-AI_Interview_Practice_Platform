#!/usr/bin/env python3
"""Fix all generate_generic_fallback(position, level, question) calls in generate_answers.py"""
import re

path = '/home/nhatbang/EXE101/PRJ/docs/crawl_data/generate_answers.py'

function_position_map = {
    'generate_backend_answer': 'Backend Developer',
    'generate_datascience_answer': 'Data Scientist',
    'generate_ml_answer': 'Machine Learning Engineer',
    'generate_devops_answer': 'DevOps Engineer',
    'generate_pm_answer': 'Product Manager',
    'generate_ux_answer': 'UX Designer',
    'generate_ba_answer': 'Business Analyst',
    'generate_ops_answer': 'Operations Analyst',
    'generate_sales_answer': 'Sales Representative',
    'generate_mktg_spec_answer': 'Marketing Specialist',
    'generate_mktg_mgr_answer': 'Marketing Manager',
    'generate_fin_answer': 'Financial Analyst',
    'generate_acct_answer': 'Accountant',
    'generate_audit_answer': 'Auditor',
    'generate_ib_answer': 'Investment Banking Analyst',
}

with open(path, 'r') as f:
    content = f.read()

for func_name, pos_name in function_position_map.items():
    # Find the last occurrence of generate_generic_fallback(position, level, question) within this function
    # We need to find the function definition and the call within it
    func_pattern = re.escape(func_name)
    fallback_pattern = 'generate_generic_fallback\\(position, level, question\\)'
    
    # Find the function start
    func_starts = [m.start() for m in re.finditer(f'def {func_pattern}\\b', content)]
    
    for func_start in func_starts:
        # Find the function body end (next def at same indent level, or end of file)
        # First, find the first occurrence of fallback call AFTER this function
        search_from = func_start
        while True:
            next_def = re.search(r'\ndef ', content[search_from+1:])
            func_end = search_from + 1 + next_def.start() if next_def else len(content)
            
            # Search in this function's body
            body = content[search_from:func_end]
            if 'generate_generic_fallback(position, level, question)' in body:
                # Replace only the FIRST occurrence in this function body
                # (there should only be one per function)
                content = content[:func_end].replace('generate_generic_fallback(position, level, question)', 
                    f'generate_generic_fallback("{pos_name}", level, question)', 1) + content[func_end:]
                print(f'Fixed {func_name} -> {pos_name}')
            break

with open(path, 'w') as f:
    f.write(content)
print('Done - all fixes applied')
