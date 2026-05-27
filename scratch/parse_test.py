import docx
import re

def parse_docx(path):
    doc = docx.Document(path)
    
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
        'Sales Representative': ('business', 'sales_executive'),  # default mapping for role detection
        'Marketing Specialist': ('business', 'marketing_executive'),
        'Marketing Manager': ('technology', 'marketing_manager'),
        'Financial Analyst': ('finance', 'financial_analyst'),
        'Accountant': ('finance', 'accountant'),
        'Auditor': ('finance', 'auditor'),
        'Investment Banking Analyst': ('finance', 'investment_banking_analyst'),
    }

    LEVEL_MAP = {
        'intern': 'intern',
        'fresher': 'fresher',
        'junior': 'junior',
        'middle': 'mid',
        'mid': 'mid',
        'senior': 'senior'
    }

    current_major = None
    current_role_name = None
    current_level = None
    
    questions = []
    
    current_q = None
    
    for idx, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if not text:
            continue
            
        # Detect Major
        if text.startswith("NHÓM "):
            major_part = text.split("NHÓM ")[1].strip().lower()
            if "tech" in major_part:
                current_major = "technology"
            elif "business" in major_part:
                current_major = "business"
            elif "finance" in major_part:
                current_major = "finance"
            continue
            
        # Detect Level
        if text.startswith("Cấp độ:"):
            # E.g. "Cấp độ: Intern (109 câu hỏi)"
            match_lvl = re.search(r'Cấp độ:\s*([a-zA-Z]+)', text)
            if match_lvl:
                lvl_str = match_lvl.group(1).lower()
                current_level = LEVEL_MAP.get(lvl_str, lvl_str)
            continue
            
        # Detect Role
        if text in ROLE_MAP:
            current_role_name = text
            continue
            
        # Parse Question
        if text.startswith("Câu "):
            match_q = re.match(r'Câu \d+:\s*(.*)', text)
            if match_q:
                q_text = match_q.group(1).strip()
                current_q = {
                    'role_name': current_role_name,
                    'level': current_level,
                    'text': q_text,
                    'ideal_answer': '',
                    'tags': []
                }
                questions.append(current_q)
            continue
            
        # Parse Answer
        if text.startswith("Trả lời:") and current_q:
            ans_text = text.replace("Trả lời:", "").strip()
            current_q['ideal_answer'] = ans_text
            continue
            
        # Parse Tags
        if text.startswith("Tags:") and current_q:
            tags_text = text.replace("Tags:", "").strip()
            # Split tags by | and clean
            tags = [t.strip().strip('#') for t in tags_text.split('|') if t.strip()]
            current_q['tags'] = tags
            continue

    return questions

questions = parse_docx("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")
print(f"Total parsed questions: {len(questions)}")
print("\nFirst 3 parsed questions sample:")
for q in questions[:3]:
    print(q)
