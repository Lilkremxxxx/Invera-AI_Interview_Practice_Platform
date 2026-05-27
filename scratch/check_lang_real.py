import docx
import re

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

# Helper to check if text contains Vietnamese accents
def is_vietnamese(text):
    return bool(re.search(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', text, re.IGNORECASE))

vi_q_count = 0
en_q_count = 0
samples_vi = []
samples_en = []

for para in doc.paragraphs:
    text = para.text.strip()
    if text.startswith("Câu "):
        # Extract the question text
        match = re.match(r'Câu \d+:\s*(.*)', text)
        if match:
            q_text = match.group(1).strip()
            if is_vietnamese(q_text):
                vi_q_count += 1
                if len(samples_vi) < 5:
                    samples_vi.append(q_text)
            else:
                en_q_count += 1
                if len(samples_en) < 5:
                    samples_en.append(q_text)

print(f"Total questions: {vi_q_count + en_q_count}")
print(f"Vietnamese question texts: {vi_q_count}")
print(f"English question texts: {en_q_count}")
print("\nVietnamese Samples:")
for s in samples_vi:
    print("-", s)
print("\nEnglish Samples:")
for s in samples_en:
    print("-", s)
