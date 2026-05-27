import json

with open("/home/nhatbang/EXE101/PRJ/docs/crawl_data/frontend_developer.json", "r") as f:
    data = json.load(f)

print("Keys in JSON:", list(data.keys()))
print("Keys under questions:", list(data.get("questions", {}).keys()))
print("Keys under answers:", list(data.get("answers", {}).keys()))
print("Keys under tags:", list(data.get("tags", {}).keys()))

print("\nFirst question for Intern:")
print(data["questions"]["Intern"][0])
print("\nFirst answer for Intern:")
print(data["answers"]["Intern"][0])
print("\nFirst tags for Intern:")
print(data["tags"]["Intern"][0])
