import json
import logging
import re
import uuid
from pathlib import Path
from typing import Any
import asyncpg
from pypdf import PdfReader
from app.services.deepseek_client import create_chat_completion

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract raw text content from a PDF file using pypdf."""
    if not pdf_path.exists():
        raise ValueError(f"File not found: {pdf_path}")
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
        raise ValueError(f"Không thể đọc file PDF: {str(e)}")

def _parse_json_content(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)

async def generate_and_save_cv_questions(db: asyncpg.Connection, user_id: uuid.UUID, resume_text: str) -> list[dict]:
    """Generate 5 interview questions based on user's resume for user-scoped storage."""
    if not resume_text or not resume_text.strip():
        logger.warning(f"Empty resume text provided for user {user_id}. Skipping question generation.")
        return []

    system_prompt = """
You are an expert technical interviewer. Based on the candidate's resume/CV text, generate EXACTLY 5 tailored interview questions.
These questions should assess the candidate's specific work experience, education, projects, and skills mentioned in their CV.

Return a STRICT JSON object only with this exact shape:
{
  "questions": [
    {
      "text_en": "I saw in your CV that ... Can you elaborate?",
      "text_vi": "Tôi thấy trong CV bạn có ghi ... bạn có thể nói rõ hơn không?",
      "category_en": "English category (e.g. Projects, Technical Skills, Education, Experience, Behavioral)",
      "category_vi": "Vietnamese category (e.g. Dự án, Kỹ năng chuyên môn, Học vấn, Kinh nghiệm, Tình huống hành vi)",
      "difficulty": "medium",
      "ideal_answer_en": "Detailed ideal answer in English outlining expected technical concepts or behavioral response details",
      "ideal_answer_vi": "Detailed ideal answer in Vietnamese outlining expected technical concepts or behavioral response details",
      "tags": ["CV-based"]
    }
  ]
}

Rules for Question Generation:
- Generate exactly 5 questions.
- Maintain a balanced mix:
  - 3 to 4 questions should be technical and project-focused, assessing the candidate's specific domain knowledge, technical correctness, practical depth, and understanding of skills, databases, tools, or projects listed in their CV (e.g., if their CV lists Postgres, ask a technical question about PostgreSQL database usage or RAG integration).
  - 1 to 2 questions should be behavioral/situational questions (category: 'Behavioral' / 'Tình huống hành vi') relating to their experiences or projects mentioned in their CV (e.g., how they handled a specific technical challenge, team conflict, or resolved a bug under pressure).
- Do NOT generate questions that force the candidate to structure answers using the STAR method. Keep the scoring/evaluation expectations flexible.
- Allowed categories are: "Projects" / "Dự án", "Technical Skills" / "Kỹ năng chuyên môn", "Experience" / "Kinh nghiệm", "Education" / "Học vấn", or "Behavioral" / "Tình huống hành vi".
- The ideal answers should define the technical expectations (e.g., if asking about PostgreSQL, specify the expectations for basic usage up to advanced features like RAG vector database indexing or query optimization) or key behavioral indicator expectations.
- Maintain high translation quality between English and Vietnamese versions.
- Keep the difficulty of all generated questions as 'medium'.
- Every question must explicitly open with the CV-reference framing. Examples:
  - Vietnamese: "Tôi thấy trong CV bạn có ghi ..."
  - English: "I saw in your CV that ..."
- Every question must include the tag "CV-based".
"""

    user_prompt = f"""
Candidate CV text:
\"\"\"
{resume_text[:6000]}
\"\"\"

Generate exactly 5 bilingual questions in JSON.
"""

    try:
        response = await create_chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )
        payload = _parse_json_content(response["content"])
        questions = payload.get("questions")
        if not isinstance(questions, list) or len(questions) != 5:
            raise ValueError(f"DeepSeek response did not contain exactly 5 questions. Got: {type(questions)}")
    except Exception as e:
        logger.error(f"Error calling DeepSeek for CV questions: {e}")
        # Return fallback questions if DeepSeek fails so we don't break the profile upload flow entirely
        fallback_questions = [
            {
                "text_vi": "Tôi thấy trong CV bạn có ghi một dự án nổi bật. Bạn có thể chia sẻ rõ hơn về dự án đó và vai trò của bạn không?",
                "text_en": "I saw in your CV that you highlighted a major project. Can you explain that project and your role in more detail?",
                "category_vi": "Dự án",
                "category_en": "Projects",
                "difficulty": "medium",
                "ideal_answer_vi": "Ứng viên cần trình bày rõ ràng về mục tiêu dự án, công nghệ sử dụng, đóng góp cá nhân và kết quả đạt được.",
                "ideal_answer_en": "Candidates should clearly state the project goal, technologies used, personal contributions, and key achievements.",
                "tags": ["CV-based"],
            },
            {
                "text_vi": "Tôi thấy trong CV bạn có ghi kinh nghiệm xử lý các bài toán kỹ thuật. Bạn có thể kể rõ hơn về một khó khăn kỹ thuật hoặc sự cố nghiêm trọng mà bạn đã trực tiếp giải quyết không?",
                "text_en": "I saw in your CV that you handled technical challenges. Can you walk me through a serious technical issue that you directly resolved?",
                "category_vi": "Kinh nghiệm",
                "category_en": "Experience",
                "difficulty": "medium",
                "ideal_answer_vi": "Ứng viên giải thích rõ nguyên nhân kỹ thuật của vấn đề, cách điều tra và giải pháp xử lý triệt để (như viết test case, sửa lỗi bộ nhớ, tối ưu câu lệnh).",
                "ideal_answer_en": "The candidate should explain the technical root cause of the issue, how it was investigated, and the technical solution implemented (such as writing tests, fixing memory leaks, or optimizing queries).",
                "tags": ["CV-based"],
            },
            {
                "text_vi": "Tôi thấy trong CV bạn có ghi kinh nghiệm làm việc nhóm. Bạn có thể kể lại một tình huống bạn gặp mâu thuẫn ý kiến với đồng nghiệp hoặc quản lý và cách bạn xử lý không?",
                "text_en": "I saw in your CV that you worked closely with teams. Can you describe a disagreement with a teammate or manager and how you handled it?",
                "category_vi": "Tình huống hành vi",
                "category_en": "Behavioral",
                "difficulty": "medium",
                "ideal_answer_vi": "Ứng viên chỉ ra rõ nguyên nhân bất đồng, cách giao tiếp tôn trọng, thấu hiểu quan điểm đối phương và cùng tìm ra giải pháp trung hòa hoặc thuyết phục dựa trên số liệu/thực tế.",
                "ideal_answer_en": "The candidate should identify the cause of the disagreement, demonstrate respectful communication, understanding of the other person's perspective, and how they reached a compromise or persuaded them based on data/facts.",
                "tags": ["CV-based"],
            },
            {
                "text_vi": "Tôi thấy trong CV bạn có ghi nhiều công nghệ khác nhau. Công nghệ nào bạn tự tin nhất và tại sao?",
                "text_en": "I saw in your CV that you listed several technologies. Which one are you most confident with and why?",
                "category_vi": "Kỹ năng chuyên môn",
                "category_en": "Technical Skills",
                "difficulty": "medium",
                "ideal_answer_vi": "Trình bày sâu về kiến thức nền tảng của công nghệ đó và ví dụ minh họa bằng một dự án cụ thể.",
                "ideal_answer_en": "Demonstrate deep understanding of the technology's fundamentals and illustrate with a specific project example.",
                "tags": ["CV-based"],
            },
            {
                "text_vi": "Tôi thấy trong CV bạn có ghi các công nghệ giải quyết những bài toán tương tự. Bạn có thể so sánh hai công nghệ hoặc thư viện đó và giải thích vì sao bạn chọn giải pháp hiện tại không?",
                "text_en": "I saw in your CV that you worked with technologies that solve similar problems. Can you compare two of them and explain why you chose the current solution?",
                "category_vi": "Kỹ năng chuyên môn",
                "category_en": "Technical Skills",
                "difficulty": "medium",
                "ideal_answer_vi": "Ứng viên so sánh khách quan về ưu nhược điểm (như hiệu năng, sự dễ dàng tích hợp, độ bảo trì) và đưa ra lý do phù hợp ngữ cảnh dự án.",
                "ideal_answer_en": "Candidates should objectively compare pros and cons (such as performance, ease of integration, maintainability) and provide reasons suitable for the project context.",
                "tags": ["CV-based"],
            }
        ]
        questions = fallback_questions

    normalized_questions: list[dict] = []
    for q in questions:
        tags = q.get("tags") if isinstance(q.get("tags"), list) else []
        if "CV-based" not in tags:
            tags = [*tags, "CV-based"]
        normalized_questions.append(
            {
                "text_vi": q.get("text_vi") or q.get("text_en"),
                "text_en": q.get("text_en") or q.get("text_vi"),
                "category_vi": q.get("category_vi") or q.get("category_en") or "Dự án",
                "category_en": q.get("category_en") or q.get("category_vi") or "Projects",
                "difficulty": q.get("difficulty") or "medium",
                "ideal_answer_vi": q.get("ideal_answer_vi") or q.get("ideal_answer_en") or "",
                "ideal_answer_en": q.get("ideal_answer_en") or q.get("ideal_answer_vi") or "",
                "tags": tags,
            }
        )
    return normalized_questions
