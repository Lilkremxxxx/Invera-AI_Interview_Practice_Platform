#!/usr/bin/env python3
"""Scrape marketing interview questions from multiple sources."""
import requests
import re
import json
import time
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def fetch_text(url, timeout=15):
    """Fetch and extract text from a URL."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')
        # Remove scripts and styles
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
        text = soup.get_text(separator='\n', strip=True)
        return text
    except Exception as e:
        return f"ERROR: {e}"

def extract_questions(text, min_len=15):
    """Extract questions from text."""
    questions = []
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line or len(line) < min_len:
            continue
        # Check if it looks like a question
        if '?' in line:
            # Clean up
            q = line.strip()
            # Remove leading numbers
            q = re.sub(r'^\d+[\.\)]\s*', '', q)
            q = re.sub(r'^Q\d*[\.\):\s]*', '', q)
            if len(q) > 10 and len(q) < 500:
                questions.append(q)
    return questions

# Source 1: Simplilearn
print("=== Source 1: Simplilearn ===")
text = fetch_text("https://www.simplilearn.com/marketing-interview-questions-and-answers-article")
q1 = extract_questions(text)
print(f"Found {len(q1)} questions")

# Source 2: Indeed Career Guide
print("\n=== Source 2: Indeed ===")
text = fetch_text("https://www.indeed.com/career-advice/interviewing/marketing-interview-questions")
q2 = extract_questions(text)
print(f"Found {len(q2)} questions")

# Source 3: Marketing91
print("\n=== Source 3: Marketing91 ===")
text = fetch_text("https://www.marketing91.com/marketing-interview-questions/")
q3 = extract_questions(text)
print(f"Found {len(q3)} questions")

# Source 4: MyGreatLearning
print("\n=== Source 4: MyGreatLearning ===")
text = fetch_text("https://www.mygreatlearning.com/blog/marketing-interview-questions/")
q4 = extract_questions(text)
print(f"Found {len(q4)} questions")

# Source 5: Careerminds / other
print("\n=== Source 5: UpGrad ===")
text = fetch_text("https://www.upgrad.com/blog/marketing-interview-questions/")
q5 = extract_questions(text)
print(f"Found {len(q5)} questions")

# Source 6: Edureka
print("\n=== Source 6: Edureka ===")
text = fetch_text("https://www.edureka.co/blog/interview-questions/marketing-interview-questions/")
q6 = extract_questions(text)
print(f"Found {len(q6)} questions")

# Source 7: Digital Marketing specific
print("\n=== Source 7: Digital Marketing ===")
text = fetch_text("https://websitetooltester.com/en/blog/digital-marketing-interview-questions")
q7 = extract_questions(text)
print(f"Found {len(q7)} questions")

# Source 8: Content Marketing
print("\n=== Source 8: Content Marketing ===")
text = fetch_text("https://contentmarketinginstitute.com/articles/content-marketing-interview-questions/")
q8 = extract_questions(text)
print(f"Found {len(q8)} questions")

# Combine unique questions
all_questions = list(set(q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8))
print(f"\nTotal unique questions: {len(all_questions)}")

# Save raw for inspection
with open('/home/nhatbang/EXE101/PRJ/docs/crawl_data/raw_questions.json', 'w') as f:
    json.dump(all_questions, f, indent=2)

print("Saved to raw_questions.json")
