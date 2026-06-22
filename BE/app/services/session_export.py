from __future__ import annotations

from typing import Any

from app.core.text_processing import sanitize_user_text


def coerce_telemetry_data(raw_value: Any) -> dict[str, Any] | None:
    if not raw_value:
        return None
    if isinstance(raw_value, dict):
        return raw_value
    return None


def _metric_labels(language: str) -> dict[str, str]:
    if language == "vi":
        return {
            "video_metrics": "Chỉ số video",
            "follow_up_video_metrics": "Chỉ số video follow-up",
            "eye_contact": "Giao tiếp mắt",
            "posture": "Tư thế",
            "speaking_pace": "Tốc độ nói",
            "fillers": "Từ đệm",
            "confidence": "Độ tự tin",
            "blink": "Nháy mắt",
            "tension": "Căng thẳng",
            "no_metrics": "Chưa có telemetry video cho phần này.",
        }
    return {
        "video_metrics": "Video metrics",
        "follow_up_video_metrics": "Follow-up video metrics",
        "eye_contact": "Eye contact",
        "posture": "Posture",
        "speaking_pace": "Speaking pace",
        "fillers": "Fillers",
        "confidence": "Confidence",
        "blink": "Blink",
        "tension": "Tension",
        "no_metrics": "No video telemetry is available for this section.",
    }


def format_metric_value(key: str, telemetry: dict[str, Any]) -> str:
    if key == "eye_contact":
        value = telemetry.get("gazeRatio")
        return f"{round(float(value) * 100)}%" if isinstance(value, (int, float)) else "0%"
    if key == "posture":
        posture = telemetry.get("bodyPostureScore")
        if not isinstance(posture, (int, float)) and isinstance(telemetry.get("slouchRatio"), (int, float)):
            posture = 1 - float(telemetry["slouchRatio"])
        return f"{round(float(posture) * 100)}%" if isinstance(posture, (int, float)) else "0%"
    if key == "speaking_pace":
        value = telemetry.get("speakingPace")
        return f"{round(float(value))} WPM" if isinstance(value, (int, float)) else "0 WPM"
    if key == "fillers":
        value = telemetry.get("fillerWordsCount")
        return str(round(float(value))) if isinstance(value, (int, float)) else "0"
    if key == "confidence":
        value = telemetry.get("presentationConfidence")
        return f"{round(float(value))}%" if isinstance(value, (int, float)) else "0%"
    if key == "blink":
        value = telemetry.get("blinkRatio")
        return f"{round(float(value) * 100)}%" if isinstance(value, (int, float)) else "0%"
    if key == "tension":
        value = telemetry.get("avgTensionScore")
        return f"{round(float(value) * 100)}%" if isinstance(value, (int, float)) else "0%"
    return "-"


def build_metric_rows(telemetry: dict[str, Any] | None, language: str) -> list[tuple[str, str]]:
    if not telemetry:
        return []

    labels = _metric_labels(language)
    keys = ["eye_contact", "posture", "speaking_pace", "fillers", "confidence", "blink", "tension"]
    return [(labels[key], format_metric_value(key, telemetry)) for key in keys]


def build_video_metric_blocks(answer: dict[str, Any], language: str) -> list[dict[str, Any]]:
    labels = _metric_labels(language)
    blocks: list[dict[str, Any]] = []

    telemetry = coerce_telemetry_data(answer.get("telemetry_data"))
    if telemetry:
      blocks.append({
          "title": labels["video_metrics"],
          "rows": build_metric_rows(telemetry, language),
      })

    follow_up_telemetry = coerce_telemetry_data(answer.get("follow_up_telemetry_data"))
    if follow_up_telemetry:
        blocks.append({
            "title": labels["follow_up_video_metrics"],
            "rows": build_metric_rows(follow_up_telemetry, language),
        })

    return blocks


def sanitize_metric_note(text: str | None, language: str) -> str:
    if text:
        cleaned = sanitize_user_text(text)
        if cleaned:
            return cleaned
    return _metric_labels(language)["no_metrics"]
