import docx

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

for idx, para in enumerate(doc.paragraphs):
    text = para.text.strip()
    style_name = para.style.name
    
    if style_name.startswith('Heading'):
        print(f"[{idx}] {style_name}: {text}")
