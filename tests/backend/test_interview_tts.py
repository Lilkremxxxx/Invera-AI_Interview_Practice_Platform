import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

import app.services.interview_tts as interview_tts
from app.services.interview_tts import build_feedback_tts_script, synthesize_feedback_audio


def test_build_feedback_tts_script_defaults_to_vietnamese_and_score_aware():
    script = build_feedback_tts_script(
        score=7.4,
        feedback="Tóm tắt: Câu trả lời khá rõ.\n\nƯu tiên cải thiện:\n- Thêm số liệu.",
    )

    assert "Vietnamese feedback." not in script
    assert "7.4 trên 10" in script
    assert "Thêm số liệu" in script
    assert "English feedback." not in script


def test_build_feedback_tts_script_includes_full_feedback_without_char_clamp(monkeypatch):
    long_feedback = (
        "Summary: Candidate answer: the user discussed caching. Missing or weak: "
        "add invalidation, rollout risk, and metrics.\n\n"
        "Scoring criteria:\n"
        "- Problem Understanding & Context - mixed: Evaluation: relevant but shallow. Missing: add constraints.\n"
        "- Domain Knowledge & Accuracy - weak: Evaluation: lacks precise terms. Missing: name cache strategy.\n"
        "\nPriority improvements:\n"
        "- Add baseline metrics.\n"
        "- Explain cache invalidation.\n"
        "- Mention rollback and stale data risk."
    )
    monkeypatch.setattr(
        interview_tts,
        "settings",
        SimpleNamespace(
            kitten_tts_max_chars=80,
            interview_tts_script_language="en",
        ),
    )

    script = build_feedback_tts_script(score=5.4, feedback=long_feedback, language="en")

    assert "Your rubric score is 5.4 out of 10." in script
    assert "Explain cache invalidation." in script
    assert "Mention rollback and stale data risk." in script
    assert len(script) > 80


def test_build_feedback_tts_script_shortens_long_feedback_for_audio(monkeypatch):
    long_feedback = (
        "Summary: Candidate answer: the user discussed caching. Missing or weak: "
        "add invalidation, rollout risk, and metrics.\n\n"
        "Scoring criteria:\n"
        "- Problem Understanding & Context - mixed: Evaluation: relevant but shallow. Missing: add constraints.\n"
        "- Domain Knowledge & Accuracy - weak: Evaluation: lacks precise terms. Missing: name cache strategy.\n"
        "\nPriority improvements:\n"
        "- Add baseline metrics.\n"
        "- Explain cache invalidation.\n"
        "- Mention rollback and stale data risk."
    )
    monkeypatch.setattr(
        interview_tts,
        "settings",
        SimpleNamespace(
            interview_tts_script_language="en",
            interview_tts_max_chars=220,
        ),
    )

    script = build_feedback_tts_script(score=5.4, feedback=long_feedback, language="en")

    assert "Your rubric score is 5.4 out of 10." in script
    assert "Priority improvements" in script
    assert "Explain cache invalidation" in script
    assert "Scoring criteria" not in script
    assert "Domain Knowledge & Accuracy" not in script
    assert len(script) <= 220


def test_build_feedback_tts_script_can_use_english_only():
    script = build_feedback_tts_script(
        score=6.8,
        feedback="Summary: Usable answer, but it needs clearer trade-offs.\n\nPriority improvements:\n- Add a concrete browser example.",
        language="en",
    )

    assert "English feedback." not in script
    assert "6.8 out of 10" in script
    assert "Add a concrete browser example" in script
    assert "Vietnamese feedback." not in script
    assert "trên 10" not in script


def test_build_feedback_tts_script_detects_english_feedback_when_language_not_given():
    script = build_feedback_tts_script(
        score=5.2,
        feedback="Summary: The answer is too generic.\n\nPriority improvements:\n- Explain the event flow.",
    )

    assert "English feedback." not in script
    assert "Vietnamese feedback." not in script


def test_synthesize_feedback_audio_returns_media_url_when_generator_writes_file(tmp_path, monkeypatch):
    def fake_generator(text, output_path):
        output_path.write_bytes(b"wav-data")

    result = synthesize_feedback_audio(
        answer_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        script="English feedback. Vietnamese feedback.",
        generator=fake_generator,
        output_root=tmp_path,
    )

    assert result is not None
    assert result.startswith("/media/interview-tts/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.wav?v=")
    assert (tmp_path / "interview-tts" / "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.wav").read_bytes() == b"wav-data"


def test_selects_vieneu_generator_when_configured(monkeypatch):
    calls = []

    monkeypatch.setattr(
        interview_tts,
        "settings",
        SimpleNamespace(
            interview_tts_engine="vieneu",
            kitten_tts_voice="expr-voice-2-f",
            kitten_tts_speed=1.25,
            kitten_tts_sample_rate=24000,
            vieneu_tts_mode="turbo",
            vieneu_tts_voice=None,
        ),
    )
    monkeypatch.setattr(interview_tts, "_vieneu_generate_to_file", lambda text, output_path: calls.append((text, output_path)))

    generator = interview_tts._get_default_generator()
    generator("Xin chào", "out.wav")

    assert calls == [("Xin chào", "out.wav")]


def test_vieneu_generator_falls_back_to_kitten_when_unavailable(monkeypatch):
    calls = []

    monkeypatch.setattr(
        interview_tts,
        "settings",
        SimpleNamespace(
            interview_tts_engine="vieneu",
            kitten_tts_voice="expr-voice-2-f",
            kitten_tts_speed=1.25,
            kitten_tts_sample_rate=24000,
            vieneu_tts_mode="turbo",
            vieneu_tts_voice=None,
        ),
    )

    def failing_vieneu(text, output_path):
        raise RuntimeError("vieneu missing")

    monkeypatch.setattr(interview_tts, "_vieneu_generate_to_file", failing_vieneu)
    monkeypatch.setattr(interview_tts, "_kitten_generate_to_file", lambda text, output_path: calls.append((text, output_path)))

    generator = interview_tts._get_default_generator()
    generator("Xin chào", "out.wav")

    assert calls == [("Xin chào", "out.wav")]


def test_synthesize_english_feedback_uses_kitten_when_default_engine_is_vieneu(tmp_path, monkeypatch):
    calls = []

    monkeypatch.setattr(
        interview_tts,
        "settings",
        SimpleNamespace(
            interview_tts_enabled=True,
            interview_tts_engine="vieneu",
            uploads_dir=tmp_path,
        ),
    )

    def fake_kitten(text, output_path):
        calls.append(("kitten", text))
        output_path.write_bytes(b"wav-data")

    monkeypatch.setattr(interview_tts, "_kitten_generate_to_file", fake_kitten)
    monkeypatch.setattr(
        interview_tts,
        "_vieneu_generate_to_file",
        lambda text, output_path: calls.append(("vieneu", text)),
    )

    result = synthesize_feedback_audio(
        answer_id="answer-english",
        script="English feedback. Your rubric score is 6.8 out of 10.",
    )

    assert result is not None
    assert calls == [("kitten", "English feedback. Your rubric score is 6.8 out of 10.")]


def test_synthesize_english_feedback_uses_kokoro_when_configured(tmp_path, monkeypatch):
    calls = []

    monkeypatch.setattr(
        interview_tts,
        "settings",
        SimpleNamespace(
            interview_tts_enabled=True,
            interview_tts_engine="vieneu",
            interview_tts_english_engine="kokoro",
            uploads_dir=tmp_path,
            kokoro_tts_model_path=tmp_path / "kokoro.onnx",
            kokoro_tts_voices_path=tmp_path / "voices.bin",
            kokoro_tts_voice="af_sarah",
            kokoro_tts_speed=1.0,
            kokoro_tts_language="en-us",
        ),
    )
    monkeypatch.setattr(
        interview_tts,
        "_kokoro_generate_to_file",
        lambda text, output_path: (calls.append(("kokoro", text)), output_path.write_bytes(b"wav-data")),
    )
    monkeypatch.setattr(interview_tts, "_kitten_generate_to_file", lambda text, output_path: calls.append(("kitten", text)))

    result = synthesize_feedback_audio(
        answer_id="answer-kokoro",
        script="English feedback. Your rubric score is 6.8 out of 10.",
    )

    assert result is not None
    assert calls == [("kokoro", "English feedback. Your rubric score is 6.8 out of 10.")]
