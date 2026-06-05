import json, os, glob

files = sorted(glob.glob('*.json'))
total_q = 0
skip = ('raw_questions.json',)

for f in files:
    if f in skip:
        continue
    with open(f, 'r') as fp:
        data = json.load(fp)
    pos = data['position']
    qs = data['questions']
    pos_total = sum(len(v) for v in qs.values())
    total_q += pos_total
    levels_str = ' | '.join(f'{k}: {len(v)}' for k,v in qs.items())
    print(f'{pos:40s} | {levels_str} | T: {pos_total}')

print()
print(f'GRAND TOTAL: {total_q} questions')
print(f'DOCX size: {os.path.getsize("/home/nhatbang/EXE101/PRJ/docs/Crawl_qst.docx")/1024:.1f} KB')
