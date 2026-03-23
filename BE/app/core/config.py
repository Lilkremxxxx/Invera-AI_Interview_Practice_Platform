from __future__ import annotations

import os
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path

from dotenv import load_dotenv


BE_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BE_DIR.parent
ENV_PATH = BE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    project_root: Path = PROJECT_ROOT
    backend_dir: Path = BE_DIR
    env_path: Path = ENV_PATH
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    backend_host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port: int = int(os.getenv("BACKEND_PORT", "9000"))
    frontend_public_url: str = os.getenv("FRONTEND_URL", "https://invera.pp.ua")
    api_public_url: str = os.getenv("API_URL", "https://invera.pp.ua/api")
    pg_host: str | None = os.getenv("PG_HOST")
    pg_port: int = int(os.getenv("PG_PORT", "5432"))
    pg_dbname: str | None = os.getenv("PG_DBNAME")
    pg_user: str | None = os.getenv("PG_USER")
    pg_password: str | None = os.getenv("PG_PASSWORD")
    secret_key: str = os.getenv("SECRET_KEY", "")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    google_client_id: str | None = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    github_client_id: str | None = os.getenv("GITHUB_CLIENT_ID")
    github_client_secret: str | None = os.getenv("GITHUB_CLIENT_SECRET")
    email_delivery_mode: str = os.getenv("EMAIL_DELIVERY_MODE", "log")
    smtp_host: str | None = os.getenv("SMTP_HOST")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str | None = os.getenv("SMTP_USERNAME")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")
    smtp_sender_email: str | None = os.getenv("SMTP_SENDER_EMAIL")
    smtp_sender_name: str = os.getenv("SMTP_SENDER_NAME", "Invera")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    verification_code_ttl_minutes: int = int(os.getenv("VERIFICATION_CODE_TTL_MINUTES", "10"))
    verification_resend_cooldown_seconds: int = int(os.getenv("VERIFICATION_RESEND_COOLDOWN_SECONDS", "60"))
    primary_admin_emails_raw: str = os.getenv("PRIMARY_ADMIN_EMAILS", "nhatbang6688@gmail.com")
    deepseek_enabled: bool = os.getenv("DEEPSEEK_ENABLED", "false").lower() == "true"
    deepseek_api_base_url: str = os.getenv("DEEPSEEK_API_BASE_URL", "https://api.deepseek.com")
    deepseek_api_key: str | None = os.getenv("DEEPSEEK_API_KEY")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    deepseek_timeout_seconds: float = float(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", "90"))
    deepseek_max_tokens: int = int(os.getenv("DEEPSEEK_MAX_TOKENS", "1800"))
    deepseek_temperature: float = float(os.getenv("DEEPSEEK_TEMPERATURE", "0.2"))
    vnpay_payment_url: str = os.getenv(
        "VNPAY_PAYMENT_URL",
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    )
    vnpay_tmn_code: str | None = os.getenv("VNPAY_TMN_CODE")
    vnpay_hash_secret: str | None = os.getenv("VNPAY_HASH_SECRET")
    vnpay_return_url: str = os.getenv(
        "VNPAY_RETURN_URL",
        f"{os.getenv('API_URL', 'https://invera.pp.ua/api')}/billing/vnpay/return",
    )
    vnpay_ipn_url: str = os.getenv(
        "VNPAY_IPN_URL",
        f"{os.getenv('API_URL', 'https://invera.pp.ua/api')}/billing/vnpay/ipn",
    )
    vnpay_locale: str = os.getenv("VNPAY_LOCALE", "vn")
    frontend_upgrade_url: str = os.getenv(
        "FRONTEND_UPGRADE_URL",
        f"{os.getenv('FRONTEND_URL', 'https://invera.pp.ua')}/app/upgrade",
    )

    @cached_property
    def uploads_dir(self) -> Path:
        return self.project_root / "uploads"

    @cached_property
    def private_uploads_dir(self) -> Path:
        return self.project_root / "private_uploads"

    @cached_property
    def frontend_dist_dir(self) -> Path:
        return self.project_root / "FE" / "dist"

    @cached_property
    def primary_admin_emails(self) -> list[str]:
        return [email.lower() for email in _split_csv(self.primary_admin_emails_raw)]

    @cached_property
    def cors_allowed_origins(self) -> list[str]:
        explicit = _split_csv(os.getenv("CORS_ALLOWED_ORIGINS"))
        if explicit:
            return explicit

        return [
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:9000",
            "http://127.0.0.1:9000",
            "https://invera.pp.ua",
            "https://www.invera.pp.ua",
        ]


settings = Settings()
