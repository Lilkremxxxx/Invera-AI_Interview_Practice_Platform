import docx
import re

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

def print_role_samples():
    current_major = None
    current_role = None
    current_level = None
    
    question_count = 0
    role_info = {}
    
    for idx, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if not text:
            continue
            
        if text.startswith("NHÓM "):
            current_major = text.split("NHÓM ")[1].strip()
            continue
            
        if text.startswith("Cấp độ:"):
            # E.g. "Cấp độ: Intern (109 câu hỏi)"
            current_level = text.split(":")[1].strip().split()[0]
            continue
            
        # Detect role
        # If it's a heading of a role, e.g. "Frontend Developer", "Marketing Specialist"
        if (len(text) < 50 and 
            not text.startswith("Câu ") and 
            not text.startswith("Trả lời:") and 
            not text.startswith("Tags:") and 
            not text.startswith("───") and 
            not text.startswith("Tổng số") and
            not text.startswith("Theo Cấp Độ") and
            not text.startswith("17 Vị trí") and
            not text.startswith("MỤC LỤC") and
            not text.startswith("THỐNG KÊ") and
            "............." not in text):
            current_role = text
            role_info[current_role] = []
            
        if text.startswith("Tags:") and current_role:
            role_info[current_role].append(text)

    print("--- Role Tag Samples ---")
    for r, tags_list in role_info.items():
        print(f"Role: {r}, Total parsed questions: {len(tags_list)}")
        if tags_list:
            print(f"  Sample tags: {tags_list[0]}")
            print(f"  Sample tags (last): {tags_list[-1]}")

print_role_samples()
