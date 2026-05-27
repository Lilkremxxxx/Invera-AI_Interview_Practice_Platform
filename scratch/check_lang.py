import docx
import re

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

vietnamese_count = 0
english_count = 0

# Helper to check if text contains Vietnamese accents
def is_vietnamese(text):
    # Match common Vietnamese accented characters
    return bool(re.search(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', text, re.IGNORECASE))

q_samples = []
for para in doc.paragraphs:
    text = para.text.strip()
    if text.startswith("Câu "):
        if is_vietnamese(text):
            vietnamese_count += 1
            if len(q_samples) < 5:
                q_samples.append(("VI", text))
        else:
            english_count += 1
            if len(q_samples) < 5:
                q_samples.append(("EN", text))

print(f"Total questions: {vietnamese_count + english_count}")
print(f"Vietnamese questions: {vietnamese_count}")
print(f"English questions: {english_count}")
print("\nSamples:")
for lang, q in q_samples:
    print(f"[{lang}] {q}")
