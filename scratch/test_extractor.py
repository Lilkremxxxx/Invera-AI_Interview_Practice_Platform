import asyncio
import sys
import uuid
from pathlib import Path
import json

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "BE"))

from app.core.config import settings
import asyncpg
from app.services.deepseek_client import create_chat_completion

def unescape_raw_value(val: str) -> str:
    result = []
    i = 0
    n = len(val)
    while i < n:
        if val[i] == '\\' and i + 1 < n:
            next_char = val[i+1]
            if next_char == 'n':
                result.append('\n')
            elif next_char == 't':
                result.append('\t')
            elif next_char == '"':
                result.append('"')
            elif next_char == '\\':
                result.append('\\')
            elif next_char == 'r':
                result.append('\r')
            else:
                result.append(next_char)
            i += 2
        else:
            result.append(val[i])
            i += 1
    return "".join(result)

def extract_and_clean_json(s: str) -> tuple[str, str]:
    s = s.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    s = s.strip()
    
    idx_eval = s.find('"evaluation_report"')
    idx_plan = s.find('"practice_plan"')
    
    if idx_eval == -1 or idx_plan == -1:
        raise ValueError("Could not find required keys in LLM output")
        
    if idx_eval < idx_plan:
        # eval is first
        colon_first = s.find(':', idx_eval)
        start_first = s.find('"', colon_first)
        end_first = s.rfind('"', start_first + 1, idx_plan)
        eval_raw = s[start_first + 1 : end_first]
        
        colon_second = s.find(':', idx_plan)
        start_second = s.find('"', colon_second)
        end_second = s.rfind('"')
        plan_raw = s[start_second + 1 : end_second]
    else:
        # plan is first
        colon_first = s.find(':', idx_plan)
        start_first = s.find('"', colon_first)
        end_first = s.rfind('"', start_first + 1, idx_eval)
        plan_raw = s[start_first + 1 : end_first]
        
        colon_second = s.find(':', idx_eval)
        start_second = s.find('"', colon_second)
        end_second = s.rfind('"')
        eval_raw = s[start_second + 1 : end_second]
        
    evaluation_report = unescape_raw_value(eval_raw)
    practice_plan = unescape_raw_value(plan_raw)
    
    return evaluation_report, practice_plan

async def main():
    conn = await asyncpg.connect(
        host=settings.pg_host,
        port=settings.pg_port,
        database=settings.pg_dbname,
        user=settings.pg_user,
        password=settings.pg_password,
    )
    
    session_id = uuid.UUID("da4f6a7a-9aca-4e2e-9f9f-72acfe04258b")
    
    # Load session info
    session_row = await conn.fetchrow(
        "SELECT id, role, level, major, status FROM sessions WHERE id = $1",
        session_id
    )
    
    role = session_row["role"]
    level = session_row["level"]
    major = session_row["major"]
    
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
    print(repr(raw_content[:200]) + "..." + repr(raw_content[-200:]))
    
    try:
        eval_rep, prac_plan = extract_and_clean_json(raw_content)
        print("\n--- SUCCESS! ---")
        print("Evaluation Report length:", len(eval_rep))
        print("Practice Plan length:", len(prac_plan))
        print("\n--- REPORT SAMPLE ---")
        print(eval_rep[:300])
        print("\n--- PLAN SAMPLE ---")
        print(prac_plan[:300])
    except Exception as e:
        print("\n--- EXTRACTION ERROR ---")
        print(e)
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
