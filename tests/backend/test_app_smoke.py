import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))


def test_app_import_smoke():
    from app.main import app

    assert app.title == "Invera API"


def test_runtime_dependencies_are_available():
    import docx

    assert hasattr(docx, "Document")
