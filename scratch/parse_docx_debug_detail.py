import docx
import re

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

ROLE_MAP = {
    'Frontend Developer': ('technology', 'frontend'),
    'Backend Developer': ('technology', 'backend'),
    'Full Stack Developer': ('technology', 'fullstack'),
    'Data Scientist': ('technology', 'data_scientist'),
    'Machine Learning Engineer': ('technology', 'machine_learning_engineer'),
    'DevOps Engineer': ('technology', 'devops_engineer'),
    'Product Manager': ('technology', 'product_manager'),
    'UX Designer': ('technology', 'ux_designer'),
    'Business Analyst': ('business', 'business_analyst'),
    'Operations Analyst': ('business', 'operations_analyst'),
    'Sales Representative': [('technology', 'sales_representative'), ('business', 'sales_executive')], # special role
    'Marketing Specialist': ('business', 'marketing_executive'),
    'Marketing Manager': ('technology', 'marketing_manager'),
    'Financial Analyst': ('finance', 'financial_analyst'),
    'Accountant': ('finance', 'accountant'),
    'Auditor': ('finance', 'auditor'),
    'Investment Banking Analyst': ('finance', 'investment_banking_analyst'),
}

current_major = None
current_role = None
current_level = None

transition_count = 0

for idx, para in enumerate(doc.paragraphs):
    text = para.text.strip()
    style_name = para.style.name
    
    if not text:
        continue
        
    # Print paragraph if it is style Heading 1, 2, or 3
    if style_name.startswith('Heading') or text.startswith("NHÓM ") or text.startswith("Cấp độ:") or text in ROLE_MAP:
        print(f"[{idx}] Style: {style_name} | Text: {text}")
        transition_count += 1
        if transition_count > 100:
            print("... and so on ...")
            break
