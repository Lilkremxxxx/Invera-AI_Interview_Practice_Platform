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
    """Generate 5 interview questions based on user's resume and save them to database."""
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
      "text_en": "English question tailored to their CV",
      "text_vi": "Vietnamese translation of the same question",
      "category_en": "English category (e.g. Experience, Projects, Education)",
      "category_vi": "Vietnamese category (e.g. Kinh nghiệm, Dự án, Học vấn)",
      "difficulty": "medium",
      "ideal_answer_en": "Detailed ideal answer in English",
      "ideal_answer_vi": "Detailed ideal answer in Vietnamese"
    }
  ]
}

Rules:
- Generate exactly 5 questions.
- Maintain high translation quality between English and Vietnamese versions.
- The questions must be directly related to the projects, education, or experiences in the candidate's CV. Do not ask generic questions.
- Keep the difficulty of all generated questions as 'medium'.
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
                "text_vi": "Hãy chia sẻ về một dự án nổi bật nhất trong CV của bạn và vai trò của bạn trong dự án đó.",
                "text_en": "Please share one of the most prominent projects in your CV and your role in it.",
                "category_vi": "Dự án",
                "category_en": "Projects",
                "difficulty": "medium",
                "ideal_answer_vi": "Ứng viên cần trình bày rõ ràng về mục tiêu dự án, công nghệ sử dụng, đóng góp cá nhân và kết quả đạt được.",
                "ideal_answer_en": "Candidates should clearly state the project goal, technologies used, personal contributions, and key achievements."
            },
            {
                "text_vi": "Dựa trên kinh nghiệm làm việc trong CV, bạn đã từng giải quyết khó khăn kỹ thuật nào khó nhất?",
                "text_en": "Based on your work experience, what was the most challenging technical problem you solved?",
                "category_vi": "Kinh nghiệm làm việc",
                "category_en": "Work Experience",
                "difficulty": "medium",
                "ideal_answer_vi": "Câu trả lời nên áp dụng phương pháp STAR (Situation, Task, Action, Result) để mô tả quá trình xử lý vấn đề.",
                "ideal_answer_en": "The answer should apply the STAR method to describe the problem-solving process."
            },
            {
                "text_vi": "Bạn đã áp dụng những kiến thức học vấn của mình vào công việc thực tế như thế nào?",
                "text_en": "How have you applied your academic knowledge to your practical work?",
                "category_vi": "Học vấn",
                "category_en": "Education",
                "difficulty": "medium",
                "ideal_answer_vi": "Ứng viên nên kết nối các môn học/đề tài nghiên cứu với dự án hoặc công việc thực tế đã làm.",
                "ideal_answer_en": "Candidates should connect coursework or research topics with their projects or actual work."
            },
            {
                "text_vi": "Trong số các công nghệ bạn liệt kê trong CV, công nghệ nào bạn tự tin nhất và tại sao?",
                "text_en": "Among the technologies listed in your CV, which one are you most confident in and why?",
                "category_vi": "Kỹ năng chuyên môn",
                "category_en": "Technical Skills",
                "difficulty": "medium",
                "ideal_answer_vi": "Trình bày sâu về kiến thức nền tảng của công nghệ đó và ví dụ minh họa bằng một dự án cụ thể.",
                "ideal_answer_en": "Demonstrate deep understanding of the technology's fundamentals and illustrate with a specific project example."
            },
            {
                "text_vi": "Mục tiêu phát triển sự nghiệp tiếp theo của bạn phù hợp thế nào với các kinh nghiệm đã có trong CV?",
                "text_en": "How does your next career goal align with the experiences listed in your CV?",
                "category_vi": "Kinh nghiệm làm việc",
                "category_en": "Work Experience",
                "difficulty": "medium",
                "ideal_answer_vi": "Thể hiện định hướng phát triển bản thân dựa trên nền tảng sẵn có và khao khát học hỏi công nghệ mới.",
                "ideal_answer_en": "Show self-development direction based on existing foundations and the eagerness to learn new technologies."
            }
        ]
        questions = fallback_questions

    # Save to database
    # In a transaction, delete old CV questions and insert new ones
    async with db.transaction():
        await db.execute("DELETE FROM questions WHERE user_id = $1", user_id)
        for q in questions:
            await db.execute(
                """
                INSERT INTO questions (
                    role, level, major, text, category, difficulty, ideal_answer,
                    text_vi, text_en, category_vi, category_en, ideal_answer_vi, ideal_answer_en,
                    tags, user_id
                ) VALUES (
                    'cv', 'cv', 'cv', $1, $2, $3, $4,
                    $5, $6, $7, $8, $9, $10,
                    ARRAY['cv-question']::TEXT[], $11
                )
                """,
                q.get("text_vi") or q.get("text_en"),
                q.get("category_vi") or q.get("category_en"),
                q.get("difficulty") or "medium",
                q.get("ideal_answer_vi") or q.get("ideal_answer_en"),
                q.get("text_vi"),
                q.get("text_en"),
                q.get("category_vi"),
                q.get("category_en"),
                q.get("ideal_answer_vi"),
                q.get("ideal_answer_en"),
                user_id
            )
    return questions
