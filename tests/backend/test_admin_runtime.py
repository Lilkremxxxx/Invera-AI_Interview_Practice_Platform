import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.core.config import Settings


def test_primary_admin_emails_are_loaded_from_csv():
    settings = Settings(primary_admin_emails_raw="root@example.com,admin@example.com")
    assert settings.primary_admin_emails == ["root@example.com", "admin@example.com"]


def test_admin_module_uses_primary_admin_list():
    from app.api.endpoints import admin

    admin.settings = Settings(primary_admin_emails_raw="boss@example.com")
    assert admin._is_primary_admin_email("boss@example.com") is True
    assert admin._is_primary_admin_email("other@example.com") is False
