import docx

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

roles_found = []
levels_found = []
majors_found = []

current_major = None
current_role = None
current_level = None

for idx, para in enumerate(doc.paragraphs):
    text = para.text.strip()
    if not text:
        continue
    
    # Detect Major Groups
    if text.startswith("NHÓM "):
        major_name = text.split("NHÓM ")[1].strip()
        print(f"Index {idx}: Found Major Group -> {text}")
        continue
        
    # Detect Roles (Usually single line after a Major Group, not containing "Cấp độ", "Tổng", "MỤC LỤC", etc.)
    # Let's see if we can identify role lines:
    # A line that is not a question, not an answer, not tags, not separator, and has a title-like structure.
    if (text.startswith("Câu ") or 
        text.startswith("Trả lời:") or 
        text.startswith("Tags:") or 
        text.startswith("───") or 
        text.startswith("Tổng số") or
        text.startswith("Theo Cấp Độ") or
        text.startswith("17 Vị trí") or
        text.startswith("MỤC LỤC") or
        "............." in text):
        continue
        
    if text.startswith("Cấp độ:"):
        # E.g. "Cấp độ: Intern (109 câu hỏi)"
        level_part = text.split(":")[1].strip().split()[0]
        # print(f"  Index {idx}: Level -> {level_part}")
        continue
        
    if len(text) < 50:
        print(f"Index {idx}: Potential Role/Header -> {text}")
