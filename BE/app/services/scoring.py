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


SHORT_VIETNAMESE_WORD_LIMIT = 20
SHORT_ENGLISH_WORD_LIMIT = 10
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


_TECH_RUBRIC = [
    {
        "name": "Domain Knowledge & Technical Accuracy",
        "weight": 25,
        "definition": "Correctness of concepts, terminology, assumptions, and technical constraints.",
        "level_1": "Core concepts wrong; confuses components/consequences; dangerous or baseless assumptions.",
        "level_3": "Mostly correct for common cases; gaps in edge cases or important dependencies.",
        "level_5": "Accurate and well-contextualised; states assumptions, dependencies, edge cases, and limits.",
    },
    {
        "name": "Problem Decomposition & Reasoning",
        "weight": 20,
        "definition": "How the candidate frames goals, constraints, breaks down the problem, and reasons step by step.",
        "level_1": "Jumps to a solution immediately; no goal/constraint/trade-off clarification.",
        "level_3": "Separates the main parts; logic is acceptable but not prioritised or hypothesis-driven.",
        "level_5": "Sharp framing; reasonable prioritisation; clear causal chain; knows where to clarify.",
    },
    {
        "name": "Design, Implementation & Trade-offs",
        "weight": 20,
        "definition": "Quality of the technical proposal — architecture/algorithm/data choices, trade-off explanation.",
        "level_1": "Generic solution; no comparison of alternatives; no design consequences discussed.",
        "level_3": "Workable solution; partial trade-off mention; not deep enough on scale/performance/maintainability.",
        "level_5": "Solid design; choices justified; alternatives compared; trade-offs on scale, latency, reliability, maintainability, cost when relevant.",
    },
    {
        "name": "Feasibility, Quality & Risk Judgment",
        "weight": 15,
        "definition": "Realism of rollout, testing, observability, security/privacy, compliance, ethics.",
        "level_1": "Ignores testing, rollout, monitoring, security/privacy, or deployment risk.",
        "level_3": "Mentions basic testing/monitoring/risk; lacks concrete controls or rollback.",
        "level_5": "Feasible deployment plan; quality and risk controls clear; security/privacy/legal/ethical concerns raised when relevant.",
    },
    {
        "name": "Technical Communication",
        "weight": 15,
        "definition": "Clarity, coherence, audience fit, avoiding unnecessary jargon.",
        "level_1": "Hard to follow; wrong terminology; disjointed structure.",
        "level_3": "Understandable but wordy or lacks signposting.",
        "level_5": "Tight structure; concise delivery; makes complex ideas easy to follow.",
    },
    {
        "name": "Creativity & Optimisation",
        "weight": 5,
        "definition": "Useful novelty — avoids over-engineering.",
        "level_1": "No new insight; or 'creative' but irrelevant.",
        "level_3": "At least one reasonable improvement.",
        "level_5": "Valuable insight or optimisation that remains practical.",
    },
]

_BUSINESS_RUBRIC = [
    {
        "name": "Business Context & Objectives",
        "weight": 20,
        "definition": "Understanding of the business problem, economics, customers, market, stakeholders, success metrics.",
        "level_1": "Misses the core business problem; confuses goal with solution; ignores key stakeholders.",
        "level_3": "Grasps basic goals and some constraints; lacks commercial context or decision criteria.",
        "level_5": "Sharp framing; clear goals, segment, economics, stakeholders, KPIs, and determining constraints.",
    },
    {
        "name": "Analysis & Quantitative Reasoning",
        "weight": 25,
        "definition": "Quality of argument, data use, assumptions, calculations, sensitivity.",
        "level_1": "Claims without evidence; weak logic; wrong or irrelevant numbers.",
        "level_3": "Basic logic and/or quantification; assumptions not explicit; thin sensitivity.",
        "level_5": "Tight analysis; clear assumptions; distinguishes signal from noise; sufficient quantification for decisions.",
    },
    {
        "name": "Recommendation, Prioritisation & Decision Quality",
        "weight": 20,
        "definition": "Clarity of final proposal, ability to choose/reject, resource prioritisation.",
        "level_1": "Vague recommendation; lists many things without picking the main one.",
        "level_3": "Reasonable proposal; basic prioritisation; link to goals not yet sharp.",
        "level_5": "Clear choice; knows trade-offs; prioritises by impact-feasibility; persuasive reasoning for chosen option.",
    },
    {
        "name": "Execution Feasibility & Risk Governance",
        "weight": 15,
        "definition": "Realism of execution plan: owner, timeline, KPI, resources, risk, contingency.",
        "level_1": "Looks good on paper but hard to execute; ignores resources and risk.",
        "level_3": "Basic deployment steps; mentions KPI or resources but lacks owner/timeline/risk handling.",
        "level_5": "Actionable plan; clear owner/timeline/KPI; risks and mitigation stated.",
    },
    {
        "name": "Communication & Stakeholder Management",
        "weight": 15,
        "definition": "Clarity, persuasiveness, executive audience fit, handling objections.",
        "level_1": "Hard to follow; rambling; unclear 'so what'.",
        "level_3": "Reasonably clear; missing executive summary or does not anticipate objections.",
        "level_5": "Executive-ready; issue-to-recommendation flow; anticipates stakeholder pushback.",
    },
    {
        "name": "Creativity & Opportunity Finding",
        "weight": 5,
        "definition": "New insight or value-adding alternative that remains realistic.",
        "level_1": "No insight; idea too generic or unrealistic.",
        "level_3": "At least one reasonable value-adding idea.",
        "level_5": "Sharp insight or expanded option set that adds value without sacrificing operational reality.",
    },
]

_FINANCE_RUBRIC = [
    {
        "name": "Business Context & Financial Acumen",
        "weight": 25,
        "definition": "Understanding of the business problem, economics, customers, market, stakeholders, success metrics and financial drivers.",
        "level_1": "Misses the core business problem; confuses goal with solution; ignores key stakeholders or financial fundamentals.",
        "level_3": "Grasps basic goals and some constraints; lacks commercial context, decision criteria, or financial awareness.",
        "level_5": "Sharp framing; clear goals, segment, economics, stakeholders, KPIs, and financial trade-offs clearly articulated.",
    },
    {
        "name": "Analysis & Quantitative Reasoning",
        "weight": 25,
        "definition": "Quality of argument, data use, assumptions, calculations, sensitivity.",
        "level_1": "Claims without evidence; weak logic; wrong or irrelevant numbers.",
        "level_3": "Basic logic and/or quantification; assumptions not explicit; thin sensitivity.",
        "level_5": "Tight analysis; clear assumptions; distinguishes signal from noise; sufficient quantification for decisions.",
    },
    {
        "name": "Recommendation, Prioritisation & Decision Quality",
        "weight": 20,
        "definition": "Clarity of final proposal, ability to choose/reject, resource prioritisation.",
        "level_1": "Vague recommendation; lists many things without picking the main one.",
        "level_3": "Reasonable proposal; basic prioritisation; link to goals not yet sharp.",
        "level_5": "Clear choice; knows trade-offs; prioritises by impact-feasibility; persuasive reasoning for chosen option.",
    },
    {
        "name": "Execution Feasibility & Risk Governance",
        "weight": 15,
        "definition": "Realism of execution plan: owner, timeline, KPI, resources, risk, contingency.",
        "level_1": "Looks good on paper but hard to execute; ignores resources and risk.",
        "level_3": "Basic deployment steps; mentions KPI or resources but lacks owner/timeline/risk handling.",
        "level_5": "Actionable plan; clear owner/timeline/KPI; risks and mitigation stated.",
    },
    {
        "name": "Communication & Stakeholder Management",
        "weight": 10,
        "definition": "Clarity, persuasiveness, executive audience fit, handling objections.",
        "level_1": "Hard to follow; rambling; unclear 'so what'.",
        "level_3": "Reasonably clear; missing executive summary or does not anticipate objections.",
        "level_5": "Executive-ready; issue-to-recommendation flow; anticipates stakeholder pushback.",
    },
    {
        "name": "Creativity & Opportunity Finding",
        "weight": 5,
        "definition": "New insight or value-adding alternative that remains realistic.",
        "level_1": "No insight; idea too generic or unrealistic.",
        "level_3": "At least one reasonable value-adding idea.",
        "level_5": "Sharp insight or expanded option set that adds value without sacrificing operational reality.",
    },
]


_TECH_ROLE_ADJUSTMENTS = [
    {
        "keywords": [
            "infrastructure", "platform", "cybersecurity", "infra",
            "security", "devops", "sre", "cloud", "network",
        ],
        "from_criterion": "Creativity & Optimisation",
        "to_criterion": "Feasibility, Quality & Risk Judgment",
        "shift": 5,
        "description": "Hạ tầng/platform/cybersecurity: +5% từ Sáng tạo sang Khả thi–Rủi ro",
    },
    {
        "keywords": [
            "data", "ml", "machine learning", "research", "ai",
            "data science", "data engineer", "ml engineer",
        ],
        "from_criterion": "Technical Communication",
        "to_criterion": "Domain Knowledge & Technical Accuracy",
        "shift": 5,
        "description": "Data/ML research: +5% từ Giao tiếp sang Kiến thức kỹ thuật",
    },
    {
        "keywords": [
            "support", "solutions", "solutions engineer",
            "customer", "field", "solutions architect",
        ],
        "from_criterion": "Creativity & Optimisation",
        "to_criterion": "Technical Communication",
        "shift": 5,
        "description": "Support/solutions: +5% từ Sáng tạo sang Giao tiếp",
    },
]

_BUSINESS_ROLE_ADJUSTMENTS = [
    {
        "keywords": [
            "strategy", "strategic", "finance", "financial",
            "m&a", "investment", "corporate development",
        ],
        "from_criterion": "Creativity & Opportunity Finding",
        "to_criterion": "Analysis & Quantitative Reasoning",
        "shift": 5,
        "description": "Strategy/finance: +5% từ Sáng tạo sang Phân tích",
    },
    {
        "keywords": [
            "sales", "bd", "business development", "account",
            "customer success", "partnership", "account management",
        ],
        "from_criterion": "Analysis & Quantitative Reasoning",
        "to_criterion": "Communication & Stakeholder Management",
        "shift": 5,
        "description": "Sales/BD: +5% từ Phân tích sang Giao tiếp–Stakeholder",
    },
    {
        "keywords": [
            "operations", "program management", "project management",
            "pm", "program manager", "project manager", "prod ops",
        ],
        "from_criterion": "Creativity & Opportunity Finding",
        "to_criterion": "Execution Feasibility & Risk Governance",
        "shift": 5,
        "description": "Operations/PM: +5% từ Sáng tạo sang Khả thi–Rủi ro",
    },
]


def _apply_role_adjustments(criteria: list[dict[str, object]], role: str) -> list[dict[str, object]]:
    """Apply quick role-based weight adjustments per rubric.docx 'Điều chỉnh nhanh theo vai trò'.

    Returns a deep copy with modified weights; original is not mutated.
    No changes if role is empty/unknown or no adjustment matches.
    """
    if not role or not role.strip():
        return copy.deepcopy(criteria)

    role_lower = role.strip().lower()

    # Detect which rubric type based on criterion names
    has_tech_names = any("Technical" in str(c.get("name", "")) or "Accuracy" in str(c.get("name", "")) for c in criteria)
    adjustments = _TECH_ROLE_ADJUSTMENTS if has_tech_names else _BUSINESS_ROLE_ADJUSTMENTS

    result = copy.deepcopy(criteria)

    for adj in adjustments:
        if not any(kw in role_lower for kw in adj["keywords"]):
            continue

        from_idx = next(
            (i for i, c in enumerate(result) if c["name"] == adj["from_criterion"]),
            None,
        )
        to_idx = next(
            (i for i, c in enumerate(result) if c["name"] == adj["to_criterion"]),
            None,
        )

        if from_idx is not None and to_idx is not None:
            old_from = result[from_idx]["weight"]
            old_to = result[to_idx]["weight"]
            if old_from >= adj["shift"]:
                result[from_idx]["weight"] = old_from - adj["shift"]
                result[to_idx]["weight"] = old_to + adj["shift"]
                logger.info(
                    "Role adjustment applied: %s | %s: %d%% -> %d%%, %s: %d%% -> %d%%",
                    adj["description"],
                    result[from_idx]["name"], old_from, result[from_idx]["weight"],
                    result[to_idx]["name"], old_to, result[to_idx]["weight"],
                )

        # Only apply the first matching adjustment
        break

    return result


def _resolve_rubric(major: str) -> list[dict[str, object]]:
    normalized = (major or "technology").strip().lower()
    if normalized == "finance":
        return _FINANCE_RUBRIC
    if normalized in ("business", "business_analyst"):
        return _BUSINESS_RUBRIC
    return _TECH_RUBRIC


def _format_rubric_for_prompt(criteria: list[dict[str, object]], level: str) -> str:
    lines = ["### Scoring Scale (per criterion)", ""]
    lines.append("1 = Fails")
    lines.append("    Off-target or severely wrong; lacks evidence; hard to salvage without almost starting over.")
    lines.append("2 = Weak")
    lines.append("    Shows some understanding but scattered; thin reasoning; misses important constraints.")
    lines.append("3 = Meets")
    lines.append("    Covers the core; mostly correct; logic usable for standard cases; depth or trade-offs still missing.")
    lines.append("4 = Good")
    lines.append("    Accurate, prioritised, considers risks/trade-offs, clear delivery; practically usable.")
    lines.append("5 = Excellent")
    lines.append("    Deep, accurate, well-contextualised, anticipates risks, evidence-backed, actionable, persuasive.")
    lines.append("")
    lines.append(f"### Seniority Context: {level}")
    lines.append("- Intern/Fresher: focus on fundamentals, clarity, basic correctness")
    lines.append("- Junior: correct reasoning, practical examples, awareness of trade-offs")
    lines.append("- Mid: depth, prioritisation, risk awareness, stronger judgment")
    lines.append("- Senior: strategic trade-offs, operational excellence, mentoring patterns")
    lines.append("")
    lines.append("### 6 Criteria (score each independently, then compute weighted total)")
    lines.append("")

    for i, c in enumerate(criteria, 1):
        name = c["name"]
        weight = c["weight"]
        definition = c["definition"]
        l1 = c["level_1"]
        l3 = c["level_3"]
        l5 = c["level_5"]
        lines.append(f"**Criterion {i}: {name} — Weight {weight}%**")
        lines.append(f"  Definition: {definition}")
        lines.append(f"  Level 1 (Fails): {l1}")
        lines.append(f"  Level 3 (Meets): {l3}")
        lines.append(f"  Level 5 (Excellent): {l5}")
        lines.append("")

    lines.append("### Floor Rules")
    if any("Technical" in str(c["name"]) or "Accuracy" in str(c["name"]) for c in criteria):
        lines.append("- If Domain Knowledge (C1) or Design/Trade-offs (C3) = 1 → overall max = Borderline")
    else:
        lines.append("- If Business Context (C1) or Analysis (C2) = 1 → overall should not pass")
    lines.append("")
    lines.append("### Score Bands for Overall /10")
    lines.append("- 8.5-10.0: very strong, clear, accurate, specific, good judgment → interpret as 85-100/100")
    lines.append("- 6.5-8.4: good and credible, mostly on point, explains reasoning → 70-84/100")
    lines.append("- 4.0-6.4: some foundation but missing depth, specificity, or structure → 55-69/100")
    lines.append("- below 4.0: too short, off-target, incorrect, or shallow → <55/100")

    return "\n".join(lines)


def _rubric_prompt(question_type: str, level: str, preferred_language: str, major: str, role: str) -> str:
    criteria = _resolve_rubric(major)
    criteria = _apply_role_adjustments(criteria, role)
    rubric_section = _format_rubric_for_prompt(criteria, level)

    return f"""
You are Invera's interview evaluator. Use the structured rubric below to score the candidate's answer.

The reference answer is only an anchor for expected depth, not a mandatory checklist.
Reward correct paraphrases, clear reasoning, and useful examples even when wording differs.

{rubric_section}

Return STRICT JSON only:
{{
  "language": "vi" | "en",
  "question_type": "{question_type}",
  "score": 0.0,
  "summary": "one direct HR-style assessment with the main pass/fail reason",
  "criteria": [
    {{
      "name": "criterion name (exactly as listed above)",
      "score": 1-5,
      "assessment": "strong | mixed | weak",
      "quote": "short exact excerpt copied from the candidate answer that justifies this criterion score",
      "evidence": "practical evaluation of that quoted excerpt for this criterion",
      "missing": "what would raise the score"
    }}
  ],
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
- In missing, name the specific concept, example, trade-off, risk, metric, or implementation detail needed next.
- Do not punish the answer just because it does not copy the reference wording.
- Score each criterion using the anchor descriptions (Level 1, 3, 5) as your guide.
- Use the full 1-5 scale — do not only use 2, 3, 4.
- Remember the floor rules: certain low scores cap the overall band.
- Compute the overall score as: weighted_sum / 5 * 10 (converting 1-5 per criterion to /10 overall).
- Write every field in {preferred_language} only.
- Be detailed enough for coaching. Avoid filler, but do not collapse the rubric into generic comments.
""".strip()


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
    summary = _calibrated_summary(result, language)
    if summary:
        lines.append(f"{labels['summary']}: {summary}")

    criteria = result.get("criteria") or []
    if isinstance(criteria, list) and criteria:
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
            if language == "vi":
                detail_parts = [
                    f"Trích dẫn: {quote}" if quote else "",
                    f"Đánh giá: {evidence}" if evidence else "",
                    f"Thiếu: {missing}" if missing else "",
                ]
            else:
                detail_parts = [
                    f"Quote: {quote}" if quote else "",
                    f"Evaluation: {evidence}" if evidence else "",
                    f"Missing: {missing}" if missing else "",
                ]
            detail_parts = [part for part in detail_parts if part]
            title = " - ".join(part for part in (name, assessment) if part)
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


def _calibrated_summary(result: dict[str, Any], language: str) -> str:
    criteria = [item for item in (result.get("criteria") or []) if isinstance(item, dict)]
    weak_names = [
        str(item.get("name") or "").strip()
        for item in criteria
        if str(item.get("assessment") or "").strip().lower() == "weak"
    ]
    mixed_count = sum(1 for item in criteria if str(item.get("assessment") or "").strip().lower() == "mixed")
    raw_score = result.get("score")
    score = float(raw_score) if isinstance(raw_score, (int, float)) else None

    if language == "vi":
        if weak_names:
            listed = ", ".join(name for name in weak_names[:2] if name)
            return (
                f"Câu trả lời có vài điểm đúng, nhưng chưa đủ chắc vì còn tiêu chí yếu"
                f"{f': {listed}' if listed else ''}."
            )
        if score is not None and score >= 8.5:
            return "Câu trả lời mạnh: rõ trọng tâm, có bằng chứng, có chiều sâu và judgment đủ tốt."
        if mixed_count >= 2:
            return "Câu trả lời đạt mức dùng được, nhưng vẫn cần làm rõ bằng chứng, ví dụ và lập luận để thuyết phục hơn."
        if score is not None and score >= 6.5:
            return "Câu trả lời có nền tảng tốt, nhưng cần thêm bằng chứng cụ thể để nâng mức đánh giá."
        if score is not None and score >= 4.0:
            return "Câu trả lời có nền tảng nhưng còn thiếu độ sâu, ví dụ cụ thể, hoặc cấu trúc rõ ràng hơn."
        return "Câu trả lời hiện còn yếu vì quá ngắn, thiếu trọng tâm, hoặc thiếu phần giải thích."

    if weak_names:
        listed = ", ".join(name for name in weak_names[:2] if name)
        return f"The answer has some correct points, but it is not strong yet because weak criteria remain{f': {listed}' if listed else ''}."
    if score is not None and score >= 8.5:
        return "Strong answer: clear, evidence-backed, deep enough, and well-judged."
    if mixed_count >= 2:
        return "Usable answer, but it still needs clearer evidence, examples, and reasoning to be convincing."
    if score is not None and score >= 6.5:
        return "The answer has a solid foundation, but it needs more concrete evidence to score higher."
    if score is not None and score >= 4.0:
        return "The answer has some foundation, but it still needs more depth, specificity, or structure."
    return "The answer is currently weak because it is too short, off-target, or under-explained."


def _normalize_model_response(content: str, request: ScoringRequest) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    result = json.loads(cleaned)
    if not isinstance(result, dict):
        raise ValueError("DeepSeek scoring output must be a JSON object.")

    raw_score = result.get("score")
    if isinstance(raw_score, str):
        raw_score = raw_score.strip()
        if not re.fullmatch(r"\d+(?:\.\d+)?", raw_score):
            raise ValueError("DeepSeek scoring output is missing a numeric score.")
        raw_score = float(raw_score)
    elif isinstance(raw_score, (int, float)):
        raw_score = float(raw_score)
    else:
        raise ValueError("DeepSeek scoring output is missing a numeric score.")

    result["score"] = _clamp_score(raw_score)
    result["question_type"] = result.get("question_type") or _detect_question_type(
        request.category,
        request.question_text,
    )
    result["language"] = (
        normalize_supported_language(request.preferred_language, "en")
        if request.force_language
        else normalize_supported_language(result.get("language"), request.preferred_language)
    )

    for key in ("criteria", "strengths", "gaps", "improvements", "better_outline", "follow_up"):
        value = result.get(key)
        if value is None:
            result[key] = []
        elif not isinstance(value, list):
            result[key] = [str(value)]

    normalized_criteria: list[Any] = []
    for item in result.get("criteria") or []:
        if not isinstance(item, dict):
            normalized_criteria.append(item)
            continue
        item["quote"] = str(item.get("quote") or "").strip()
        item["evidence"] = str(item.get("evidence") or "").strip()
        item["missing"] = str(item.get("missing") or "").strip()
        normalized_criteria.append(item)
    result["criteria"] = normalized_criteria

    result["summary"] = str(result.get("summary") or "").strip()
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
    }


def _quick_guard_result(request: ScoringRequest) -> dict[str, Any] | None:
    words = _word_count(request.answer_text)
    word_limit = _short_answer_word_limit(request.preferred_language)
    if words < word_limit:
        return _short_answer_result(request, words)

    answer_tokens = _tokenize(request.answer_text)
    question_tokens = _tokenize(request.question_text)
    ideal_tokens = _tokenize(request.ideal_answer)
    if words < OFF_TOPIC_WORD_MINIMUM or not answer_tokens:
        return None

    overlap_question = len(answer_tokens & question_tokens) / max(len(question_tokens), 1) if question_tokens else 0.0
    overlap_ideal = len(answer_tokens & ideal_tokens) / max(len(ideal_tokens), 1) if ideal_tokens else 0.0
    relevance = max(overlap_question, overlap_ideal)
    if relevance < OFF_TOPIC_RELEVANCE_THRESHOLD:
        return _off_topic_result(request, relevance)
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


def _heuristic_result(request: ScoringRequest) -> dict[str, Any]:
    metrics = _heuristic_metrics(request)
    language = metrics["language"]
    question_type = metrics["question_type"]
    score = metrics["score"]
    quote = _candidate_quote(request.answer_text)
    relevance_label = _assessment_label(metrics["relevance"])
    clarity_label = _assessment_label((metrics["length_metric"] * 0.35) + (metrics["reasoning_metric"] * 0.65))
    specificity_label = _assessment_label(metrics["specificity_metric"])
    depth_metric = metrics["tradeoff_metric"] if metrics["tradeoff_relevant"] else max(
        metrics["reasoning_metric"] * 0.7,
        metrics["specificity_metric"] * 0.6,
    )
    depth_label = _assessment_label(depth_metric)

    if language == "vi":
        criteria = [
            {
                "name": "Bám sát câu hỏi",
                "assessment": relevance_label,
                "quote": quote,
                "evidence": "Câu trả lời đang đi đúng trọng tâm chính của câu hỏi." if relevance_label != "weak" else "Câu trả lời chưa bám sát vào trọng tâm chính.",
                "missing": "Nói rõ ý chính của câu hỏi trước khi mở rộng." if relevance_label == "weak" else "Có thể liên kết trực tiếp hơn với đề bài ngay từ đầu.",
            },
            {
                "name": "Độ rõ ràng và lập luận",
                "assessment": clarity_label,
                "quote": quote,
                "evidence": "Bạn đã có giải thích và trình bày theo logic." if clarity_label == "strong" else (
                    "Đã có một vài ý giải thích, nhưng mạch trình bày chưa thật sự chắc." if clarity_label == "mixed" else "Còn thiếu giải thích và logic nối câu."
                ),
                "missing": "Thêm cách giải thích vì sao, cơ chế, hoặc quyết định của bạn.",
            },
            {
                "name": "Tính cụ thể",
                "assessment": specificity_label,
                "quote": quote,
                "evidence": "Câu trả lời có chi tiết cụ thể để tạo độ tin cậy." if specificity_label == "strong" else (
                    "Đã có một số chi tiết, nhưng vẫn có thể cụ thể hóa hơn." if specificity_label == "mixed" else "Còn thiếu ví dụ, dữ kiện, hoặc tình huống cụ thể."
                ),
                "missing": "Thêm ví dụ ngắn, kết quả, hoặc tình huống áp dụng thực tế.",
            },
            {
                "name": "Độ sâu và judgment",
                "assessment": depth_label,
                "quote": quote,
                "evidence": "Bạn đã cho thấy độ sâu hoặc awareness về trade-off/rủi ro." if depth_label == "strong" else (
                    "Đã có một chút depth, nhưng chưa thật rõ ở phần đánh đổi hoặc judgment." if depth_label == "mixed" else "Chưa thể hiện rõ trade-off, rủi ro, hoặc judgment thực tế."
                ),
                "missing": "Thêm trade-off, giới hạn, rủi ro, hoặc cách bạn ưu tiên quyết định khi phù hợp.",
            },
        ]
        strengths = []
        if relevance_label == "strong":
            strengths.append("Câu trả lời bám sát đúng trọng tâm câu hỏi.")
        if clarity_label == "strong":
            strengths.append("Lập luận tương đối rõ ràng và dễ theo dõi.")
        if specificity_label == "strong":
            strengths.append("Có chi tiết cụ thể nên tạo cảm giác đáng tin hơn trong mắt HR.")
        gaps = []
        if relevance_label != "strong":
            gaps.append("Cần trả lời trực tiếp hơn vào ý chính của câu hỏi.")
        if clarity_label != "strong":
            gaps.append("Cần bổ sung phần giải thích vì sao hoặc cơ chế.")
        if specificity_label != "strong":
            gaps.append("Cần thêm ví dụ, ngữ cảnh, hoặc chi tiết cụ thể.")
        if depth_label == "weak":
            gaps.append("Chưa thể hiện rõ trade-off, risk, hoặc judgment thực tế.")
        improvements = [
            "Mở đầu bằng câu trả lời trực tiếp trong 1-2 câu.",
            "Sau đó giải thích lý do/cách hoạt động bằng 2-3 ý rõ ràng.",
            "Kết bằng ví dụ, kết quả, hoặc trade-off để HR thấy được maturity.",
        ]
    else:
        criteria = [
            {
                "name": "Relevance",
                "assessment": relevance_label,
                "quote": quote,
                "evidence": "The answer stays close to the core question." if relevance_label != "weak" else "The answer does not stay close enough to the core question.",
                "missing": "State the direct answer earlier and tie each point back to the question.",
            },
            {
                "name": "Clarity and reasoning",
                "assessment": clarity_label,
                "quote": quote,
                "evidence": "The explanation has a clear line of reasoning." if clarity_label == "strong" else (
                    "Some reasoning is present, but the structure could be tighter." if clarity_label == "mixed" else "The logic is under-explained."
                ),
                "missing": "Explain why, how, or what decision process you would use.",
            },
            {
                "name": "Specificity",
                "assessment": specificity_label,
                "quote": quote,
                "evidence": "The answer includes concrete detail that feels credible." if specificity_label == "strong" else (
                    "There is some detail, but it could be more concrete." if specificity_label == "mixed" else "The answer needs examples, context, or concrete detail."
                ),
                "missing": "Add a short example, result, or practical scenario.",
            },
            {
                "name": "Depth and judgment",
                "assessment": depth_label,
                "quote": quote,
                "evidence": "The answer shows useful trade-off awareness or judgment." if depth_label == "strong" else (
                    "There is some depth, but not enough practical judgment yet." if depth_label == "mixed" else "The answer does not clearly show trade-offs, risk awareness, or judgment."
                ),
                "missing": "Add trade-offs, limitations, risks, or prioritization when relevant.",
            },
        ]
        strengths = []
        if relevance_label == "strong":
            strengths.append("The answer stays aligned with the actual question.")
        if clarity_label == "strong":
            strengths.append("The reasoning is fairly clear and easy to follow.")
        if specificity_label == "strong":
            strengths.append("Concrete detail makes the answer more credible to an interviewer.")
        gaps = []
        if relevance_label != "strong":
            gaps.append("Answer the exact question more directly.")
        if clarity_label != "strong":
            gaps.append("Add clearer reasoning and explanation.")
        if specificity_label != "strong":
            gaps.append("Add a more concrete example or scenario.")
        if depth_label == "weak":
            gaps.append("Show more trade-off awareness, risk handling, or practical judgment.")
        improvements = [
            "Start with a direct answer in the first 1-2 sentences.",
            "Then explain the reasoning or mechanism in 2-3 clear points.",
            "Finish with an example, outcome, or trade-off that signals maturity.",
        ]

    return {
        "language": language,
        "question_type": question_type,
        "score": score,
        "summary": _score_band_summary(score, language),
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
    question_type = _detect_question_type(request.category, request.question_text)
    criteria = _resolve_rubric(request.major)
    adjusted_criteria = _apply_role_adjustments(criteria, request.role)
    criteria_payload = []
    for c in adjusted_criteria:
        criteria_payload.append(
            {
                "name": c["name"],
                "weight": c["weight"],
                "definition": c["definition"],
                "anchors": {
                    "fails": c["level_1"],
                    "meets": c["level_3"],
                    "excellent": c["level_5"],
                },
            }
        )
    user_payload = json.dumps(
        {
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
                "question_type_hint": question_type,
            },
            "reference_answer_anchor": request.ideal_answer,
            "candidate_answer": request.answer_text,
            "rubric_criteria": criteria_payload,
        },
        ensure_ascii=False,
    )
    response = await create_chat_completion(
        system_prompt=_rubric_prompt(question_type, request.level, request.preferred_language, request.major, request.role),
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
        short_answer = _fill_missing_criterion_quotes(short_answer, effective_request.answer_text)
        return short_answer["score"], _format_feedback(short_answer)

    quick_guard = _quick_guard_result(effective_request)
    if quick_guard is not None:
        quick_guard = _fill_missing_criterion_quotes(quick_guard, effective_request.answer_text)
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
