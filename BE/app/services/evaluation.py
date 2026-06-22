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
    by summarizing candidate answers, AI feedback, and visual/verbal telemetry data.
    """
    # 1. Fetch current session answers and telemetry
    rows = await db.fetch(
        """
        SELECT q.text AS question_text, q.category, a.answer_text, a.score::float AS score, a.feedback, a.telemetry_data
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

    # 2. Fetch previous completed session for before/after comparison
    curr_session = await db.fetchrow(
        "SELECT user_id, created_at FROM sessions WHERE id = $1",
        session_id
    )
    prev_session_text = ""
    if curr_session:
        user_id = curr_session["user_id"]
        created_at = curr_session["created_at"]
        prev_session = await db.fetchrow(
            """
            SELECT s.id, s.role, s.level, s.created_at,
                   (SELECT AVG(score)::float FROM answers WHERE session_id = s.id) AS avg_score
            FROM sessions s
            WHERE s.user_id = $1 AND s.status = 'COMPLETED' AND s.created_at < $2
            ORDER BY s.created_at DESC
            LIMIT 1
            """,
            user_id, created_at
        )
        if prev_session:
            prev_answers = await db.fetch(
                "SELECT telemetry_data, score::float AS score FROM answers WHERE session_id = $1",
                prev_session["id"]
            )
            p_gaze = []
            p_smile = []
            p_wpm = []
            p_framing = []
            p_posture = []
            p_fillers = 0
            p_pauses = 0
            for pa in prev_answers:
                tel = pa["telemetry_data"]
                if tel:
                    if isinstance(tel, str):
                        try:
                            import json
                            tel = json.loads(tel)
                        except Exception:
                            tel = None
                    if isinstance(tel, dict):
                        if "gazeRatio" in tel:
                            p_gaze.append(tel["gazeRatio"])
                        if "smileRatio" in tel:
                            p_smile.append(tel["smileRatio"])
                        if "speakingPace" in tel:
                            p_wpm.append(tel["speakingPace"])
                        if "cameraFramingScore" in tel:
                            p_framing.append(tel["cameraFramingScore"])
                        if "bodyPostureScore" in tel:
                            p_posture.append(tel["bodyPostureScore"])
                        p_fillers += tel.get("fillerWordsCount", 0)
                        p_pauses += tel.get("longPausesCount", 0)
            
            avg_p_gaze = sum(p_gaze)/len(p_gaze) if p_gaze else None
            avg_p_smile = sum(p_smile)/len(p_smile) if p_smile else None
            avg_p_wpm = sum(p_wpm)/len(p_wpm) if p_wpm else None
            avg_p_framing = sum(p_framing)/len(p_framing) if p_framing else None
            avg_p_posture = sum(p_posture)/len(p_posture) if p_posture else None
            
            if language == "vi":
                prev_session_text = f"""
### Số liệu ở Phiên luyện tập trước (ID: {prev_session['id']}, Vai trò: {prev_session['role']}):
- Điểm đánh giá trung bình: {prev_session['avg_score']}/10
- Giao tiếp mắt (Eye Contact): {f"{int(avg_p_gaze * 100)}%" if avg_p_gaze is not None else "N/A"}
- Biểu cảm thân thiện (Smile): {f"{int(avg_p_smile * 100)}%" if avg_p_smile is not None else "N/A"}
- Tư thế ngồi thẳng (Posture): {f"{int(avg_p_posture * 100)}%" if avg_p_posture is not None else "N/A"}
- Khung hình chuẩn (Framing): {f"{int(avg_p_framing * 100)}%" if avg_p_framing is not None else "N/A"}
- Tốc độ nói: {f"{int(avg_p_wpm)} WPM" if avg_p_wpm is not None else "N/A"}
- Tổng số từ thừa: {p_fillers}
- Tổng số khoảng dừng dài: {p_pauses}
"""
            else:
                prev_session_text = f"""
### Metrics from Previous Session (ID: {prev_session['id']}, Role: {prev_session['role']}):
- Average Answer Score: {prev_session['avg_score']}/10
- Eye Contact (Gaze Ratio): {f"{int(avg_p_gaze * 100)}%" if avg_p_gaze is not None else "N/A"}
- Friendly Expression (Smile): {f"{int(avg_p_smile * 100)}%" if avg_p_smile is not None else "N/A"}
- Body Posture Score: {f"{int(avg_p_posture * 100)}%" if avg_p_posture is not None else "N/A"}
- Camera Framing Score: {f"{int(avg_p_framing * 100)}%" if avg_p_framing is not None else "N/A"}
- Speaking Pace: {f"{int(avg_p_wpm)} WPM" if avg_p_wpm is not None else "N/A"}
- Total Filler Words: {p_fillers}
- Total Long Pauses: {p_pauses}
"""

    # 3. Calculate current session averages
    c_gaze = []
    c_smile = []
    c_wpm = []
    c_framing = []
    c_posture = []
    c_blink = []
    c_yaw = []
    c_tension = []
    c_fillers = 0
    c_pauses = 0
    history = []
    
    for r in rows:
        tel = r["telemetry_data"]
        telemetry_dict = None
        if tel:
            if isinstance(tel, str):
                try:
                    import json
                    telemetry_dict = json.loads(tel)
                except Exception:
                    telemetry_dict = None
            elif isinstance(tel, dict):
                telemetry_dict = tel
                
        if telemetry_dict:
            if "gazeRatio" in telemetry_dict:
                c_gaze.append(telemetry_dict["gazeRatio"])
            if "smileRatio" in telemetry_dict:
                c_smile.append(telemetry_dict["smileRatio"])
            if "speakingPace" in telemetry_dict:
                c_wpm.append(telemetry_dict["speakingPace"])
            if "cameraFramingScore" in telemetry_dict:
                c_framing.append(telemetry_dict["cameraFramingScore"])
            if "bodyPostureScore" in telemetry_dict:
                c_posture.append(telemetry_dict["bodyPostureScore"])
            if "blinkRatio" in telemetry_dict:
                c_blink.append(telemetry_dict["blinkRatio"])
            if "avgHeadYaw" in telemetry_dict:
                c_yaw.append(telemetry_dict["avgHeadYaw"])
            if "avgTensionScore" in telemetry_dict:
                c_tension.append(telemetry_dict["avgTensionScore"])
            c_fillers += telemetry_dict.get("fillerWordsCount", 0)
            c_pauses += telemetry_dict.get("longPausesCount", 0)

        history.append({
            "question": r["question_text"],
            "category": r["category"],
            "candidate_answer": r["answer_text"],
            "score": r["score"],
            "feedback": r["feedback"],
            "telemetry": telemetry_dict,
        })

    avg_c_gaze = sum(c_gaze)/len(c_gaze) if c_gaze else None
    avg_c_smile = sum(c_smile)/len(c_smile) if c_smile else None
    avg_c_wpm = sum(c_wpm)/len(c_wpm) if c_wpm else None
    avg_c_framing = sum(c_framing)/len(c_framing) if c_framing else None
    avg_c_posture = sum(c_posture)/len(c_posture) if c_posture else None
    avg_c_blink = sum(c_blink)/len(c_blink) if c_blink else None
    avg_c_yaw = sum(c_yaw)/len(c_yaw) if c_yaw else None
    avg_c_tension = sum(c_tension)/len(c_tension) if c_tension else None

    if language == "vi":
        curr_metrics_text = f"""Số liệu thống kê Non-Verbal và Speech phiên hiện tại:
- Giao tiếp mắt: {f"{int(avg_c_gaze * 100)}% thời gian" if avg_c_gaze is not None else "N/A"}
- Biểu cảm thân thiện (Smile): {f"{int(avg_c_smile * 100)}% thời gian" if avg_c_smile is not None else "N/A"}
- Tư thế đúng (Posture): {f"{int(avg_c_posture * 100)}% thời gian" if avg_c_posture is not None else "N/A"}
- Khung hình chuẩn & Ánh sáng (Framing): {f"{int(avg_c_framing * 100)}% thời gian" if avg_c_framing is not None else "N/A"}
- Tốc độ nói: {f"{int(avg_c_wpm)} từ/phút (WPM)" if avg_c_wpm is not None else "N/A"}
- Tổng số từ thừa (Filler words): {c_fillers} từ
- Tổng số khoảng dừng dài (>3.5s): {c_pauses} lần
- Tỉ lệ chớp mắt (Blink): {f"{int(avg_c_blink * 100)}%" if avg_c_blink is not None else "N/A"} (cao = căng thẳng)
- Độ lắc đầu (Head Yaw): {f"{avg_c_yaw:.1f}" if avg_c_yaw is not None else "N/A"} (cao = thiếu tập trung)
- Độ căng thẳng (Tension): {f"{int(avg_c_tension * 100)}%" if avg_c_tension is not None else "N/A"} (cao = stress)"""
    else:
        curr_metrics_text = f"""Candidate Non-Verbal & Speech telemetry for this session:
- Eye Contact (Gaze Ratio): {f"{int(avg_c_gaze * 100)}%" if avg_c_gaze is not None else "N/A"}
- Friendly Expression (Smile): {f"{int(avg_c_smile * 100)}%" if avg_c_smile is not None else "N/A"}
- Body Posture Score: {f"{int(avg_c_posture * 100)}%" if avg_c_posture is not None else "N/A"}
- Camera Framing Score: {f"{int(avg_c_framing * 100)}%" if avg_c_framing is not None else "N/A"}
- Speaking Pace: {f"{int(avg_c_wpm)} WPM" if avg_c_wpm is not None else "N/A"}
- Total Filler Words: {c_fillers}
- Total Long Pauses: {c_pauses}
- Blink Ratio: {f"{int(avg_c_blink * 100)}%" if avg_c_blink is not None else "N/A"} (high = nervousness)
- Head Movement (Yaw): {f"{avg_c_yaw:.1f}" if avg_c_yaw is not None else "N/A"} (high = distraction)
- Tension Score: {f"{int(avg_c_tension * 100)}%" if avg_c_tension is not None else "N/A"} (high = stress)"""

    # 4. Call AI with structured prompt mapping criteria
    if language == "vi":
        system_prompt = (
            "Bạn là một chuyên gia đánh giá kỹ năng phỏng vấn tuyển dụng chuyên nghiệp.\n"
            "Hãy dựa trên danh sách các câu hỏi, câu trả lời, điểm số, nhận xét chi tiết của AI và các số liệu thống kê Non-Verbal / Speech (Giao tiếp mắt, tư thế, khung hình, tốc độ nói, từ thừa, khoảng dừng) của ứng viên để:\n"
            "1. Tạo một Báo cáo đánh giá (Evaluation Report) chi tiết bằng tiếng Việt.\n"
            "2. Tạo một Kế hoạch luyện tập (Practice Plan) chi tiết bằng tiếng Việt.\n\n"
            "Báo cáo đánh giá (Evaluation Report) PHẢI được cấu trúc rõ ràng thành 6 phần chính sau đây:\n\n"
            "### 1. Visual Delivery (Giao tiếp phi ngôn từ qua Camera)\n"
            "- Đánh giá Giao tiếp bằng mắt (Eye Contact): Đánh giá phần trăm thời gian nhìn camera, đưa ra lời khuyên cụ thể.\n"
            "- Đánh giá Tư thế ngồi (Posture): Đánh giá việc ngồi thẳng, cúi đầu hay nghiêng người.\n"
            "- Đánh giá Biểu cảm khuôn mặt (Facial Expression): Ước lượng mức độ biểu cảm (thân thiện, bình thường, căng thẳng, thiếu năng lượng).\n\n"
            "### 2. Verbal Delivery (Kỹ năng diễn đạt và Giọng nói)\n"
            "- BẮT BUỘC phải nhắc trực tiếp chỉ số Tốc độ nói (Speaking Pace / WPM) nếu có dữ liệu, không được bỏ qua.\n"
            "- Phân tích Từ thừa (Filler Words): Nhận xét số lượng từ thừa (như à, ừ, thì, là, kiểu, like, you know...) và cách khắc phục.\n"
            "- Phân tích Khoảng dừng dài (Long Pauses): Phân tích xem các khoảng dừng có tự nhiên không.\n\n"
            "### 3. Interview Performance (Nội dung và Cấu trúc trả lời)\n"
            "- Đánh giá mức độ trả lời đúng trọng tâm câu hỏi.\n"
            "- Đánh giá việc áp dụng cấu trúc câu trả lời (nếu áp dụng theo cấu trúc STAR hoặc logic mạch lạc thì ghi nhận điểm cộng, không bắt buộc).\n"
            "- Đánh giá độ liên quan, tính thuyết phục và độ sâu của câu trả lời.\n\n"
            "- Với mục giao tiếp/communication, CHỈ được dùng số liệu telemetry camera/speech làm bằng chứng; KHÔNG được trích dẫn nội dung câu trả lời của ứng viên.\n\n"
            "### 4. Overall Presentation Score (Điểm trình bày tổng hợp)\n"
            "- Chấm điểm phong cách trình bày tổng hợp cho ứng viên trên thang điểm 100.\n"
            "- Dòng đầu tiên PHẢI là `**Điểm: X/100**`.\n"
            "- Dòng thứ hai PHẢI là `**Cộng:**`.\n"
            "- Bên dưới `Cộng:` chỉ dùng bullet points ngắn, mỗi bullet một ý.\n"
            "- Sau đó là `**Trừ:**`.\n"
            "- Bên dưới `Trừ:` chỉ dùng bullet points ngắn, mỗi bullet một ý.\n"
            "- Tuyệt đối không viết thành một đoạn văn duy nhất.\n\n"
            "### 5. Strengths & Areas to Improve (Điểm mạnh & Điểm cần cải thiện)\n"
            "- Liệt kê chính xác 3 Điểm mạnh hàng đầu của ứng viên.\n"
            "- Liệt kê chính xác 3 Điểm cần cải thiện hàng đầu.\n\n"
            "### 6. Before / After Comparison (So sánh Tiến bộ)\n"
            "- So sánh trực tiếp số liệu của phiên này với phiên phỏng vấn trước đó của ứng viên (nếu có dữ liệu lịch sử) để chỉ ra các cải thiện rõ rệt (Ví dụ: Giao tiếp mắt tăng từ 45% lên 68%, số lượng từ thừa giảm từ 18 xuống 9) nhằm tạo động lực luyện tập cho ứng viên. Nếu không có phiên trước, hãy ghi là 'Đây là phiên đầu tiên của bạn, hãy tiếp tục luyện tập để theo dõi tiến độ!'\n\n"
            "Đầu ra PHẢI là một JSON object hợp lệ chứa chính xác hai trường: 'evaluation_report' and 'practice_plan', cả hai đều có giá trị là chuỗi Markdown tiếng Việt phong phú, định dạng đẹp mắt.\n"
            "Không kèm bất kỳ văn bản nào khác ngoài JSON object này.\n"
            "Chú ý: Hãy đảm bảo các ký tự xuống dòng trong chuỗi Markdown được escape đúng thành '\\n' để đảm bảo chuỗi JSON hợp lệ."
        )
    else:
        system_prompt = (
            "You are an expert in job interview assessment and study plan generation.\n"
            "Based on the candidate's answers, scores, detailed AI feedback, and Non-Verbal / Speech telemetry, please:\n"
            "1. Generate a detailed Evaluation Report in English.\n"
            "2. Generate a detailed Practice Plan in English.\n\n"
            "The Evaluation Report MUST be structured into the following sections:\n\n"
            "### 1. Visual Delivery (Non-verbal communication via camera)\n"
            "- Gaze and Eye Contact evaluation: Camera eye contact percentage and constructive tips.\n"
            "- Body Posture: Assessment of sitting posture, bowing head, or swaying.\n"
            "- Facial Expression: Estimate of expressions (friendly, neutral, stressed, high/low energy).\n\n"
            "### 2. Verbal Delivery (Speech delivery and audio feedback)\n"
            "- You MUST explicitly mention Speaking Pace (WPM) when telemetry is present.\n"
            "- Filler Words: Total counts of filler words (uh, um, like, you know...) and ways to reduce them.\n"
            "- Long Pauses: Evaluation of pauses (>3s) and whether they are natural.\n\n"
            "### 3. Interview Performance (Content quality and structure)\n"
            "- Relevance and accuracy of answers.\n"
            "- Evaluation of answer structure (bonus points if STAR or logical structure is applied, not mandatory).\n"
            "- Overall persuasiveness and detail quality.\n\n"
            "- For communication analysis, only use camera/speech telemetry as evidence. Do not quote the candidate answer text in that part.\n\n"
            "### 4. Overall Presentation Score\n"
            "- Composite presentation / delivery score out of 100 based on non-verbal and verbal delivery metrics.\n"
            "- The first line MUST be `**Score: X/100**`.\n"
            "- The second line MUST be `**Pros:**`.\n"
            "- Under `Pros:` use short bullet points only, one idea per bullet.\n"
            "- Then use `**Cons:**`.\n"
            "- Under `Cons:` use short bullet points only, one idea per bullet.\n"
            "- Do not write this as one paragraph.\n\n"
            "### 5. Strengths & Areas to Improve\n"
            "- List exactly 3 top strengths.\n"
            "- List exactly 3 top areas to improve.\n\n"
            "### 6. Before / After Comparison\n"
            "- Compare the telemetry metrics of this session with the previous session (if history is present) showing where they improved. If this is the first session, indicate that they should continue practicing to track improvements.\n\n"
            "The output MUST be a valid JSON object containing exactly two fields: 'evaluation_report' and 'practice_plan', both containing rich, beautifully formatted English Markdown strings.\n"
            "Do not include any extra text other than this JSON object.\n"
            "Attention: Make sure all newlines in the Markdown string are properly escaped as '\\n' to ensure a valid JSON output."
        )

    import json
    user_payload_data = {
        "role": role,
        "level": level,
        "major": major,
        "current_session_metrics": curr_metrics_text,
        "previous_session_metrics": prev_session_text,
        "interview_session": history,
    }
    user_payload = json.dumps(user_payload_data, ensure_ascii=False)

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
