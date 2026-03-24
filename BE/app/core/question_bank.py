from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from fastapi import Request

QUESTION_BANK_ROLES: dict[str, tuple[str, ...]] = {
    "technology": (
        "frontend",
        "backend",
        "fullstack",
        "data_scientist",
        "machine_learning_engineer",
        "devops_engineer",
        "product_manager",
        "marketing_manager",
        "sales_representative",
        "ux_designer",
    ),
    "finance": (
        "financial_analyst",
        "accountant",
        "auditor",
        "investment_banking_analyst",
    ),
    "business": (
        "business_analyst",
        "operations_analyst",
        "sales_executive",
        "marketing_executive",
    ),
}

VALID_LEVELS: tuple[str, ...] = ("intern", "fresher", "junior", "mid", "senior")
SUPPORTED_UI_LANGUAGES = {"en", "vi"}
UI_LANGUAGE_HEADER = "x-ui-language"


def infer_major_from_role(role: str) -> str | None:
    normalized_role = role.strip().lower()
    for major, roles in QUESTION_BANK_ROLES.items():
        if normalized_role in roles:
            return major
    return None


def normalize_ui_language(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return normalized if normalized in SUPPORTED_UI_LANGUAGES else "en"


def resolve_ui_language(request: Request | None) -> str:
    if request is None:
        return "en"
    return normalize_ui_language(request.headers.get(UI_LANGUAGE_HEADER))


def localized_question_field(row: Mapping[str, Any], field: str, language: str) -> Any:
    canonical = row.get(field)
    english = row.get(f"{field}_en") or canonical
    vietnamese = row.get(f"{field}_vi") or canonical
    return vietnamese if normalize_ui_language(language) == "vi" else english


def localized_question_dict(
    row: Mapping[str, Any],
    *,
    include_ideal_answer: bool = False,
) -> dict[str, Any]:
    payload = dict(row)
    payload["text_en"] = payload.get("text_en") or payload.get("text")
    payload["text_vi"] = payload.get("text_vi") or payload.get("text")
    payload["category_en"] = payload.get("category_en") or payload.get("category")
    payload["category_vi"] = payload.get("category_vi") or payload.get("category")
    payload["text"] = payload["text_en"]
    payload["category"] = payload["category_en"]
    if include_ideal_answer:
        payload["ideal_answer_en"] = payload.get("ideal_answer_en") or payload.get("ideal_answer")
        payload["ideal_answer_vi"] = payload.get("ideal_answer_vi") or payload.get("ideal_answer")
        payload["ideal_answer"] = payload["ideal_answer_en"]
    return payload
