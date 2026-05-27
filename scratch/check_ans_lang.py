import docx
import re

doc = docx.Document("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")

def is_vietnamese(text):
    return bool(re.search(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', text, re.IGNORECASE))

vi_ans_count = 0
en_ans_count = 0
samples_vi = []
samples_en = []

for para in doc.paragraphs:
    text = para.text.strip()
    if text.startswith("Trả lời:"):
        ans_text = text.replace("Trả lời:", "").strip()
        if is_vietnamese(ans_text):
            vi_ans_count += 1
            if len(samples_vi) < 5:
                samples_vi.append(ans_text)
        else:
            en_ans_count += 1
            if len(samples_en) < 5:
                samples_en.append(ans_text)

print(f"Total answers: {vi_ans_count + en_ans_count}")
print(f"Vietnamese answers: {vi_ans_count}")
print(f"English answers: {en_ans_count}")
print("\nVietnamese Samples:")
for s in samples_vi:
    print("-", s)
print("\nEnglish Samples:")
for s in samples_en:
    print("-", s)
