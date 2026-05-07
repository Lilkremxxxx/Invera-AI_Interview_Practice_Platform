import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))

from app.services.interview_tts import build_feedback_tts_script, synthesize_feedback_audio


def test_build_feedback_tts_script_is_bilingual_and_score_aware():
    script = build_feedback_tts_script(
        score=7.4,
        feedback="Summary: Solid answer with clear reasoning.\n\nPriority improvements:\n- Add metrics.",
    )

    assert "English feedback." in script
    assert "Vietnamese feedback." in script
    assert "7.4 out of 10" in script
    assert "7.4 trên 10" in script
    assert "Add metrics" in script


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
