from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.text_processing import sanitize_user_text
from app.services.session_export import build_video_metric_blocks, sanitize_metric_note


FONT_REGULAR = "InveraPdfRegular"
FONT_BOLD = "InveraPdfBold"
FONT_PATH_REGULAR = Path("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf")
FONT_PATH_BOLD = Path("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf")


def _ensure_fonts() -> tuple[str, str]:
    regular = "Helvetica"
    bold = "Helvetica-Bold"

    if FONT_PATH_REGULAR.exists():
        if FONT_REGULAR not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(FONT_PATH_REGULAR)))
        regular = FONT_REGULAR

    if FONT_PATH_BOLD.exists():
        if FONT_BOLD not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_PATH_BOLD)))
        bold = FONT_BOLD
    elif regular != "Helvetica":
        bold = regular

    return regular, bold


def _styles(language: str) -> dict[str, ParagraphStyle]:
    font_regular, font_bold = _ensure_fonts()
    base = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "InveraTitle",
            parent=base["Title"],
            fontName=font_bold,
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#0f172a"),
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "InveraSubtitle",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "session_heading": ParagraphStyle(
            "InveraSessionHeading",
            parent=base["Heading1"],
            fontName=font_bold,
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=6,
        ),
        "question_heading": ParagraphStyle(
            "InveraQuestionHeading",
            parent=base["Heading2"],
            fontName=font_bold,
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#111827"),
            spaceAfter=6,
        ),
        "section_label": ParagraphStyle(
            "InveraSectionLabel",
            parent=base["BodyText"],
            fontName=font_bold,
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#0f766e"),
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "InveraBody",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=4,
        ),
        "meta_cell": ParagraphStyle(
            "InveraMetaCell",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
        ),
        "meta_label": ParagraphStyle(
            "InveraMetaLabel",
            parent=base["BodyText"],
            fontName=font_bold,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#0f172a"),
        ),
    }


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    safe = _escape(text).replace("\n", "<br/>")
    return Paragraph(safe or "&nbsp;", style)


def _filename_slug(text: str) -> str:
    safe = sanitize_user_text(text).lower()
    safe = re.sub(r"[^a-z0-9]+", "-", safe)
    return safe.strip("-") or "session"


def _page_number(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawRightString(doc.pagesize[0] - 18 * mm, 10 * mm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def _text_labels(language: str) -> dict[str, str]:
    if language == "vi":
        return {
            "report_title": "Invera Session Export",
            "report_subtitle": "Bản xuất câu hỏi, câu trả lời và góp ý phỏng vấn",
            "session": "Session",
            "role": "Vai trò",
            "level": "Cấp độ",
            "status": "Trạng thái",
            "mode": "Chế độ",
            "created": "Tạo lúc",
            "completed": "Hoàn thành lúc",
            "avg_score": "Điểm trung bình",
            "question_count": "Số câu hỏi",
            "question": "Question",
            "category": "Chủ đề",
            "difficulty": "Độ khó",
            "user_answer": "Câu trả lời của user",
            "feedback": "Gợi ý và feedback",
            "score": "Điểm",
            "empty_answer": "Chưa có câu trả lời cho mục này.",
            "empty_feedback": "Chưa có feedback.",
            "in_progress": "Đang làm",
            "completed_status": "Hoàn thành",
            "unknown": "Chưa có",
            "export_all_title": "Invera Sessions Export",
            "export_all_subtitle": "Toàn bộ lịch sử session của user",
            "ai_evaluation": "Báo cáo đánh giá chi tiết từ AI (Giao tiếp & Telemetry)",
            "practice_plan": "Kế hoạch luyện tập đề xuất từ AI",
        }
    return {
        "report_title": "Invera Session Export",
        "report_subtitle": "Interview questions, answers, and coaching feedback",
        "session": "Session",
        "role": "Role",
        "level": "Level",
        "status": "Status",
        "mode": "Mode",
        "created": "Created",
        "completed": "Completed",
        "avg_score": "Average score",
        "question_count": "Question count",
        "question": "Question",
        "category": "Category",
        "difficulty": "Difficulty",
        "user_answer": "User answer",
        "feedback": "Feedback and suggestions",
        "score": "Score",
        "empty_answer": "No answer was submitted for this item yet.",
        "empty_feedback": "No feedback yet.",
        "in_progress": "In progress",
        "completed_status": "Completed",
        "unknown": "Not available",
        "export_all_title": "Invera Sessions Export",
        "export_all_subtitle": "Full session history for this user",
        "ai_evaluation": "Detailed AI Evaluation Report (Communication & Telemetry)",
        "practice_plan": "AI Recommended Practice Plan",
    }


def _format_session_status(status: str, labels: dict[str, str]) -> str:
    return labels["completed_status"] if status == "COMPLETED" else labels["in_progress"]


def _append_multiline_block(story: list[Any], text: str, style: ParagraphStyle) -> None:
    normalized = sanitize_user_text(text)
    if not normalized:
        story.append(_paragraph("", style))
        return
    for line in normalized.splitlines():
        cleaned = line.strip()
        if cleaned:
            story.append(_paragraph(cleaned, style))


def _session_meta_table(session: dict[str, Any], labels: dict[str, str], styles: dict[str, ParagraphStyle]) -> Table:
    def value(raw: Any) -> str:
        if raw is None or raw == "":
            return labels["unknown"]
        return str(raw)

    meta_rows = [
        [labels["role"], value(session.get("role_label"))],
        [labels["level"], value(session.get("level_label"))],
        [labels["status"], _format_session_status(value(session.get("status")), labels)],
        [labels["mode"], value(session.get("mode"))],
        [labels["created"], value(session.get("created_at_label"))],
        [labels["completed"], value(session.get("completed_at_label"))],
        [labels["avg_score"], value(session.get("avg_score_label"))],
        [labels["question_count"], value(session.get("question_count"))],
    ]
    table = Table(
        [
            [
                _paragraph(str(label), styles["meta_label"]),
                _paragraph(str(meta_value), styles["meta_cell"]),
            ]
            for label, meta_value in meta_rows
        ],
        colWidths=[42 * mm, 120 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#dbe4f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


def _metric_table(title: str, rows: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    table_rows = [[_paragraph(title, styles["section_label"]), _paragraph("", styles["body"])]]
    table_rows.extend([[_paragraph(label, styles["meta_label"]), _paragraph(value, styles["meta_cell"])] for label, value in rows])
    table = Table(table_rows, colWidths=[48 * mm, 114 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (-1, 0)),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbeafe")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#bfdbfe")),
                ("INNERGRID", (0, 1), (-1, -1), 0.5, colors.HexColor("#dbeafe")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


def _parse_inline_markdown(text: str) -> str:
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    escaped = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\*(.*?)\*", r"<i>\1</i>", escaped)
    escaped = re.sub(r"_(.*?)_", r"<i>\1</i>", escaped)
    return escaped


def _add_markdown_paragraphs(story: list[Any], md_text: str, styles: dict[str, ParagraphStyle], font_bold: str, font_regular: str) -> None:
    if not md_text:
        return

    h3_style = ParagraphStyle(
        "MdH3",
        parent=styles["body"],
        fontName=font_bold,
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=6,
        spaceAfter=3,
    )
    bullet_style = ParagraphStyle(
        "MdBullet",
        parent=styles["body"],
        fontName=font_regular,
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1f2937"),
        leftIndent=12,
        spaceAfter=3,
    )
    quote_style = ParagraphStyle(
        "MdQuote",
        parent=styles["body"],
        fontName=font_regular,
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#475569"),
        leftIndent=18,
        spaceAfter=3,
    )

    lines = md_text.split("\n")
    for line in lines:
        line_str = line.strip()
        if not line_str:
            story.append(Spacer(1, 3))
            continue

        if line_str.startswith("###"):
            text = line_str[3:].strip()
            text = _parse_inline_markdown(text)
            story.append(Paragraph(text, h3_style))
        elif line_str.startswith("##"):
            text = line_str[2:].strip()
            text = _parse_inline_markdown(text)
            story.append(Paragraph(text, h3_style))
        elif line_str.startswith("#"):
            text = line_str[1:].strip()
            text = _parse_inline_markdown(text)
            story.append(Paragraph(text, h3_style))
        elif line_str.startswith("- ") or line_str.startswith("* "):
            text = line_str[2:].strip()
            text = _parse_inline_markdown(text)
            story.append(Paragraph(f"&bull; {text}", bullet_style))
        elif line_str.startswith(">"):
            text = line_str[1:].strip()
            text = _parse_inline_markdown(text)
            story.append(Paragraph(text, quote_style))
        else:
            text = _parse_inline_markdown(line_str)
            story.append(Paragraph(text, styles["body"]))


def build_sessions_pdf(*, sessions: list[dict[str, Any]], language: str, export_all: bool) -> bytes:
    labels = _text_labels(language)
    styles = _styles(language)
    font_regular, font_bold = _ensure_fonts()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=labels["export_all_title"] if export_all else labels["report_title"],
        author="Invera",
    )
    story: list[Any] = []

    story.append(_paragraph(labels["export_all_title"] if export_all else labels["report_title"], styles["title"]))
    story.append(_paragraph(labels["export_all_subtitle"] if export_all else labels["report_subtitle"], styles["subtitle"]))

    for session_index, session in enumerate(sessions, start=1):
        if session_index > 1:
            story.append(PageBreak())

        session_heading = f"{labels['session']} {session_index}"
        if session.get("role_label"):
            session_heading = f"{session_heading}: {sanitize_user_text(session['role_label'])}"
        story.append(_paragraph(session_heading, styles["session_heading"]))
        story.append(_session_meta_table(session, labels, styles))
        story.append(Spacer(1, 10))

        # Append AI evaluation report if present
        eval_report = session.get("evaluation_report")
        if eval_report:
            story.append(Spacer(1, 6))
            story.append(_paragraph(labels["ai_evaluation"], styles["section_label"]))
            _add_markdown_paragraphs(story, eval_report, styles, font_bold, font_regular)
            story.append(Spacer(1, 10))

        # Append proposed practice plan if present
        practice_plan = session.get("practice_plan")
        if practice_plan:
            story.append(Spacer(1, 6))
            story.append(_paragraph(labels["practice_plan"], styles["section_label"]))
            _add_markdown_paragraphs(story, practice_plan, styles, font_bold, font_regular)
            story.append(Spacer(1, 10))

        questions = session.get("questions") or []
        answer_map = {answer["question_id"]: answer for answer in session.get("answers", [])}

        for question_index, question in enumerate(questions, start=1):
            answer = answer_map.get(question["id"])
            story.append(_paragraph(f"{labels['question']} {question_index}", styles["question_heading"]))

            meta_bits = [question.get("category"), question.get("difficulty")]
            meta_line = " • ".join(bit for bit in meta_bits if bit)
            if meta_line:
                story.append(_paragraph(meta_line, styles["body"]))

            story.append(_paragraph(sanitize_user_text(question.get("text", "")), styles["body"]))
            story.append(Spacer(1, 4))

            story.append(_paragraph(labels["user_answer"], styles["section_label"]))
            story.append(_paragraph(
                sanitize_user_text(answer["answer_text"]) if answer and answer.get("answer_text") else labels["empty_answer"],
                styles["body"],
            ))
            story.append(Spacer(1, 4))

            story.append(_paragraph(labels["feedback"], styles["section_label"]))
            if answer and answer.get("score") is not None:
                score_text = f"{labels['score']}: {answer['score']}/10"
                story.append(_paragraph(score_text, styles["body"]))
            feedback_text = sanitize_user_text(answer["feedback"]) if answer and answer.get("feedback") else labels["empty_feedback"]
            story.append(_paragraph(feedback_text, styles["body"]))
            metric_blocks = build_video_metric_blocks(answer or {}, language) if answer else []
            for metric_block in metric_blocks:
                story.append(Spacer(1, 6))
                story.append(_metric_table(metric_block["title"], metric_block["rows"], styles))
            if not metric_blocks:
                story.append(_paragraph(sanitize_metric_note(None, language), styles["body"]))
            story.append(Spacer(1, 10))

    doc.build(story, onFirstPage=_page_number, onLaterPages=_page_number)
    return buffer.getvalue()


def build_session_pdf_filename(role: str, session_id: str, export_all: bool) -> str:
    if export_all:
        return "invera-sessions-export.pdf"
    return f"invera-session-{_filename_slug(role)}-{session_id[:8]}.pdf"
