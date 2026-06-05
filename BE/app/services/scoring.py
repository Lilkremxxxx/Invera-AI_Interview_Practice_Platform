from __future__ import annotations

"""
HR-calibrated scorer for interview answers.

- Prefer DeepSeek with concise rubric guidance focused on interview quality.
- Fall back to a heuristic scorer that rewards relevance, reasoning, and specificity.
- Treat very short Vietnamese answers as automatically weak because HR cannot evaluate them well.
"""

import copy
from dataclasses import dataclass
import json
import logging
import re
from typing import Any

from app.core.config import settings
from app.core.text_processing import normalize_supported_language, sanitize_user_text, select_response_language
from app.services.deepseek_client import DeepSeekAPIError, create_chat_completion

logger = logging.getLogger(__name__)


SHORT_VIETNAMESE_WORD_LIMIT = 15
SHORT_ENGLISH_WORD_LIMIT = 15
OFF_TOPIC_WORD_MINIMUM = 6
OFF_TOPIC_RELEVANCE_THRESHOLD = 0.08
STOPWORDS = {
    "là", "và", "của", "các", "có", "trong", "được", "cho", "với", "về", "một", "những",
    "này", "khi", "từ", "không", "để", "theo", "the", "a", "an", "is", "are", "was", "were",
    "be", "been", "to", "of", "in", "on", "at", "for", "with", "by", "or", "and", "it", "its",
    "this", "that", "i", "you", "we", "they", "your", "our", "their", "as", "from", "into",
    "la", "va", "cua", "cac", "co", "trong", "duoc", "cho", "voi", "ve", "mot", "nhung",
    "nay", "khi", "tu", "khong", "de", "theo",
}
REASONING_MARKERS = {
    "because", "therefore", "so that", "which means", "that means", "vì", "nên", "do đó",
    "điều này", "bởi vì", "để", "therefore", "as a result", "hence", "since", "nhờ đó",
}
EXAMPLE_MARKERS = {
    "for example", "for instance", "such as", "ví dụ", "chẳng hạn", "for a real project",
    "in practice", "thực tế", "for example,", "ví dụ,", "for example:", "ví dụ:",
}
TRADEOFF_MARKERS = {
    "trade-off", "tradeoff", "however", "but", "depends", "risk", "cost", "latency", "consistency",
    "throughput", "overhead", "caveat", "limitation", "nhưng", "tuy nhiên", "đánh đổi", "rủi ro",
    "chi phí", "phụ thuộc", "hạn chế",
}
STRUCTURE_MARKERS = {
    "first", "second", "finally", "first,", "second,", "finally,", "đầu tiên", "tiếp theo",
    "cuối cùng", "bước 1", "bước 2", "step 1", "step 2",
}


@dataclass(frozen=True)
class ScoringRequest:
    answer_text: str
    ideal_answer: str
    question_text: str
    role: str
    level: str
    category: str
    difficulty: str
    major: str = "technology"
    preferred_language: str = "en"
    force_language: bool = False
    telemetry_data: dict[str, Any] | None = None


def _tokenize(text: str) -> set[str]:
    text = text.lower()
    tokens = re.findall(r"\b[\w]+\b", text)
    return {token for token in tokens if len(token) > 2 and token not in STOPWORDS}


def _word_count(text: str) -> int:
    return len(re.findall(r"\b[\w]+\b", text, flags=re.UNICODE))


def _sentence_count(text: str) -> int:
    return len([chunk for chunk in re.split(r"[.!?\n;]+", text) if chunk.strip()])


def _count_phrase_hits(text: str, phrases: set[str]) -> int:
    haystack = text.lower()
    return sum(1 for phrase in phrases if phrase in haystack)


def _clamp_score(score: float) -> float:
    return round(max(0.0, min(10.0, score)), 1)


def _assessment_label(metric: float) -> str:
    if metric >= 0.72:
        return "strong"
    if metric >= 0.42:
        return "mixed"
    return "weak"


def _looks_like_gibberish(text: str) -> bool:
    cleaned = sanitize_user_text(text).strip().lower()
    if not cleaned:
        return False

    alpha_tokens = re.findall(r"[a-zA-ZÀ-ỹ]+", cleaned, flags=re.UNICODE)
    if not alpha_tokens:
        return True

    long_tokens = [token for token in alpha_tokens if len(token) >= 6]
    if not long_tokens:
        return False

    vowel_pattern = re.compile(r"[aeiouyăâêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", re.I)
    no_vowel_count = sum(1 for token in long_tokens if not vowel_pattern.search(token))
    suspicious_ratio = no_vowel_count / max(len(long_tokens), 1)

    unique_chars = set(re.sub(r"[^a-zA-ZÀ-ỹ]", "", cleaned))
    alpha_chars = re.sub(r"[^a-zA-ZÀ-ỹ]", "", cleaned)
    diversity = len(unique_chars) / max(len(alpha_chars), 1)

    return suspicious_ratio >= 0.6 or (18 <= len(alpha_chars) < 45 and diversity < 0.28)


def _detect_question_type(category: str, question_text: str) -> str:
    haystack = f"{category} {question_text}".lower()
    if any(token in haystack for token in ("hành vi", "behavior", "behavioral", "soft skill", "star")):
        return "behavioral"
    if any(token in haystack for token in ("system design", "thiết kế hệ thống", "architecture", "kiến trúc")):
        return "system_design"
    if any(token in haystack for token in ("database", "sql", "schema", "index", "cơ sở dữ liệu")):
        return "database"
    if any(token in haystack for token in ("algorithm", "dsa", "thuật toán", "complexity", "big o")):
        return "algorithm"
    return "technical_general"


_CRITERIA_DESCRIPTORS = {
    "Problem Understanding & Context": {
        "definition": "Understanding of the problem, goal, audience, constraints, and success metrics.",
        "level_1": "Misses core problem, goal, or constraints; confuses goal with solution; ignores key stakeholders/context.",
        "level_3": "Grasps basic goals and some constraints; covers the core but lacks deeper context, stakeholders, or decision criteria.",
        "level_5": "Sharp framing; clear goals, segments, economics, stakeholders, and KPIs; determines constraints."
    },
    "Domain Knowledge & Accuracy": {
        "definition": "Correctness of concepts, terminology, assumptions, and domain constraints.",
        "level_1": "Core concepts wrong; confuses components/consequences; dangerous or baseless assumptions.",
        "level_3": "Mostly correct for common cases; minor gaps in edge cases or important dependencies.",
        "level_5": "Accurate and well-contextualised; clearly states assumptions, dependencies, edge cases, and limits."
    },
    "Reasoning & Analysis": {
        "definition": "Coherence of logic, quantitative reasoning, prioritization, and trade-off analysis.",
        "level_1": "Claims without evidence; weak or disjointed logic; wrong or irrelevant numbers.",
        "level_3": "Basic logic and/or quantification; structure exists but assumptions are not explicit; thin sensitivity/depth.",
        "level_5": "Tight and structured analysis; clear assumptions; distinguishes signal from noise; sufficient quantification for decisions."
    },
    "Solution & Recommendation": {
        "definition": "Clarity, feasibility, prioritization, and impact of the proposed recommendation or solution.",
        "level_1": "Vague recommendation; lists options without choosing or prioritising; solution is not actionable.",
        "level_3": "Reasonable proposal; basic prioritization; link to goals is acceptable but not fully optimized.",
        "level_5": "Clear choice; justified trade-offs; prioritises by impact-feasibility; persuasive and actionable action plan."
    },
    "Feasibility & Risk Management": {
        "definition": "Realism of execution (timeline, budget, testing, monitoring, security, rollback, compliance, ethics).",
        "level_1": "Looks good on paper but ignores rollout risks, testing, monitoring, security, resources, or compliance.",
        "level_3": "Mentions basic testing, rollout steps, or risks; lacks concrete mitigations, ownership, or rollback controls.",
        "level_5": "Actionable rollout/deployment plan; clear controls, testing, monitoring, owner/timeline; risks and mitigation stated."
    },
    "Communication": {
        "definition": "Structure, conciseness, audience fit, signposting, and clarity of expression.",
        "level_1": "Hard to follow; rambling; wrong terminology; disjointed structure; unclear 'so what'.",
        "level_3": "Understandable but wordy; missing executive summary or does not anticipate objections; basic signposting.",
        "level_5": "Executive-ready; issue-to-recommendation flow; tight structure and concise delivery; makes complex ideas easy."
    }
}

_CRITERIA_NAME_VI = {
    "Problem Understanding & Context": "Hiểu vấn đề và bối cảnh",
    "Domain Knowledge & Accuracy": "Độ chính xác nội dung/domain",
    "Reasoning & Analysis": "Lập luận và bằng chứng",
    "Solution & Recommendation": "Giải pháp/kết luận/khuyến nghị",
    "Feasibility & Risk Management": "Khả thi và quản trị rủi ro",
    "Communication": "Giao tiếp"
}

_TASK_TYPE_WEIGHTS = {
    "theory": {
        "Problem Understanding & Context": 15,
        "Domain Knowledge & Accuracy": 35,
        "Reasoning & Analysis": 25,
        "Solution & Recommendation": 10,
        "Feasibility & Risk Management": 5,
        "Communication": 10
    },
    "system_design": {
        "Problem Understanding & Context": 15,
        "Domain Knowledge & Accuracy": 20,
        "Reasoning & Analysis": 20,
        "Solution & Recommendation": 25,
        "Feasibility & Risk Management": 10,
        "Communication": 10
    },
    "coding": {
        "Problem Understanding & Context": 10,
        "Domain Knowledge & Accuracy": 30,
        "Reasoning & Analysis": 20,
        "Solution & Recommendation": 25,
        "Feasibility & Risk Management": 5,
        "Communication": 10
    },
    "business_case": {
        "Problem Understanding & Context": 20,
        "Domain Knowledge & Accuracy": 15,
        "Reasoning & Analysis": 25,
        "Solution & Recommendation": 25,
        "Feasibility & Risk Management": 5,
        "Communication": 10
    },
    "behavioral": {
        "Problem Understanding & Context": 15,
        "Domain Knowledge & Accuracy": 10,
        "Reasoning & Analysis": 20,
        "Solution & Recommendation": 25,
        "Feasibility & Risk Management": 10,
        "Communication": 20
    },
    "product_strategy": {
        "Problem Understanding & Context": 20,
        "Domain Knowledge & Accuracy": 15,
        "Reasoning & Analysis": 20,
        "Solution & Recommendation": 25,
        "Feasibility & Risk Management": 10,
        "Communication": 10
    }
}


def _detect_task_type(category: str, question_text: str, role: str, major: str) -> str:
    category_lower = (category or "").strip().lower()
    question_lower = (question_text or "").strip().lower()
    role_lower = (role or "").strip().lower()
    major_lower = (major or "").strip().lower()

    if any(kw in category_lower or kw in question_lower for kw in [
        "behavioral", "hành vi", "soft skill", "star", "tell me about a time",
        "kể về một lần", "describe a situation", "mô tả một tình huống", "tình huống hành vi",
        "how did you handle", "làm thế nào bạn"
    ]):
        return "behavioral"

    if any(kw in category_lower or kw in question_lower for kw in [
        "system design", "thiết kế hệ thống", "architecture", "kiến trúc", "microservices",
        "scale", "scaling", "distribute", "phân tán"
    ]):
        return "system_design"

    if any(kw in category_lower or kw in question_lower for kw in [
        "coding", "programming", "algorithm", "dsa", "thuật toán", "code", "debug",
        "lập trình", "viết hàm", "write a function", "write a program", "viết chương trình",
        "complexity", "big o", "data structure", "cấu trúc dữ liệu", "sql query", "truy vấn"
    ]):
        return "coding"

    if any(kw in category_lower or kw in question_lower for kw in [
        "product", "strategy", "roadmap", "go-to-market", "gtm", "marketing",
        "chiến lược", "sản phẩm", "gói sản phẩm", "định vị", "phân khúc"
    ]) or any(kw in role_lower for kw in ["product", "marketing", "strategist"]):
        return "product_strategy"

    if major_lower in ("business", "business_analyst", "finance") or any(kw in category_lower or kw in question_lower for kw in [
        "case", "business case", "case study", "financial analyst", "investment", "audit", "accountant"
    ]):
        return "business_case"

    return "theory"


def _adjust_weights_by_level(weights: dict[str, int], level: str) -> dict[str, int]:
    adjusted = weights.copy()
    lvl = (level or "").strip().lower()

    if lvl in ("intern", "fresher", "junior"):
        if adjusted.get("Feasibility & Risk Management", 0) >= 5:
            adjusted["Feasibility & Risk Management"] -= 5
            adjusted["Domain Knowledge & Accuracy"] = adjusted.get("Domain Knowledge & Accuracy", 0) + 5
    elif lvl in ("senior", "lead", "executive"):
        if adjusted.get("Domain Knowledge & Accuracy", 0) >= 5:
            adjusted["Domain Knowledge & Accuracy"] -= 5
            adjusted["Feasibility & Risk Management"] = adjusted.get("Feasibility & Risk Management", 0) + 5

    return adjusted


def _calculate_overall_score(criteria_scores: dict[str, float], weights: dict[str, int]) -> float:
    total_weight = 0
    weighted_sum = 0.0
    for name, weight in weights.items():
        score = criteria_scores.get(name)
        if score is not None:
            total_weight += weight
            weighted_sum += score * weight

    if total_weight == 0:
        return 0.0

    weighted_avg = weighted_sum / total_weight
    # Scale from 1-5 to 0-10
    overall_score = (weighted_avg / 5.0) * 10.0
    return overall_score


def _normalize_criterion_name(name: str) -> str:
    name_clean = str(name).strip().lower()
    if "understanding" in name_clean or "context" in name_clean or "bám sát" in name_clean or "bối cảnh" in name_clean or "hiểu" in name_clean:
        return "Problem Understanding & Context"
    if "accuracy" in name_clean or "domain" in name_clean or "chính xác" in name_clean or "kiến thức" in name_clean:
        return "Domain Knowledge & Accuracy"
    if "reasoning" in name_clean or "analysis" in name_clean or "lập luận" in name_clean or "bằng chứng" in name_clean:
        return "Reasoning & Analysis"
    if "solution" in name_clean or "recommendation" in name_clean or "khuyến nghị" in name_clean or "giải pháp" in name_clean or "kết luận" in name_clean:
        return "Solution & Recommendation"
    if "feasibility" in name_clean or "risk" in name_clean or "khả thi" in name_clean or "rủi ro" in name_clean:
        return "Feasibility & Risk Management"
    if "communication" in name_clean or "giao tiếp" in name_clean:
        return "Communication"
    return name


def _format_rubric_for_prompt(weights: dict[str, int], level: str) -> str:
    lines = ["### Scoring Scale (per criterion)", ""]
    lines.append("1 = Fails (No evidence, wrong concept, or off-target)")
    lines.append("2 = Weak (Thin reasoning, misses constraints, scattered)")
    lines.append("3 = Meets (Basic correctness, covers core, lacks depth/trade-offs)")
    lines.append("4 = Good (Accurate, structured, trade-offs considered, practical)")
    lines.append("5 = Excellent (Deep, precise, well-contextualised, evidence-backed, persuasive)")
    lines.append("")
    lines.append(f"### Seniority Context: {level}")
    lines.append("- Intern/Fresher: focus on fundamentals, clarity, basic correctness")
    lines.append("- Junior: correct reasoning, practical examples, awareness of trade-offs")
    lines.append("- Mid: depth, prioritisation, risk awareness, stronger judgment")
    lines.append("- Senior: strategic trade-offs, operational excellence, mentoring patterns")
    lines.append("- Lead/Executive: alignment, organization, stakeholder and risk governance")
    lines.append("")
    lines.append("### 6 Criteria (score each independently 1-5)")
    lines.append("")

    for i, (name, desc) in enumerate(_CRITERIA_DESCRIPTORS.items(), 1):
        weight = weights.get(name, 0)
        lines.append(f"**Criterion {i}: {name} — Weight {weight}%**")
        lines.append(f"  Definition: {desc['definition']}")
        lines.append(f"  Level 1 (Fails): {desc['level_1']}")
        lines.append(f"  Level 3 (Meets): {desc['level_3']}")
        lines.append(f"  Level 5 (Excellent): {desc['level_5']}")
        lines.append("")

    return "\n".join(lines)


def _rubric_prompt(question_type: str, level: str, preferred_language: str, major: str, role: str) -> str:
    base_weights = _TASK_TYPE_WEIGHTS.get(question_type, _TASK_TYPE_WEIGHTS["theory"])
    adjusted_weights = _adjust_weights_by_level(base_weights, level)
    rubric_section = _format_rubric_for_prompt(adjusted_weights, level)

    lang_name = "Vietnamese (tiếng Việt)" if preferred_language == "vi" else "English"
    return f"""
CRITICAL LANGUAGE CONSTRAINT:
You MUST write all textual fields (including assessments, evidence, missing, summary, weakness_summary, strengths, gaps, improvements, better_outline, and follow_up) strictly and exclusively in {lang_name}. Under no circumstances should you output in any language other than {lang_name}, even if the candidate's answer, the question, or the reference answer is written in a different language.

You are Invera's interview evaluator. Use the structured rubric below to score the candidate's answer.

The reference answer is only an anchor for expected depth, not a mandatory checklist.
Reward correct paraphrases, clear reasoning, and useful examples even when wording differs.

{rubric_section}

### Critical Fail Flags
Be on the lookout for any of the following critical fail issues. If present, set the corresponding flags in "critical_fail_flags":
- "fabrication": Candidate fabricated data, background, or technical terms that do not exist.
- "core_error": Major conceptual error that invalidates the entire solution/conclusions.
- "safety_violation": Proposes designs/actions causing major security, privacy, legal, compliance, or safety risks.
- "off_target": Candidate did not answer the question asked at all, despite good delivery.

Return STRICT JSON only:
{{
  "language": "{preferred_language}",
  "question_type": "{question_type}",
  "criteria": [
    {{
      "name": "criterion name (exactly as listed above)",
      "score": 1-5,
      "assessment": "strong | mixed | weak | fails",
      "quote": "short exact excerpt copied from the candidate answer that justifies this criterion score",
      "evidence": "practical evaluation of that quoted excerpt for this criterion",
      "evidence_confidence": "high | medium | low",
      "missing": "what would raise the score"
    }}
  ],
  "critical_fail_flags": ["fabrication" | "core_error" | "safety_violation" | "off_target"],
  "summary": "short factual summary of what the candidate actually answered",
  "weakness_summary": "short summary of what is missing, weak, or off-target",
  "strengths": ["max 4 specific bullets"],
  "gaps": ["max 4 specific bullets"],
  "improvements": ["max 4 prioritized actions"],
  "better_outline": ["max 5 short steps"],
  "follow_up": ["max 2 short follow-up questions"]
}}

Rules:
- Be evidence-based. Do not invent experience, metrics, or implementation details.
- Every criterion MUST include quote. The quote must be copied from candidate_answer, max 18 words, and must not be paraphrased.
- Never quote the question, reference answer, rubric text, or your own summary. If possible, use different candidate_answer excerpts across criteria.
- In evidence, evaluate the quoted words directly against the rubric. Do not write generic feedback that could apply to any answer.
- In "evidence_confidence", rate the clarity of evidence:
  - "high": specific examples, clear metrics, or clear implementation facts.
  - "medium": some details but lacks complete context or proof.
  - "low": generic statements, buzzwords, or superficial answers.
- Never quote the question, reference answer, rubric text, or your own summary.
- In evidence, evaluate the quoted words directly against the rubric.
- In missing, name the specific concept, example, trade-off, risk, metric, or implementation detail needed next.
- Score each criterion using the anchor descriptions (Level 1, 3, 5) as your guide.
- Use the full 1-5 scale — do not only use 2, 3, 4.
- Do NOT calculate the overall score yourself. The overall score will be calculated programmatically in Python from the criteria scores and their weights.
- The quick summary has two separate ideas: "summary" must summarize the candidate's answer, and "weakness_summary" must summarize missing or weak parts.
- Write every field (summary, weakness_summary, evidence, missing, strengths, gaps, improvements, better_outline, follow_up) in {lang_name} only.

### Non-Verbal Video Telemetry Evaluation (If present as candidate_video_telemetry):
If the candidate's response was recorded with a webcam, you will see a `candidate_video_telemetry` object containing ratios from client-side tracking:
- `gazeRatio` (0.0 to 1.0): Time candidate maintained eye contact with the camera. A ratio < 0.6 indicates looking away too often or reading.
- `smileRatio` (0.0 to 1.0): Time candidate was smiling. Higher values (>0.2) show a friendly and positive demeanor.
- `slouchRatio` (0.0 to 1.0): Time candidate sat with a slouched/slouching posture. A ratio > 0.3 indicates poor posture/slouching.
- `handGestures` (integer >= 0): The count of hand gestures detected. Moderate count (5 to 15) suggests natural body language. 0 suggests stiffness. Extremely high suggests fidgeting or distraction.
- `fidgetRatio` (0.0 to 1.0): Time candidate showed nervous repetitive fidgeting movements. A ratio > 0.3 indicates high nervousness.

Use these metrics to influence the evaluation of the **Communication** criterion (and mention constructive non-verbal feedback in the `improvements` or `gaps` list). For example, if eye contact is poor (< 0.6), suggest looking directly at the camera. If slouching is high (> 0.3), suggest keeping a straight posture. Keep the tone professional, encouraging, and constructive.
""".strip()


_CONFIDENCE_LABELS = {
    "vi": {
        "high": "Cao",
        "medium": "Vừa",
        "low": "Thấp",
    },
    "en": {
        "high": "High",
        "medium": "Medium",
        "low": "Low",
    }
}

_CRITICAL_FAIL_WARNINGS = {
    "vi": {
        "fabrication": "Phát hiện bịa đặt thông tin, số liệu hoặc thuật ngữ chuyên môn.",
        "core_error": "Mắc lỗi nghiêm trọng về khái niệm cốt lõi hoặc kiến thức căn bản.",
        "safety_violation": "Đề xuất có rủi ro lớn về an toàn, bảo mật, pháp lý hoặc đạo đức.",
        "off_target": "Trả lời lệch trọng tâm hoặc không trả lời đúng câu hỏi được hỏi.",
    },
    "en": {
        "fabrication": "Fabricated information, metrics, or technical terminology detected.",
        "core_error": "Major concept or fundamental error in technical knowledge.",
        "safety_violation": "Proposal carries significant safety, security, legal, or ethical risks.",
        "off_target": "Answer is off-target or did not address the question asked.",
    }
}


def _format_feedback(result: dict[str, Any]) -> str:
    language = "vi" if result.get("language") == "vi" else "en"
    labels = {
        "vi": {
            "summary": "Tóm tắt",
            "criteria": "Tiêu chí chấm",
            "strengths": "Điểm tốt",
            "gaps": "Điểm cần cải thiện",
            "improvements": "Ưu tiên cải thiện",
            "outline": "Khung trả lời tốt hơn",
            "follow_up": "Câu hỏi follow-up",
        },
        "en": {
            "summary": "Summary",
            "criteria": "Scoring criteria",
            "strengths": "Strengths",
            "gaps": "Gaps",
            "improvements": "Priority improvements",
            "outline": "Stronger answer outline",
            "follow_up": "Follow-up questions",
        },
    }[language]

    lines: list[str] = []
    summary = _quick_summary(result, language)
    if summary:
        lines.append(f"{labels['summary']}: {summary}")

    flags = [str(f).strip().lower() for f in result.get("critical_fail_flags") or []]
    valid_flags = [f for f in flags if f in _CRITICAL_FAIL_WARNINGS[language]]
    if valid_flags:
        lines.append("")
        for f in valid_flags:
            lines.append(f"⚠️ {_CRITICAL_FAIL_WARNINGS[language][f]}")

    criteria = result.get("criteria") or []
    if isinstance(criteria, list) and criteria and not result.get("is_weak_guard"):
        lines.append("")
        lines.append(f"{labels['criteria']}:")
        for item in criteria[:6]:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            assessment = str(item.get("assessment") or "").strip()
            quote = str(item.get("quote") or "").strip()
            evidence = str(item.get("evidence") or "").strip()
            missing = str(item.get("missing") or "").strip()
            if quote and not (quote.startswith("“") and quote.endswith("”")):
                quote = f"“{quote.strip(chr(34) + '“”')}”"
            
            confidence_val = str(item.get("evidence_confidence") or "").strip().lower()
            confidence_str = ""
            if confidence_val in _CONFIDENCE_LABELS[language]:
                conf_text = _CONFIDENCE_LABELS[language][confidence_val]
                if language == "vi":
                    confidence_str = f" (Mức tin cậy bằng chứng: {conf_text})"
                else:
                    confidence_str = f" (Evidence confidence: {conf_text})"

            display_name = _CRITERIA_NAME_VI.get(name, name) if language == "vi" else name

            if language == "vi":
                detail_parts = [
                    f"Trích dẫn: {quote}" if quote else "",
                    f"Đánh giá: {evidence}{confidence_str}" if evidence else "",
                    f"Thiếu: {missing}" if missing else "",
                ]
            else:
                detail_parts = [
                    f"Quote: {quote}" if quote else "",
                    f"Evaluation: {evidence}{confidence_str}" if evidence else "",
                    f"Missing: {missing}" if missing else "",
                ]
            detail_parts = [part for part in detail_parts if part]
            title = " - ".join(part for part in (display_name, assessment) if part)
            lines.append(f"- {title}: {' | '.join(detail_parts)}".rstrip(": "))

    for key, label in (
        ("strengths", labels["strengths"]),
        ("gaps", labels["gaps"]),
        ("improvements", labels["improvements"]),
        ("better_outline", labels["outline"]),
        ("follow_up", labels["follow_up"]),
    ):
        values = result.get(key) or []
        if not isinstance(values, list) or not values:
            continue
        lines.append("")
        lines.append(f"{label}:")
        for value in values[:4]:
            text = str(value).strip()
            if text:
                lines.append(f"- {text}")

    feedback = "\n".join(lines).strip()
    return feedback or (
        "Chưa thể tạo nhận xét chi tiết."
        if language == "vi"
        else "Unable to generate detailed feedback."
    )


def _quick_summary(result: dict[str, Any], language: str) -> str:
    if result.get("is_weak_guard"):
        if language == "vi":
            return "Câu trả lời không đúng trọng tâm hoặc quá ngắn"
        else:
            return "The answer is off-topic or too short"

    answer_part = str(result.get("summary") or result.get("answer_summary") or "").strip()
    weakness_part = str(result.get("weakness_summary") or result.get("missing_summary") or "").strip()

    if not weakness_part:
        gaps = result.get("gaps") or []
        if isinstance(gaps, list):
            weakness_part = " ".join(str(item).strip() for item in gaps[:2] if str(item).strip())

    if not weakness_part:
        criteria = [item for item in (result.get("criteria") or []) if isinstance(item, dict)]
        weak_names = [
            str(item.get("name") or "").strip()
            for item in criteria
            if str(item.get("assessment") or "").strip().lower() in ("weak", "fails", "fail")
        ]
        if weak_names:
            if language == "vi":
                translated = [_CRITERIA_NAME_VI.get(name, name) for name in weak_names[:2]]
                weakness_part = f"Còn yếu ở: {', '.join(name for name in translated if name)}."
            else:
                weakness_part = f"Weak areas remain: {', '.join(name for name in weak_names[:2] if name)}."

    if language == "vi":
        if not answer_part:
            answer_part = "Chưa có đủ nội dung rõ ràng để tóm tắt câu trả lời."
        if not weakness_part:
            weakness_part = "Cần bổ sung thêm chiều sâu, ví dụ, và lập luận."
        return f"Câu trả lời của bạn: {answer_part} | Thiếu / còn yếu: {weakness_part}"

    if not answer_part:
        answer_part = "There is not enough clear content to summarize the answer."
    if not weakness_part:
        weakness_part = "Add more depth, examples, and reasoning."
    return f"Candidate answer: {answer_part} | Missing or weak: {weakness_part}"



def _normalize_model_response(content: str, request: ScoringRequest) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    result = json.loads(cleaned)
    if not isinstance(result, dict):
        raise ValueError("DeepSeek scoring output must be a JSON object.")

    question_type = result.get("question_type") or _detect_task_type(
        request.category,
        request.question_text,
        request.role,
        request.major,
    )
    result["question_type"] = question_type
    result["language"] = (
        normalize_supported_language(request.preferred_language, "en")
        if request.force_language
        else normalize_supported_language(result.get("language"), request.preferred_language)
    )

    for key in ("strengths", "gaps", "improvements", "better_outline", "follow_up"):
        value = result.get(key)
        if value is None:
            result[key] = []
        elif not isinstance(value, list):
            result[key] = [str(value)]

    base_weights = _TASK_TYPE_WEIGHTS.get(question_type, _TASK_TYPE_WEIGHTS["theory"])
    adjusted_weights = _adjust_weights_by_level(base_weights, request.level)

    criteria_list = result.get("criteria")
    if criteria_list is None:
        criteria_list = []
    elif not isinstance(criteria_list, list):
        criteria_list = [criteria_list]

    criteria_scores = {}
    normalized_criteria = []
    for item in criteria_list:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        normalized_name = _normalize_criterion_name(name)
        item["name"] = normalized_name

        score_val = item.get("score")
        if score_val is not None:
            if isinstance(score_val, str) and score_val.strip().lower() == "n/a":
                item["score"] = "N/A"
            else:
                try:
                    item["score"] = float(score_val)
                    criteria_scores[normalized_name] = item["score"]
                except (ValueError, TypeError):
                    item["score"] = "N/A"
        else:
            item["score"] = "N/A"

        item["assessment"] = str(item.get("assessment") or "").strip()
        item["quote"] = str(item.get("quote") or "").strip()
        item["evidence"] = str(item.get("evidence") or "").strip()
        item["evidence_confidence"] = str(item.get("evidence_confidence") or "").strip().lower()
        item["missing"] = str(item.get("missing") or "").strip()
        normalized_criteria.append(item)
    result["criteria"] = normalized_criteria

    # Recalculate score programmatically
    calculated_score = _calculate_overall_score(criteria_scores, adjusted_weights)

    # Check critical fail flags and apply ceiling limits
    critical_flags = result.get("critical_fail_flags")
    if not isinstance(critical_flags, list):
        critical_flags = []
    result["critical_fail_flags"] = [str(f).strip().lower() for f in critical_flags]

    # Ceiling limits (safety: 4.0, off-target: 5.0, fabrication: 5.5, core_error: 6.0)
    ceiling = 10.0
    if "safety_violation" in result["critical_fail_flags"]:
        ceiling = min(ceiling, 4.0)
    if "off_target" in result["critical_fail_flags"]:
        ceiling = min(ceiling, 5.0)
    if "fabrication" in result["critical_fail_flags"]:
        ceiling = min(ceiling, 5.5)
    if "core_error" in result["critical_fail_flags"]:
        ceiling = min(ceiling, 6.0)

    result["score"] = _clamp_score(min(calculated_score, ceiling))
    result["summary"] = str(result.get("summary") or "").strip()
    result["weakness_summary"] = str(result.get("weakness_summary") or result.get("missing_summary") or "").strip()
    return result


def _score_band_summary(score: float, language: str) -> str:
    if language == "vi":
        if score >= 8.5:
            return "Câu trả lời mạnh trong mắt HR: đúng trọng tâm, rõ ràng, có chiều sâu và có judgment."
        if score >= 6.5:
            return "Câu trả lời khá tốt và đáng tin, nhưng vẫn còn vài điểm có thể làm rõ hơn để thuyết phục HR."
        if score >= 4.0:
            return "Câu trả lời có nền tảng nhưng còn thiếu độ sâu, ví dụ cụ thể, hoặc cấu trúc rõ ràng hơn."
        return "Câu trả lời hiện còn yếu trong mắt HR vì quá ngắn, thiếu trọng tâm, hoặc thiếu phần giải thích."
    if score >= 8.5:
        return "This answer feels strong to an interviewer: clear, accurate, specific, and well-judged."
    if score >= 6.5:
        return "This answer is solid and credible, but a few details would make it more convincing to an interviewer."
    if score >= 4.0:
        return "This answer has some foundation, but it still needs more depth, specificity, or structure."
    return "This answer is currently weak for interview use because it is too short, off-target, or too shallow."


def _candidate_quote(answer_text: str, max_chars: int = 180) -> str:
    cleaned = sanitize_user_text(answer_text).strip()
    if not cleaned:
        return ""

    sentences = [chunk.strip() for chunk in re.split(r"(?<=[.!?。！？])\s+", cleaned) if chunk.strip()]
    quote = sentences[0] if sentences else cleaned
    if len(quote) <= max_chars:
        return quote

    return f"{quote[:max_chars].rsplit(' ', 1)[0].rstrip()}..."


def _candidate_quote_segments(answer_text: str, max_chars: int = 180) -> list[str]:
    cleaned = sanitize_user_text(answer_text).strip()
    if not cleaned:
        return []

    raw_segments = [
        chunk.strip()
        for chunk in re.split(r"(?<=[.!?。！？])\s+|\n+", cleaned)
        if chunk.strip()
    ]
    if len(raw_segments) <= 1:
        raw_segments = [
            chunk.strip()
            for chunk in re.split(r"\s*(?:;|,|,| và | nhưng | tuy nhiên | ví dụ | for example )\s*", cleaned, flags=re.I)
            if chunk.strip()
        ]

    segments: list[str] = []
    for segment in raw_segments:
        quote = segment
        if len(quote) > max_chars:
            quote = quote[:max_chars].rsplit(" ", 1)[0].rstrip()
        if quote and quote not in segments:
            segments.append(quote)
    return segments or [_candidate_quote(answer_text, max_chars=max_chars)]


def _quote_belongs_to_answer(quote: str, answer_text: str) -> bool:
    cleaned_quote = quote.strip().strip('"“”')
    if not cleaned_quote:
        return False
    return cleaned_quote in sanitize_user_text(answer_text)


def _fill_missing_criterion_quotes(result: dict[str, Any], answer_text: str) -> dict[str, Any]:
    fallback_quote = _candidate_quote(answer_text)
    quote_segments = _candidate_quote_segments(answer_text)
    used_quotes: set[str] = set()
    criteria = result.get("criteria") or []
    if not isinstance(criteria, list):
        return result

    for index, item in enumerate(criteria):
        if not isinstance(item, dict):
            continue

        current_quote = str(item.get("quote") or "").strip().strip('"“”')
        quote_is_usable = _quote_belongs_to_answer(current_quote, answer_text) and current_quote not in used_quotes
        if quote_is_usable:
            item["quote"] = current_quote
            used_quotes.add(current_quote)
            continue

        replacement = ""
        for offset in range(len(quote_segments)):
            candidate = quote_segments[(index + offset) % len(quote_segments)]
            if candidate and candidate not in used_quotes:
                replacement = candidate
                break
        item["quote"] = replacement or fallback_quote
        if item["quote"]:
            used_quotes.add(item["quote"])
    return result


def _short_answer_word_limit(language: str) -> int:
    return SHORT_VIETNAMESE_WORD_LIMIT if language == "vi" else SHORT_ENGLISH_WORD_LIMIT


def _short_answer_result(request: ScoringRequest, word_count: int) -> dict[str, Any]:
    language = request.preferred_language
    word_limit = _short_answer_word_limit(language)
    score = _clamp_score(min(2.5, max(0.4, round((word_count / max(word_limit, 1)) * 2.5, 1))))
    question_type = _detect_question_type(request.category, request.question_text)

    if language == "vi":
        summary = "Câu trả lời quá ngắn để HR đánh giá cách tư duy, mức độ hiểu bài, và khả năng trình bày của bạn."
        criteria = [
            {
                "name": "Độ dài và mức độ triển khai",
                "assessment": "weak",
                "evidence": f"Bạn mới trả lời khoảng {word_count} từ, nên chưa đủ ý.",
                "missing": "Cần ít nhất 2-4 câu để nêu ý chính, giải thích lý do, và bổ sung ví dụ ngắn.",
            },
            {
                "name": "Mức độ thuyết phục với HR",
                "assessment": "weak",
                "evidence": "Người phỏng vấn khó nhìn thấy logic, mức độ hiểu bài, hoặc kinh nghiệm của bạn.",
                "missing": "Cần thêm lập luận, chi tiết cụ thể, hoặc cách áp dụng vào tình huống thực tế.",
            },
        ]
        strengths = ["Bạn đã cố gắng trả lời trực tiếp vào câu hỏi."] if request.answer_text.strip() else []
        gaps = [
            "Câu trả lời quá ngắn nên điểm sẽ bị đánh giá kém.",
            "Chưa có phần giải thích vì sao hoặc cách nó hoạt động.",
            "Chưa có ví dụ, tình huống, hoặc trade-off để tăng độ tin cậy.",
        ]
        improvements = [
            "Mở đầu bằng câu trả lời trực tiếp 1-2 câu.",
            "Thêm 1-2 câu giải thích lý do, cơ chế, hoặc cách bạn ra quyết định.",
            "Kết thúc bằng một ví dụ ngắn, kết quả, hoặc lưu ý quan trọng.",
        ]
        better_outline = _better_outline(question_type, language)
        follow_up = _follow_up_prompts(question_type, language)
    else:
        summary = "The answer is too short for an interviewer to judge your thinking, understanding, and communication."
        criteria = [
            {
                "name": "Depth and completeness",
                "assessment": "weak",
                "evidence": f"The answer is only about {word_count} words, so it does not show enough substance.",
                "missing": "Add at least 2-4 sentences with the direct answer, reasoning, and a short example.",
            },
            {
                "name": "Interview credibility",
                "assessment": "weak",
                "evidence": "An interviewer cannot clearly see your logic, understanding, or practical judgment yet.",
                "missing": "Add reasoning, concrete detail, or a practical application.",
            },
        ]
        strengths = ["You attempted a direct response."] if request.answer_text.strip() else []
        gaps = [
            "The answer is too short and will be judged weak.",
            "It does not explain why or how.",
            "It does not give an example, scenario, or trade-off.",
        ]
        improvements = [
            "Start with a direct answer in 1-2 sentences.",
            "Add 1-2 sentences explaining the logic or mechanism.",
            "Close with a short example, result, or practical caveat.",
        ]
        better_outline = _better_outline(question_type, language)
        follow_up = _follow_up_prompts(question_type, language)

    return {
        "language": language,
        "question_type": question_type,
        "score": score,
        "summary": summary,
        "criteria": criteria,
        "strengths": strengths,
        "gaps": gaps,
        "improvements": improvements,
        "better_outline": better_outline,
        "follow_up": follow_up,
        "is_weak_guard": True,
    }


def _off_topic_result(request: ScoringRequest, relevance: float) -> dict[str, Any]:
    language = request.preferred_language
    question_type = _detect_question_type(request.category, request.question_text)

    if language == "vi":
        return {
            "language": language,
            "question_type": question_type,
            "score": 1.8 if relevance < 0.04 else 2.6,
            "summary": "Câu trả lời đang lệch khỏi trọng tâm câu hỏi nên HR sẽ đánh giá là chưa liên quan.",
            "criteria": [
                {
                    "name": "Mức độ liên quan",
                    "assessment": "weak",
                    "evidence": "Câu trả lời chưa bám đúng ý chính mà câu hỏi đang yêu cầu.",
                    "missing": "Hãy trả lời trực tiếp vào câu hỏi trước, rồi mới mở rộng thêm.",
                },
                {
                    "name": "Khả năng thuyết phục",
                    "assessment": "weak",
                    "evidence": "Người phỏng vấn sẽ khó thấy bạn đang hiểu đúng điều họ hỏi.",
                    "missing": "Nêu đúng khái niệm, mục tiêu, hoặc quyết định mà câu hỏi đang nhắm tới.",
                },
            ],
            "strengths": [],
            "gaps": [
                "Câu trả lời hiện chưa liên quan đủ với câu hỏi.",
                "Bạn chưa trả lời trực tiếp vào ý chính.",
            ],
            "improvements": [
                "Đọc lại câu hỏi và xác định đúng ý cần trả lời.",
                "Mở đầu bằng một câu trả lời trực tiếp, đúng trọng tâm.",
                "Chỉ thêm ví dụ sau khi đã trả lời đúng ý chính.",
            ],
            "better_outline": _better_outline(question_type, language),
            "follow_up": _follow_up_prompts(question_type, language),
            "is_weak_guard": True,
        }

    return {
        "language": language,
        "question_type": question_type,
        "score": 1.8 if relevance < 0.04 else 2.6,
        "summary": "The answer is off the question, so an interviewer would judge it as not relevant enough.",
        "criteria": [
            {
                "name": "Relevance",
                "assessment": "weak",
                "evidence": "The response does not stay on the main point of the question.",
                "missing": "Answer the exact question first, then add supporting detail.",
            },
            {
                "name": "Interview credibility",
                "assessment": "weak",
                "evidence": "An interviewer would struggle to see that you understood what was being asked.",
                "missing": "Name the concept, decision, or goal the question is actually targeting.",
            },
        ],
        "strengths": [],
        "gaps": [
            "The answer is not relevant enough to the question yet.",
            "It does not directly address the main point first.",
        ],
        "improvements": [
            "Re-read the question and identify the exact point being asked.",
            "Start with a direct answer that matches the question.",
            "Only add examples after the main point is clearly answered.",
        ],
        "better_outline": _better_outline(question_type, language),
        "follow_up": _follow_up_prompts(question_type, language),
        "is_weak_guard": True,
    }


def _low_quality_answer_result(request: ScoringRequest) -> dict[str, Any]:
    language = request.preferred_language
    question_type = _detect_question_type(request.category, request.question_text)

    if language == "vi":
        return {
            "language": language,
            "question_type": question_type,
            "score": 1.0,
            "summary": "Câu trả lời không đủ rõ nghĩa để đánh giá như một câu trả lời phỏng vấn.",
            "weakness_summary": "Nội dung giống ký tự rời rạc hoặc chuỗi không có nghĩa, nên chưa bám trọng tâm câu hỏi.",
            "criteria": [
                {
                    "name": "Mức độ liên quan",
                    "assessment": "weak",
                    "evidence": "Nội dung không tạo thành ý trả lời rõ ràng cho câu hỏi.",
                    "missing": "Viết lại bằng câu hoàn chỉnh, trả lời trực tiếp vào ý chính.",
                },
                {
                    "name": "Khả năng thuyết phục",
                    "assessment": "weak",
                    "evidence": "Người phỏng vấn không thể đánh giá kiến thức hoặc kinh nghiệm từ nội dung này.",
                    "missing": "Bổ sung khái niệm, lý do, ví dụ hoặc tình huống áp dụng cụ thể.",
                },
            ],
            "strengths": [],
            "gaps": [
                "Câu trả lời chưa đủ rõ nghĩa hoặc chưa đúng trọng tâm.",
                "Chưa có lập luận, ví dụ, hoặc thông tin chuyên môn để đánh giá.",
            ],
            "improvements": [
                "Viết lại thành 2-4 câu hoàn chỉnh.",
                "Mở đầu bằng câu trả lời trực tiếp.",
                "Thêm một ví dụ hoặc lý do cụ thể.",
            ],
            "better_outline": _better_outline(question_type, language),
            "follow_up": _follow_up_prompts(question_type, language),
            "is_weak_guard": True,
        }

    return {
        "language": language,
        "question_type": question_type,
        "score": 1.0,
        "summary": "The answer is not clear enough to evaluate as an interview response.",
        "weakness_summary": "The content appears to be random characters or unclear text, so it does not address the question.",
        "criteria": [
            {
                "name": "Relevance",
                "assessment": "weak",
                "evidence": "The content does not form a clear answer to the question.",
                "missing": "Rewrite it as complete sentences that directly answer the main point.",
            },
            {
                "name": "Interview credibility",
                "assessment": "weak",
                "evidence": "An interviewer cannot assess your knowledge or experience from this content.",
                "missing": "Add the concept, reasoning, example, or practical situation.",
            },
        ],
        "strengths": [],
        "gaps": [
            "The answer is not clear enough or is off the question.",
            "It does not include reasoning, examples, or domain-specific content.",
        ],
        "improvements": [
            "Rewrite it as 2-4 complete sentences.",
            "Start with a direct answer.",
            "Add one specific example or reason.",
        ],
        "better_outline": _better_outline(question_type, language),
        "follow_up": _follow_up_prompts(question_type, language),
        "is_weak_guard": True,
    }


def _quick_guard_result(request: ScoringRequest) -> dict[str, Any] | None:
    if _looks_like_gibberish(request.answer_text):
        return _low_quality_answer_result(request)

    words = _word_count(request.answer_text)
    word_limit = _short_answer_word_limit(request.preferred_language)
    if words < word_limit:
        return _short_answer_result(request, words)

    answer_tokens = _tokenize(request.answer_text)
    question_tokens = _tokenize(request.question_text)
    ideal_tokens = _tokenize(request.ideal_answer)
    if words < OFF_TOPIC_WORD_MINIMUM or not answer_tokens:
        return None

    # Relaxed off-topic check: let the LLM perform semantic relevance grading
    return None


def _better_outline(question_type: str, language: str) -> list[str]:
    if language == "vi":
        if question_type == "behavioral":
            return [
                "Mở đầu bằng bối cảnh ngắn gọn và mục tiêu.",
                "Nói rõ hành động của bạn, không chỉ mô tả team.",
                "Nêu kết quả đo được hoặc bài học rút ra.",
            ]
        return [
            "Trả lời trực tiếp câu hỏi ngay ở 1-2 câu đầu.",
            "Giải thích cơ chế, lý do, hoặc cách bạn suy nghĩ.",
            "Bổ sung một ví dụ thực tế hoặc tình huống áp dụng.",
            "Nếu có, kết bằng trade-off, rủi ro, hoặc khi nào không nên dùng.",
        ]
    if question_type == "behavioral":
        return [
            "Open with the context and the goal.",
            "Focus on your actions, not just the team background.",
            "Close with the result and what you learned.",
        ]
    return [
        "Answer the question directly in the first 1-2 sentences.",
        "Explain the mechanism, reasoning, or decision process.",
        "Add a concrete example or real use case.",
        "If relevant, finish with a trade-off, risk, or caveat.",
    ]


def _follow_up_prompts(question_type: str, language: str) -> list[str]:
    if language == "vi":
        if question_type == "behavioral":
            return [
                "Kết quả cụ thể của tình huống đó là gì?",
                "Bạn đã học được gì và sẽ làm khác đi ở lần sau?",
            ]
        return [
            "Vì sao cách giải thích này tốt hơn các cách khác?",
            "Trade-off hoặc rủi ro chính trong trường hợp này là gì?",
        ]
    if question_type == "behavioral":
        return [
            "What was the measurable result of that situation?",
            "What did you learn and what would you do differently next time?",
        ]
    return [
        "Why is this approach better than another option here?",
        "What is the main trade-off or risk in this case?",
    ]


def _heuristic_metrics(request: ScoringRequest) -> dict[str, Any]:
    answer_text = request.answer_text.strip()
    answer_tokens = _tokenize(answer_text)
    question_tokens = _tokenize(request.question_text)
    ideal_tokens = _tokenize(request.ideal_answer)
    words = _word_count(answer_text)
    sentences = _sentence_count(answer_text)
    question_type = _detect_question_type(request.category, request.question_text)
    normalized_answer = answer_text.lower()

    overlap_question = len(answer_tokens & question_tokens) / max(len(question_tokens), 1) if question_tokens else 0.0
    overlap_ideal = len(answer_tokens & ideal_tokens) / max(len(ideal_tokens), 1) if ideal_tokens else 0.0
    relevance = min(1.0, (overlap_question * 1.35) + (overlap_ideal * 0.75))

    if words >= 90:
        length_metric = 1.0
    elif words >= 60:
        length_metric = 0.82
    elif words >= 35:
        length_metric = 0.64
    elif words >= 20:
        length_metric = 0.42
    elif words >= 12:
        length_metric = 0.24
    else:
        length_metric = 0.08

    reasoning_hits = _count_phrase_hits(normalized_answer, REASONING_MARKERS)
    example_hits = _count_phrase_hits(normalized_answer, EXAMPLE_MARKERS)
    tradeoff_hits = _count_phrase_hits(normalized_answer, TRADEOFF_MARKERS)
    structure_hits = _count_phrase_hits(normalized_answer, STRUCTURE_MARKERS)
    has_numbers = bool(re.search(r"\d", answer_text))

    reasoning_metric = min(
        1.0,
        (0.32 if sentences >= 2 else 0.0)
        + (0.18 if sentences >= 3 else 0.0)
        + min(reasoning_hits, 3) * 0.18
        + (0.12 if structure_hits > 0 else 0.0),
    )
    specificity_metric = min(
        1.0,
        (0.24 if len(answer_tokens) >= 10 else 0.0)
        + (0.18 if len(answer_tokens) >= 18 else 0.0)
        + min(example_hits, 2) * 0.22
        + (0.16 if has_numbers else 0.0)
        + (0.12 if words >= 45 else 0.0),
    )
    tradeoff_metric = min(
        1.0,
        min(tradeoff_hits, 3) * 0.28
        + (0.12 if "vs" in normalized_answer or "versus" in normalized_answer else 0.0),
    )

    score = 0.8 + (relevance * 4.35) + (length_metric * 1.55) + (reasoning_metric * 1.45) + (specificity_metric * 1.2)
    if question_type in {"system_design", "database", "algorithm", "technical_general"} or request.difficulty != "easy":
        score += tradeoff_metric * 0.65
    else:
        score += min(tradeoff_metric, 0.35) * 0.35

    if words < 12:
        score = min(score, 4.0)
    elif words < 20:
        score = min(score, 5.4)

    if relevance < 0.08:
        score = min(score, 2.5)
    elif relevance < 0.16:
        score = min(score, 4.0)
    elif relevance < 0.24:
        score = min(score, 5.6)

    if words >= 35 and relevance >= 0.26 and reasoning_metric >= 0.42:
        score = max(score, 6.5)
    if words >= 60 and relevance >= 0.32 and reasoning_metric >= 0.55 and specificity_metric >= 0.42:
        score = max(score, 7.2)

    return {
        "question_type": question_type,
        "language": (
            normalize_supported_language(request.preferred_language, "en")
            if request.force_language
            else select_response_language(
                request.preferred_language,
                request.question_text,
                request.answer_text,
            )
        ),
        "words": words,
        "sentences": sentences,
        "relevance": min(relevance, 1.0),
        "length_metric": length_metric,
        "reasoning_metric": reasoning_metric,
        "specificity_metric": specificity_metric,
        "tradeoff_metric": tradeoff_metric,
        "score": _clamp_score(score),
        "has_example": example_hits > 0 or has_numbers,
        "tradeoff_relevant": question_type in {"system_design", "database", "algorithm", "technical_general"}
        or request.difficulty != "easy",
    }


def _generate_heuristic_summary(metrics: dict[str, Any], language: str) -> str:
    relevance = metrics["relevance"]
    reasoning = metrics["reasoning_metric"]
    has_example = metrics["has_example"]
    tradeoff = metrics["tradeoff_metric"]
    tradeoff_relevant = metrics["tradeoff_relevant"]

    if language == "vi":
        parts = []
        if relevance >= 0.72:
            parts.append("Câu trả lời bám sát tốt câu hỏi.")
        elif relevance >= 0.42:
            parts.append("Câu trả lời có phần liên quan nhưng cần tập trung hơn vào trọng tâm.")
        else:
            parts.append("Câu trả lời chưa bám sát nội dung câu hỏi.")

        if reasoning >= 0.72:
            parts.append("Lập luận của bạn rất mạch lạc và có chiều sâu phân tích.")
        elif reasoning >= 0.42:
            parts.append("Bạn đã giải thích được ý chính nhưng logic trình bày còn có thể chặt chẽ hơn.")
        else:
            parts.append("Lập luận còn mỏng và thiếu các lý do giải thích sâu hơn.")

        if has_example:
            parts.append("Điểm cộng là bạn đã đưa ra được ví dụ hoặc số liệu minh họa cụ thể.")
        else:
            parts.append("Để thuyết phục hơn, bạn nên đưa thêm ví dụ thực tế hoặc dữ liệu minh họa.")

        if tradeoff_relevant:
            if tradeoff >= 0.5:
                parts.append("Bạn cũng cho thấy nhận thức tốt về các đánh đổi (trade-offs) và rủi ro.")
            else:
                parts.append("Tuy nhiên, câu trả lời sẽ mạnh hơn nếu phân tích thêm các trade-offs hoặc rủi ro đi kèm.")

        return " ".join(parts)
    else:
        parts = []
        if relevance >= 0.72:
            parts.append("The answer is highly relevant and addresses the core question directly.")
        elif relevance >= 0.42:
            parts.append("The answer is somewhat relevant but needs to be more focused on the core point.")
        else:
            parts.append("The response does not stay close enough to the question's focus.")

        if reasoning >= 0.72:
            parts.append("Your reasoning is coherent, structured, and displays good analytical depth.")
        elif reasoning >= 0.42:
            parts.append("You explained the main point, but the logical structure could be tighter.")
        else:
            parts.append("The explanation is thin and lacks sufficient supporting logic.")

        if has_example:
            parts.append("Notably, you included a concrete example or data point to support your answer.")
        else:
            parts.append("To make it more convincing, you should add a real-world example or specific details.")

        if tradeoff_relevant:
            if tradeoff >= 0.5:
                parts.append("You also showed good awareness of the trade-offs and risks involved.")
            else:
                parts.append("However, analyzing the trade-offs or operational risks would improve the answer.")

        return " ".join(parts)


def _heuristic_result(request: ScoringRequest) -> dict[str, Any]:
    metrics = _heuristic_metrics(request)
    language = metrics["language"]
    question_type = metrics["question_type"]
    quote = _candidate_quote(request.answer_text)

    p_context_metric = metrics["relevance"]
    domain_metric = metrics["relevance"] * 0.6 + metrics["length_metric"] * 0.4
    reasoning_metric = metrics["reasoning_metric"]
    solution_metric = metrics["relevance"] * 0.5 + metrics["specificity_metric"] * 0.3 + metrics["reasoning_metric"] * 0.2
    
    if metrics["tradeoff_relevant"]:
        feasibility_metric = metrics["tradeoff_metric"]
    else:
        feasibility_metric = max(metrics["tradeoff_metric"], metrics["reasoning_metric"] * 0.5)
        
    comm_metric = metrics["length_metric"] * 0.5 + metrics["reasoning_metric"] * 0.5
    
    p_context_score = max(1.0, min(5.0, round(1.0 + p_context_metric * 4.0, 1)))
    domain_score = max(1.0, min(5.0, round(1.0 + domain_metric * 4.0, 1)))
    reasoning_score = max(1.0, min(5.0, round(1.0 + reasoning_metric * 4.0, 1)))
    solution_score = max(1.0, min(5.0, round(1.0 + solution_metric * 4.0, 1)))
    feasibility_score = max(1.0, min(5.0, round(1.0 + feasibility_metric * 4.0, 1)))
    comm_score = max(1.0, min(5.0, round(1.0 + comm_metric * 4.0, 1)))
    
    p_context_assess = _assessment_label(p_context_metric)
    domain_assess = _assessment_label(domain_metric)
    reasoning_assess = _assessment_label(reasoning_metric)
    solution_assess = _assessment_label(solution_metric)
    feasibility_assess = _assessment_label(feasibility_metric)
    comm_assess = _assessment_label(comm_metric)
    
    p_context_conf = "high" if p_context_metric >= 0.72 else ("medium" if p_context_metric >= 0.42 else "low")
    domain_conf = "high" if domain_metric >= 0.72 else ("medium" if domain_metric >= 0.42 else "low")
    reasoning_conf = "high" if reasoning_metric >= 0.72 else ("medium" if reasoning_metric >= 0.42 else "low")
    solution_conf = "high" if solution_metric >= 0.72 else ("medium" if solution_metric >= 0.42 else "low")
    feasibility_conf = "high" if feasibility_metric >= 0.72 else ("medium" if feasibility_metric >= 0.42 else "low")
    comm_conf = "high" if comm_metric >= 0.72 else ("medium" if comm_metric >= 0.42 else "low")

    if language == "vi":
        criteria = [
            {
                "name": "Problem Understanding & Context",
                "score": p_context_score,
                "assessment": p_context_assess,
                "quote": quote,
                "evidence": "Câu trả lời có độ liên quan cao với các từ khóa và nội dung chính được hỏi." if p_context_assess == "strong" else (
                    "Câu trả lời có một số từ khóa đúng ý nhưng chưa bao phủ hết bối cảnh hoặc mục tiêu." if p_context_assess == "mixed" else
                    "Câu trả lời chưa bám sát ý chính của câu hỏi."
                ),
                "evidence_confidence": p_context_conf,
                "missing": "Cần xác định và phản hồi trực tiếp các từ khóa chính trong câu hỏi." if p_context_assess == "weak" else "Có thể làm rõ hơn bối cảnh hoặc mục tiêu cụ thể mà câu hỏi hướng tới.",
            },
            {
                "name": "Domain Knowledge & Accuracy",
                "score": domain_score,
                "assessment": domain_assess,
                "quote": quote,
                "evidence": "Thể hiện kiến thức chuyên môn tốt qua các thuật ngữ và chi tiết được nêu." if domain_assess == "strong" else (
                    "Nêu được một số kiến thức cơ bản nhưng cần thêm độ chính xác hoặc chi tiết." if domain_assess == "mixed" else
                    "Thiếu kiến thức chuyên môn hoặc thuật ngữ cần thiết để giải quyết câu hỏi."
                ),
                "evidence_confidence": domain_conf,
                "missing": "Bổ sung các thuật ngữ kỹ thuật, khái niệm chính xác hơn." if domain_assess == "weak" else "Bổ sung các ví dụ thực tế hoặc chi tiết cụ thể để củng cố độ chính xác.",
            },
            {
                "name": "Reasoning & Analysis",
                "score": reasoning_score,
                "assessment": reasoning_assess,
                "quote": quote,
                "evidence": "Lập luận mạch lạc, trình bày có cấu trúc rõ ràng và tính phân tích tốt." if reasoning_assess == "strong" else (
                    "Có giải thích lý do nhưng mạch logic trình bày chưa thật sự chặt chẽ." if reasoning_assess == "mixed" else
                    "Lập luận còn mỏng hoặc thiếu logic giải thích tại sao."
                ),
                "evidence_confidence": reasoning_conf,
                "missing": "Sử dụng các từ nối lập luận và cấu trúc các bước rõ ràng hơn." if reasoning_assess == "weak" else "Làm sâu sắc thêm mối quan hệ nhân quả trong phân tích.",
            },
            {
                "name": "Solution & Recommendation",
                "score": solution_score,
                "assessment": solution_assess,
                "quote": quote,
                "evidence": "Đề xuất giải pháp rõ ràng, hướng tới hành động cụ thể." if solution_assess == "strong" else (
                    "Có định hướng giải pháp nhưng cần làm rõ tính ứng dụng hoặc kết luận." if solution_assess == "mixed" else
                    "Chưa đề xuất được giải pháp hoặc kết luận cụ thể có tính khả thi."
                ),
                "evidence_confidence": solution_conf,
                "missing": "Đưa ra khuyến nghị hoặc hướng hành động cụ thể cho vấn đề." if solution_assess == "weak" else "Làm rõ cách đo lường hoặc đánh giá hiệu quả của giải pháp đề xuất.",
            },
            {
                "name": "Feasibility & Risk Management",
                "score": feasibility_score,
                "assessment": feasibility_assess,
                "quote": quote,
                "evidence": "Nhận diện tốt các rủi ro, trade-off hoặc cách quản lý tính khả thi." if feasibility_assess == "strong" else (
                    "Có đề cập tới rủi ro/đánh đổi nhưng chưa đề xuất biện pháp kiểm soát." if feasibility_assess == "mixed" else
                    "Chưa chỉ ra được rủi ro, giới hạn kỹ thuật hoặc phương án phòng ngừa."
                ),
                "evidence_confidence": feasibility_conf,
                "missing": "Phân tích thêm các đánh đổi (trade-offs), rủi ro vận hành hoặc bảo mật." if feasibility_assess == "weak" else "Bổ sung các bước kiểm soát rủi ro hoặc kế hoạch rollback cụ thể.",
            },
            {
                "name": "Communication",
                "score": comm_score,
                "assessment": comm_assess,
                "quote": quote,
                "evidence": "Trình bày mạch lạc, dễ hiểu, sử dụng từ ngữ và cấu trúc tốt." if comm_assess == "strong" else (
                    "Trình bày hiểu được nhưng còn dài dòng hoặc thiếu cấu trúc rõ." if comm_assess == "mixed" else
                    "Câu trả lời quá ngắn hoặc hành văn rời rạc, khó theo dõi."
                ),
                "evidence_confidence": comm_conf,
                "missing": "Viết câu dài hơn, có phân chia bố cục hoặc các ý rõ ràng." if comm_assess == "weak" else "Tóm tắt ý chính ở đầu (executive summary) để tăng tính chuyên nghiệp.",
            },
        ]
        
        strengths = []
        if p_context_assess == "strong":
            strengths.append("Câu trả lời bám sát đúng trọng tâm câu hỏi.")
        if reasoning_assess == "strong":
            strengths.append("Lập luận tương tương đối rõ ràng và dễ theo dõi.")
        if domain_assess == "strong":
            strengths.append("Có chi tiết chuyên môn cụ thể tạo cảm giác đáng tin.")
        
        gaps = []
        if p_context_assess != "strong":
            gaps.append("Cần trả lời trực tiếp hơn vào ý chính của câu hỏi.")
        if reasoning_assess != "strong":
            gaps.append("Cần bổ sung phần giải thích vì sao hoặc mạch logic liên kết.")
        if domain_assess != "strong":
            gaps.append("Cần thêm ví dụ, ngữ cảnh, hoặc chi tiết cụ thể để thuyết phục.")
        if feasibility_assess == "weak":
            gaps.append("Chưa thể hiện rõ trade-off, rủi ro hoặc judgment thực tế.")
            
        improvements = [
            "Mở đầu bằng câu trả lời trực tiếp trong 1-2 câu.",
            "Sau đó giải thích lý do/cách hoạt động bằng 2-3 ý rõ ràng.",
            "Kết bằng ví dụ, kết quả, hoặc trade-off để HR thấy được sự thực tế.",
        ]
    else:
        criteria = [
            {
                "name": "Problem Understanding & Context",
                "score": p_context_score,
                "assessment": p_context_assess,
                "quote": quote,
                "evidence": "The answer is highly relevant and addresses the core question directly." if p_context_assess == "strong" else (
                    "The answer contains some correct keywords but does not fully cover the context or goal." if p_context_assess == "mixed" else
                    "The answer does not stay close to the core points of the question."
                ),
                "evidence_confidence": p_context_conf,
                "missing": "Identify and directly address the main keywords of the question." if p_context_assess == "weak" else "Clarify the specific context or goals targeted by the question.",
            },
            {
                "name": "Domain Knowledge & Accuracy",
                "score": domain_score,
                "assessment": domain_assess,
                "quote": quote,
                "evidence": "Demonstrates accurate domain knowledge through terms and specific details." if domain_assess == "strong" else (
                    "Covers some basic domain knowledge but lacks precision or depth." if domain_assess == "mixed" else
                    "Missing domain concepts or terminology required to resolve the question."
                ),
                "evidence_confidence": domain_conf,
                "missing": "Include precise technical terms and core concepts." if domain_assess == "weak" else "Add real examples or concrete details to support correctness.",
            },
            {
                "name": "Reasoning & Analysis",
                "score": reasoning_score,
                "assessment": reasoning_assess,
                "quote": quote,
                "evidence": "Reasoning is coherent, well-structured, and shows good analytical skill." if reasoning_assess == "strong" else (
                    "Explains some reasoning but the logical progression could be tighter." if reasoning_assess == "mixed" else
                    "Reasoning is thin or lacks logic explaining the 'why'."
                ),
                "evidence_confidence": reasoning_conf,
                "missing": "Use transition words and structure the points step-by-step." if reasoning_assess == "weak" else "Deepen the cause-and-effect relationship in the analysis.",
            },
            {
                "name": "Solution & Recommendation",
                "score": solution_score,
                "assessment": solution_assess,
                "quote": quote,
                "evidence": "Proposes a clear, action-oriented solution or recommendation." if solution_assess == "strong" else (
                    "Proposes a general solution direction but needs clearer implementation or conclusion." if solution_assess == "mixed" else
                    "Does not propose a concrete, actionable solution or recommendation."
                ),
                "evidence_confidence": solution_conf,
                "missing": "Provide a clear recommendation or specific action plan." if solution_assess == "weak" else "Explain how to measure or evaluate the success of the proposed solution.",
            },
            {
                "name": "Feasibility & Risk Management",
                "score": feasibility_score,
                "assessment": feasibility_assess,
                "quote": quote,
                "evidence": "Identifies trade-offs, limitations, or risk management well." if feasibility_assess == "strong" else (
                    "Mentions risks or trade-offs but lacks concrete mitigation steps." if feasibility_assess == "mixed" else
                    "Does not address risks, technical trade-offs, or mitigations."
                ),
                "evidence_confidence": feasibility_conf,
                "missing": "Analyze trade-offs, operational risks, or safety concerns." if feasibility_assess == "weak" else "Add specific risk mitigation steps or rollback plan.",
            },
            {
                "name": "Communication",
                "score": comm_score,
                "assessment": comm_assess,
                "quote": quote,
                "evidence": "Delivered clearly and concisely with good terminology and flow." if comm_assess == "strong" else (
                    "Understandable but wordy or lacks a tight structure." if comm_assess == "mixed" else
                    "The answer is too short or disjointed, making it hard to follow."
                ),
                "evidence_confidence": comm_conf,
                "missing": "Elaborate on the points and organize into structured sentences." if comm_assess == "weak" else "Provide a brief executive summary at the start to improve flow.",
            },
        ]
        
        strengths = []
        if p_context_assess == "strong":
            strengths.append("The answer stays aligned with the actual question.")
        if reasoning_assess == "strong":
            strengths.append("The reasoning is fairly clear and easy to follow.")
        if domain_assess == "strong":
            strengths.append("Concrete detail makes the answer more credible to an interviewer.")
            
        gaps = []
        if p_context_assess != "strong":
            gaps.append("Answer the exact question more directly.")
        if reasoning_assess != "strong":
            gaps.append("Add clearer reasoning and explanation.")
        if domain_assess != "strong":
            gaps.append("Add a more concrete example or scenario.")
        if feasibility_assess == "weak":
            gaps.append("Show more trade-off awareness, risk handling, or practical judgment.")
            
        improvements = [
            "Start with a direct answer in the first 1-2 sentences.",
            "Then explain the reasoning or mechanism in 2-3 clear points.",
            "Finish with an example, outcome, or trade-off that signals maturity.",
        ]

    # Calculate overall score programmatically based on the new 6 criteria
    task_type = _detect_task_type(request.category, request.question_text, request.role, request.major)
    base_weights = _TASK_TYPE_WEIGHTS.get(task_type, _TASK_TYPE_WEIGHTS["theory"])
    adjusted_weights = _adjust_weights_by_level(base_weights, request.level)
    
    criteria_scores = {
        "Problem Understanding & Context": p_context_score,
        "Domain Knowledge & Accuracy": domain_score,
        "Reasoning & Analysis": reasoning_score,
        "Solution & Recommendation": solution_score,
        "Feasibility & Risk Management": feasibility_score,
        "Communication": comm_score
    }
    
    score = _calculate_overall_score(criteria_scores, adjusted_weights)
    score = _clamp_score(score)

    summary_metrics = {
        "relevance": p_context_metric,
        "length_metric": metrics["length_metric"],
        "reasoning_metric": reasoning_metric,
        "specificity_metric": metrics["specificity_metric"],
        "tradeoff_metric": feasibility_metric,
        "has_example": metrics["has_example"],
        "tradeoff_relevant": metrics["tradeoff_relevant"],
        "score": score
    }
    summary = _generate_heuristic_summary(summary_metrics, language)

    return {
        "language": language,
        "question_type": question_type,
        "score": score,
        "summary": summary,
        "criteria": criteria,
        "strengths": strengths[:3],
        "gaps": gaps[:4],
        "improvements": improvements[:3],
        "better_outline": _better_outline(question_type, language),
        "follow_up": _follow_up_prompts(question_type, language),
    }


def keyword_score_answer(
    answer_text: str,
    ideal_answer: str,
    question_text: str = "",
    category: str = "",
    level: str = "junior",
    difficulty: str = "medium",
) -> tuple[float, str]:
    if not answer_text.strip():
        return 0.0, "Bạn chưa cung cấp câu trả lời. Hãy thử lại!"

    request = ScoringRequest(
        answer_text=answer_text,
        ideal_answer=ideal_answer,
        question_text=question_text or ideal_answer,
        role="unknown",
        level=level,
        category=category,
        difficulty=difficulty,
    )
    result = _heuristic_result(request)
    return result["score"], _format_feedback(result)


async def _score_with_deepseek(request: ScoringRequest) -> tuple[float, str]:
    task_type = _detect_task_type(request.category, request.question_text, request.role, request.major)
    base_weights = _TASK_TYPE_WEIGHTS.get(task_type, _TASK_TYPE_WEIGHTS["theory"])
    adjusted_weights = _adjust_weights_by_level(base_weights, request.level)
    criteria_payload = []
    for name, descriptor in _CRITERIA_DESCRIPTORS.items():
        weight = adjusted_weights.get(name, 0)
        criteria_payload.append(
            {
                "name": name,
                "weight": weight,
                "definition": descriptor["definition"],
                "anchors": {
                    "fails": descriptor["level_1"],
                    "meets": descriptor["level_3"],
                    "excellent": descriptor["level_5"],
                },
            }
        )
    user_payload_dict = {
        "product": "Invera",
        "objective": "Evaluate an interview answer and explain how to improve it for an actual interviewer.",
        "industry_major": request.major,
        "candidate_context": {
            "target_role": request.role,
            "seniority_level": request.level,
        },
        "question": {
            "text": request.question_text,
            "category": request.category,
            "difficulty": request.difficulty,
            "question_type_hint": task_type,
        },
        "reference_answer_anchor": request.ideal_answer,
        "candidate_answer": request.answer_text,
        "rubric_criteria": criteria_payload,
    }
    if request.telemetry_data:
        user_payload_dict["candidate_video_telemetry"] = request.telemetry_data

    user_payload = json.dumps(user_payload_dict, ensure_ascii=False)
    response = await create_chat_completion(
        system_prompt=_rubric_prompt(task_type, request.level, request.preferred_language, request.major, request.role),
        user_prompt=user_payload,
        max_tokens=settings.deepseek_scoring_max_tokens,
        timeout_seconds=settings.deepseek_scoring_timeout_seconds,
        temperature=0.1,
    )
    normalized = _normalize_model_response(response["content"], request)
    normalized = _fill_missing_criterion_quotes(normalized, request.answer_text)
    return normalized["score"], _format_feedback(normalized)


def _very_short_vietnamese_answer(request: ScoringRequest) -> dict[str, Any] | None:
    language = (
        normalize_supported_language(request.preferred_language, "en")
        if request.force_language
        else select_response_language(request.preferred_language, request.answer_text)
    )
    if language != "vi":
        return None
    words = _word_count(request.answer_text)
    if words >= SHORT_VIETNAMESE_WORD_LIMIT:
        return None
    return _short_answer_result(request, words)


async def score_answer(request: ScoringRequest) -> tuple[float, str]:
    sanitized_answer = sanitize_user_text(request.answer_text)
    sanitized_question = sanitize_user_text(request.question_text)
    sanitized_ideal = sanitize_user_text(request.ideal_answer)
    requested_language = normalize_supported_language(request.preferred_language, "en")
    preferred_language = (
        requested_language
        if request.force_language
        else select_response_language(
            request.preferred_language,
            request.answer_text,
            request.question_text,
        )
    )

    effective_request = ScoringRequest(
        answer_text=sanitized_answer,
        ideal_answer=sanitized_ideal,
        question_text=sanitized_question,
        role=request.role,
        level=request.level,
        category=request.category,
        difficulty=request.difficulty,
        major=request.major,
        preferred_language=normalize_supported_language(preferred_language, request.preferred_language),
        force_language=request.force_language,
        telemetry_data=request.telemetry_data,
    )

    if not effective_request.answer_text.strip():
        return (
            0.0,
            "Bạn chưa cung cấp câu trả lời. Hãy thử lại!"
            if effective_request.preferred_language == "vi"
            else "You have not provided an answer yet. Please try again.",
        )

    short_answer = _very_short_vietnamese_answer(effective_request)
    if short_answer is not None:
        return short_answer["score"], _format_feedback(short_answer)

    quick_guard = _quick_guard_result(effective_request)
    if quick_guard is not None:
        return quick_guard["score"], _format_feedback(quick_guard)

    if _deepseek_is_enabled():
        try:
            return await _score_with_deepseek(effective_request)
        except (DeepSeekAPIError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("DeepSeek scoring failed; falling back to heuristic scorer: %s", exc)
        except Exception:
            logger.exception("Unexpected DeepSeek scoring failure; falling back to heuristic scorer.")

    heuristic = _heuristic_result(effective_request)
    heuristic = _fill_missing_criterion_quotes(heuristic, effective_request.answer_text)
    return heuristic["score"], _format_feedback(heuristic)


def _deepseek_is_enabled() -> bool:
    return bool(settings.deepseek_enabled and settings.deepseek_api_key)


def _generate_feedback(
    score: float,
    matched: set[str] | None = None,
    ideal_tokens: set[str] | None = None,
    answer_tokens: set[str] | None = None,
) -> str:
    language = "vi"
    if matched or ideal_tokens or answer_tokens:
        language = "en" if any(token and token.isascii() for token in (matched or set())) else "vi"
    if language == "vi":
        if score >= 8.5:
            return "Câu trả lời mạnh, rõ ràng, và khá thuyết phục với HR."
        if score >= 6.5:
            return "Câu trả lời khá tốt, nhưng vẫn nên bổ sung thêm lý do, ví dụ, hoặc trade-off."
        if score >= 4.0:
            return "Câu trả lời có nền tảng nhưng cần rõ ràng và cụ thể hơn để điểm cao hơn."
        return "Câu trả lời hiện còn yếu vì quá ngắn, thiếu trọng tâm, hoặc thiếu phần giải thích."
    if score >= 8.5:
        return "Strong answer: clear, credible, and persuasive for an interviewer."
    if score >= 6.5:
        return "Solid answer, but more reasoning or specificity would raise the score."
    if score >= 4.0:
        return "Some foundation is there, but the answer still needs more clarity and detail."
    return "The answer is currently weak because it is too short, off-target, or under-explained."
