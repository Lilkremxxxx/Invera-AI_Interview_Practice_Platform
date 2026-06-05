#!/usr/bin/env python3
"""Fix all incorrect generate_generic_fallback position references."""
import re

path = '/home/nhatbang/EXE101/PRJ/docs/crawl_data/generate_answers.py'

with open(path, 'r') as f:
    content = f.read()

# Each f-string message uniquely identifies which fallback call belongs to which position
# {f-string message text → correct position name}
fixes = {
    "In a {level.lower()} {position} interview, this question explores your understanding of {question}.": "position",  # use the variable
    "For a {level.lower()} Backend Developer: {question}.": "Backend Developer",
    "For {level.lower()} Data Scientist: {question}.": "Data Scientist",
    "For {level.lower()} ML Engineer: {question}.": "Machine Learning Engineer",
    "For {level.lower()} DevOps Engineer: {question}.": "DevOps Engineer",
    "For a {level.lower()} Product Manager: {question}.": "Product Manager",
    "For a {level.lower()} UX Designer: {question}.": "UX Designer",
    "For a {level.lower()} Business Analyst: {question}.": "Business Analyst",
    "For a {level.lower()} Operations Analyst: {question}.": "Operations Analyst",
    "For a {level.lower()} Sales Representative: {question}.": "Sales Representative",
    "For a {level.lower()} Marketing Specialist: {question}.": "Marketing Specialist",
    "For a {level.lower()} Marketing Manager: {question}.": "Marketing Manager",
    "For a {level.lower()} Financial Analyst: {question}.": "Financial Analyst",
    "For a {level.lower()} Accountant: {question}.": "Accountant",
}

for msg, pos_name in fixes.items():
    # Build regex: find the line that contains this f-string message, then fix the fallback on same line
    # Escape the message for regex, but handle the f-string placeholders
    msg_escaped = re.escape(msg).replace(r'\{level\.lower\(\)\}', r'\{level\.lower\(\)\}').replace(r'\{question\}' , r'\{question\}').replace(r'\{position\}' , r'\{position\}')
    
    # Find lines with this message
    pattern = fr"({re.escape(msg_escaped)}.*)generate_generic_fallback\(\"[^\"]+\", level, question\)"
    replacement = f"\\1generate_generic_fallback('{pos_name}', level, question)" if pos_name != 'position' else f"\\1generate_generic_fallback(position, level, question)"
    
    content = re.sub(pattern, replacement, content)
    
with open(path, 'w') as f:
    f.write(content)
print("Done")
