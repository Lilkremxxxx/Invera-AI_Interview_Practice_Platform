from __future__ import annotations

import re
import unicodedata


SUPPORTED_OUTPUT_LANGUAGES = {"en", "vi"}
VIETNAMESE_ASCII_HINTS = {
    "toi", "ban", "minh", "la", "va", "cua", "khong", "duoc", "trong", "cho", "voi",
    "nhung", "mot", "de", "vi", "neu", "giup", "giai", "thich", "cau", "tra", "loi",
    "phong", "van", "bai", "hoc", "doan", "nay", "em", "anh", "chi", "dung", "nhanh",
    "hon", "khac", "nhau", "tai", "sao", "phan", "giong", "vi_du", "co_che",
}
ALLOWED_SYMBOLS = {"+", "#", "%", "&", "/", "=", "<", ">", "@", ":", "_", "-", "."}
MARKDOWN_BULLETS = "\u2022\u2023\u2043\u2219\u25aa\u25ab\u25cf\u25e6\u2027"
WEIRD_SEPARATORS = "\u200b\u200c\u200d\ufeff"


def normalize_supported_language(value: str | None, default: str = "en") -> str:
    normalized = (value or "").strip().lower()
    return normalized if normalized in SUPPORTED_OUTPUT_LANGUAGES else default


def _has_vietnamese_diacritics(text: str) -> bool:
    return bool(
        re.search(
            r"[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]",
            text.lower(),
        )
    )


def _looks_like_vietnamese_ascii(text: str) -> bool:
    tokens = set(re.findall(r"\b[\w]+\b", text.lower()))
    return len(tokens & VIETNAMESE_ASCII_HINTS) >= 2


def detect_text_language(text: str | None) -> str | None:
    raw = (text or "").strip()
    if not raw:
        return None
    if _has_vietnamese_diacritics(raw) or _looks_like_vietnamese_ascii(raw):
        return "vi"
    if re.search(r"[A-Za-z]", raw):
        return "en"
    return None


def select_response_language(default_language: str | None, *texts: str | None) -> str:
    normalized_default = normalize_supported_language(default_language, default="en")
    detected_languages = [detect_text_language(text) for text in texts if (text or "").strip()]
    if "vi" in detected_languages:
        return "vi"
    if "en" in detected_languages:
        return "en"
    return normalized_default


def sanitize_user_text(text: str | None) -> str:
    if not text:
        return ""

    cleaned = unicodedata.normalize("NFKC", text)
    cleaned = cleaned.translate({ord(char): None for char in WEIRD_SEPARATORS})
    cleaned = cleaned.replace("\r", "\n").replace("\t", " ")

    cleaned = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*[*+-]\s+", "", cleaned)
    cleaned = cleaned.replace("**", "").replace("__", "").replace("~~", "").replace("`", "")
    cleaned = re.sub(r"(?<!\w)[*](?!\w)", " ", cleaned)
    cleaned = re.sub(f"[{MARKDOWN_BULLETS}→←⇒⇢➜➝➞➔➤—–•]+", " ", cleaned)
    cleaned = re.sub(r"\s*[-]{2,}\s*", " ", cleaned)

    normalized_chars: list[str] = []
    for char in cleaned:
        category = unicodedata.category(char)
        if category.startswith("C"):
            continue
        if category.startswith("S") and char not in ALLOWED_SYMBOLS:
            normalized_chars.append(" ")
            continue
        normalized_chars.append(char)

    plain_text = "".join(normalized_chars)
    plain_text = re.sub(r"\s+", " ", plain_text).strip()
    return plain_text
