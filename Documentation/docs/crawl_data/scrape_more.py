#!/usr/bin/env python3
"""Scrape more marketing interview questions from additional sources."""
import requests
import re
import json
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

def fetch_text(url, timeout=15):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        text = soup.get_text(separator='\n', strip=True)
        return text
    except Exception as e:
        return f"ERROR: {e}"

def extract_questions(text, min_len=15):
    questions = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line or len(line) < min_len:
            continue
        if '?' in line:
            q = re.sub(r'^\d+[\.\)]\s*', '', line.strip())
            q = re.sub(r'^Q\d*[\.\):\s]*', '', q)
            if len(q) > 10 and len(q) < 500:
                questions.append(q)
    return questions

sources = [
    ("Marketing91", "https://www.marketing91.com/marketing-interview-questions/"),
    ("Edureka", "https://www.edureka.co/blog/interview-questions/digital-marketing-interview-questions/"),
    ("Intellipaat", "https://intellipaat.com/blog/interview-question/digital-marketing-interview-questions/"),
    ("GreatLearning_DM", "https://www.mygreatlearning.com/blog/digital-marketing-interview-questions/"),
    ("AnalyticsVidhya", "https://www.analyticsvidhya.com/blog/2022/01/top-100-digital-marketing-interview-questions/"),
    ("MarketingTutor", "https://www.marketingtutor.net/marketing-interview-questions/"),
]

all_new = []
for name, url in sources:
    print(f"=== {name} ===")
    text = fetch_text(url)
    qs = extract_questions(text)
    print(f"  Found {len(qs)} questions")
    all_new.extend(qs)
    import time
    time.sleep(1)

print(f"\nTotal new: {len(all_new)}")

# Load existing
try:
    with open('/home/nhatbang/EXE101/PRJ/docs/crawl_data/raw_questions.json') as f:
        existing = json.load(f)
except:
    existing = []

combined = list(set(existing + all_new))
print(f"Combined unique: {len(combined)}")

with open('/home/nhatbang/EXE101/PRJ/docs/crawl_data/raw_questions.json', 'w') as f:
    json.dump(combined, f, indent=2)
