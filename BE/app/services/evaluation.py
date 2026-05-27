from __future__ import annotations
import json
import uuid
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
    
    if idx_eval == -1 and idx_plan == -1:
        return s, ""
        
    eval_raw = ""
    plan_raw = ""
    
    if idx_eval != -1 and idx_plan != -1:
        if idx_eval < idx_plan:
            # eval is first
            colon_first = s.find(':', idx_eval)
            start_first = s.find('"', colon_first)
            end_first = s.rfind('"', start_first + 1, idx_plan)
            if start_first != -1 and end_first != -1 and end_first > start_first:
                eval_raw = s[start_first + 1 : end_first]
            
            colon_second = s.find(':', idx_plan)
            start_second = s.find('"', colon_second)
            end_second = s.rfind('"')
            if start_second != -1:
                if end_second != -1 and end_second > start_second:
                    plan_raw = s[start_second + 1 : end_second]
                else:
                    plan_raw = s[start_second + 1 :]
        else:
            # plan is first
            colon_first = s.find(':', idx_plan)
            start_first = s.find('"', colon_first)
            end_first = s.rfind('"', start_first + 1, idx_eval)
            if start_first != -1 and end_first != -1 and end_first > start_first:
                plan_raw = s[start_first + 1 : end_first]
                
            colon_second = s.find(':', idx_eval)
            start_second = s.find('"', colon_second)
            end_second = s.rfind('"')
            if start_second != -1:
                if end_second != -1 and end_second > start_second:
                    eval_raw = s[start_second + 1 : end_second]
                else:
                    eval_raw = s[start_second + 1 :]
    elif idx_eval != -1:
        colon_first = s.find(':', idx_eval)
        start_first = s.find('"', colon_first)
        end_first = s.rfind('"')
        if start_first != -1:
            if end_first != -1 and end_first > start_first:
                eval_raw = s[start_first + 1 : end_first]
            else:
                eval_raw = s[start_first + 1 :]
    elif idx_plan != -1:
        colon_first = s.find(':', idx_plan)
        start_first = s.find('"', colon_first)
        end_first = s.rfind('"')
        if start_first != -1:
            if end_first != -1 and end_first > start_first:
                plan_raw = s[start_first + 1 : end_first]
            else:
                plan_raw = s[start_first + 1 :]
                
    evaluation_report = unescape_raw_value(eval_raw)
    practice_plan = unescape_raw_value(plan_raw)
    
    evaluation_report = evaluation_report.rstrip('"} \n,')
    practice_plan = practice_plan.rstrip('"} \n,')
    
    return evaluation_report, practice_plan


async def generate_session_evaluation_and_plan(
    db: asyncpg.Connection,
    session_id: uuid.UUID,
    role: str,
    level: str,
    major: str,
    language: str = "vi",
) -> tuple[str, str]:
    """
    Generates a session evaluation report and a detailed practice plan
    by summarizing candidate answers and AI feedback.
    """
    # 1. Fetch answers and questions
    rows = await db.fetch(
        """
        SELECT q.text AS question_text, q.category, a.answer_text, a.score::float AS score, a.feedback
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.session_id = $1
        ORDER BY a.submitted_at
        """,
        session_id,
    )
    if not rows:
        if language == "vi":
            return (
                "Không có dữ liệu trả lời để đánh giá.",
                "Không thể tạo kế hoạch luyện tập do thiếu dữ liệu trả lời."
            )
        else:
            return (
                "No answer data available for evaluation.",
                "Cannot generate a practice plan due to missing answer data."
            )

    # 2. Build history payload
    history = []
    for r in rows:
        history.append({
            "question": r["question_text"],
            "category": r["category"],
            "candidate_answer": r["answer_text"],
            "score": r["score"],
            "feedback": r["feedback"],
        })

    # 3. Call AI
    if language == "vi":
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
    else:
        system_prompt = (
            "You are an expert in job interview assessment and study plan generation.\n"
            "Based on the candidate's answers, scores (on a 10-point scale), and detailed AI feedback for each question, please:\n"
            "1. Generate a detailed Evaluation Report in English.\n"
            "2. Generate a detailed Practice Plan in English.\n\n"
            "The Evaluation Report must detail the candidate's Strengths and Weaknesses / Areas for Improvement, with specific revision tips.\n"
            "The Practice Plan must provide a clear learning path (e.g., weekly/daily tasks), specific topics to review or learn, and practice exercises/tips to improve interview skills.\n\n"
            "The output MUST be a valid JSON object containing exactly two fields: 'evaluation_report' and 'practice_plan', both containing rich, beautifully formatted English Markdown strings.\n"
            "Do not include any extra text other than this JSON object.\n"
            "Attention: Make sure all newlines in the Markdown string are properly escaped as '\\n' to ensure a valid JSON output."
        )

    user_payload = json.dumps({
        "role": role,
        "level": level,
        "major": major,
        "interview_session": history,
    }, ensure_ascii=False)

    try:
        response = await create_chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_payload,
            temperature=0.3,
            max_tokens=4096,
        )
        raw_content = response["content"]
        evaluation_report, practice_plan = extract_and_clean_json(raw_content)
        return evaluation_report, practice_plan
    except Exception as e:
        print(f"Error generating session evaluation: {e}")
        # Return fallback text
        if language == "vi":
            return (
                f"Lỗi tạo báo cáo tự động: {str(e)}",
                "Không thể tạo kế hoạch luyện tập tự động do lỗi hệ thống."
            )
        else:
            return (
                f"Error generating report: {str(e)}",
                "Unable to generate practice plan due to system error."
            )
