"""
Keyword-matching scorer cho interview answers.
So sánh answer với ideal_answer, tính % từ khóa khớp → score 0-100.
"""
import re
from typing import Tuple


def _tokenize(text: str) -> set[str]:
    """Tách từ, lowercase, loại bỏ stopwords ngắn và ký tự đặc biệt."""
    text = text.lower()
    tokens = re.findall(r'\b[\w]+\b', text)
    stopwords = {'là', 'và', 'của', 'các', 'có', 'trong', 'được', 'cho', 'với',
                 'về', 'một', 'những', 'này', 'khi', 'từ', 'không', 'để', 'theo',
                 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'or',
                 'and', 'it', 'its', 'this', 'that', 'i', 'you', 'we', 'they'}
    return {t for t in tokens if len(t) > 2 and t not in stopwords}


def score_answer(answer_text: str, ideal_answer: str) -> Tuple[int, str]:
    """
    Tính điểm bằng keyword matching.
    Returns: (score 0-100, feedback string)
    """
    if not answer_text.strip():
        return 0, "Bạn chưa cung cấp câu trả lời. Hãy thử lại!"

    ideal_tokens = _tokenize(ideal_answer)
    answer_tokens = _tokenize(answer_text)

    if not ideal_tokens:
        return 50, "Không thể đánh giá tự động câu trả lời này."

    matched = ideal_tokens & answer_tokens
    match_ratio = len(matched) / len(ideal_tokens)

    # Bonus điểm nếu câu trả lời đủ dài (thể hiện chi tiết)
    length_bonus = min(0.1, len(answer_text) / 2000)
    raw_score = min(1.0, match_ratio + length_bonus)

    score = int(raw_score * 100)
    score = max(5, min(100, score))  # floor 5, cap 100

    feedback = _generate_feedback(score, matched, ideal_tokens, answer_tokens)
    return score, feedback


def _generate_feedback(score: int, matched: set, ideal_tokens: set, answer_tokens: set) -> str:
    missing = ideal_tokens - answer_tokens
    missing_sample = list(missing)[:5]

    if score >= 80:
        base = "✅ Tốt! Câu trả lời của bạn bao phủ được hầu hết các điểm chính."
        if missing_sample:
            base += f" Có thể bổ sung thêm về: {', '.join(missing_sample)}."
    elif score >= 55:
        base = "👍 Khá tốt! Bạn đã đề cập được nhiều điểm quan trọng."
        if missing_sample:
            base += f" Cần bổ sung thêm: {', '.join(missing_sample)}."
        base += " Hãy cung cấp nhiều ví dụ cụ thể hơn."
    elif score >= 35:
        base = "📝 Cần cải thiện. Câu trả lời còn thiếu nhiều điểm quan trọng."
        if missing_sample:
            base += f" Các từ khóa cần đề cập: {', '.join(missing_sample)}."
        base += " Hãy nghiên cứu thêm và trả lời chi tiết hơn."
    else:
        base = "❌ Cần cải thiện nhiều. Câu trả lời chưa đáp ứng yêu cầu của câu hỏi."
        if missing_sample:
            base += f" Hãy tìm hiểu về: {', '.join(missing_sample)}."
        base += " Xem lại lý thuyết và thực hành thêm."

    return base
