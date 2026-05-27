import asyncio
import sys
import uuid
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "BE"))

from app.core.config import settings
import asyncpg
from app.services.evaluation import generate_session_evaluation_and_plan
from app.services.deepseek_client import create_chat_completion

async def main():
    conn = await asyncpg.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        database=settings.pg_dbname,
        user=settings.pg_user,
        password=settings.pg_password,
    )
    
    session_id = uuid.UUID("6ced147b-2956-4fb8-9463-fa309a05b485")
    
    # Reset columns
    await conn.execute(
        "UPDATE sessions SET evaluation_report = NULL, practice_plan = NULL WHERE id = $1",
        session_id
    )
    
    # Load session info
    session_row = await conn.fetchrow(
        "SELECT id, role, level, major, status FROM sessions WHERE id = $1",
        session_id
    )
    
    role = session_row["role"]
    level = session_row["level"]
    major = session_row["major"]
    
    # 1. Fetch answers and questions
    rows = await conn.fetch(
        """
        SELECT q.text AS question_text, q.category, a.answer_text, a.score::float AS score, a.feedback
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.session_id = $1
        ORDER BY a.submitted_at
        """,
        session_id,
    )
    
    history = []
    for r in rows:
        history.append({
            "question": r["question_text"],
            "category": r["category"],
            "candidate_answer": r["answer_text"],
            "score": r["score"],
            "feedback": r["feedback"],
        })
        
    system_prompt = (
        "Bạn là một chuyên gia đánh giá kỹ năng phỏng vấn tuyển dụng và lên kế hoạch học tập.\n"
        "Hãy dựa trên các câu hỏi, câu trả lời, điểm số (thang điểm 10) và nhận xét chi tiết của AI cho từng câu của ứng viên để:\n"
        "1. Tạo một Báo cáo đánh giá (Evaluation Report) chi tiết bằng tiếng Việt.\n"
        "2. Tạo một Kế hoạch luyện tập (Practice Plan) chi tiết bằng tiếng Việt.\n\n"
        "Báo cáo đánh giá (Evaluation Report) phải chỉ ra các điểm tốt (Strengths), điểm chưa tốt/điểm cần cải thiện (Weaknesses / Areas for Improvement) chi tiết kèm gợi ý sửa đổi cho ứng viên.\n"
        "Kế hoạch luyện tập (Practice Plan) phải đưa ra lộ trình cụ thể (ví dụ theo tuần/ngày), các chủ đề kiến thức cần học thêm hoặc ôn tập, và các bài tập thực hành/tips cải thiện kỹ năng phỏng vấn.\n\n"
        "Đầu ra PHẢI là một JSON object hợp lệ chứa chính xác hai trường: 'evaluation_report' and 'practice_plan', cả hai đều có giá trị là chuỗi Markdown tiếng Việt phong phú, định dạng đẹp mắt.\n"
        "Không kèm bất kỳ văn bản nào khác ngoài JSON object này.\n"
        "Chú ý: Hãy đảm bảo các ký tự xuống dòng trong chuỗi Markdown được escape đúng thành '\\n' để đảm bảo chuỗi JSON hợp lệ."
    )
    
    import json
    user_payload = json.dumps({
        "role": role,
        "level": level,
        "major": major,
        "interview_session": history,
    }, ensure_ascii=False)
    
    print("Calling LLM...")
    response = await create_chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_payload,
        temperature=0.3,
    )
    
    raw_content = response["content"]
    print("\n--- RAW CONTENT ---")
    print(repr(raw_content))
    print("\n--- LENGTH OF RAW CONTENT ---")
    print(len(raw_content))
    
    from app.services.evaluation import clean_llm_json
    cleaned = clean_llm_json(raw_content)
    print("\n--- CLEANED CONTENT ---")
    print(repr(cleaned[:500]))
    
    try:
        data = json.loads(cleaned)
        print("\n--- SUCCESS! ---")
        print(f"Keys: {data.keys()}")
    except Exception as e:
        print("\n--- JSON LOAD ERROR ---")
        print(e)
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
