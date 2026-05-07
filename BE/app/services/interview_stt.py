from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from app.core.config import settings


# Known whisper hallucination patterns — common when silence/noise is fed to whisper
_HALLUCINATION_PATTERNS = [
    # Vietnamese subscription/YouTube spam
    r"subscribe",
    r"đăng ký",
    r"subscrib",
    r"subs?cri?b",
    r"kênh",
    r"sub for",
    r"sub to",
    r"like and",
    r"bấm like",
    r"chia sẻ",
    r"don't forget",
    r"nhấn chuông",
    # Common English silence hallucination
    r"thanks for watching",
    r"thank you for watching",
    r"thank you for",
    r"please like",
    r"please subscribe",
    r"hit subscribe",
    r"click subscribe",
    r"speaking in foreign language",
    r"xem thêm",
    r"theo dõi",
    r"bạn ơi",
    r"là ơn",
    # Very short no-meaning vietnamese
    r"^\s*à\s*$",
    r"^\s*ờ\s*$",
    r"^\s*ừ\s*$",
    r"^\s*ư\s*$",
    r"^\s*hmm\s*$",
    r"^\s*uh\s*$",
    r"^\s*um\s*$",
    r"^\s*ah\s*$",
]

# Minimally meaningful word count threshold to filter silence/noise
_MIN_MEANINGFUL_WORDS = 3
# Words that do not count as "meaningful content"
_NON_MEANINGFUL = {
    "à", "á", "ả", "ã", "ạ",
    "ò", "ó", "ỏ", "õ", "ọ",
    "è", "é", "ẻ", "ẽ", "ẹ",
    "ì", "í", "ỉ", "ĩ", "ị",
    "ù", "ú", "ủ", "ũ", "ụ",
    "ờ", "ở", "ỡ", "ợ",
    "ừ", "ứ", "ử", "ữ", "ự",
    "ồ", "ổ", "ỗ", "ộ",
    "a", "i", "u", "e", "o",
    "uh", "um", "ah", "eh", "oh",
    "hmm", "hmm", "hmmm",
    "và", "là", "của", "các", "có",
    "the", "a", "an", "is", "are",
    "la", "va", "co",
}
_SUPPORTED_STT_LANGUAGES = {"auto", "en", "vi"}


def _is_hallucinated_transcript(transcript: str) -> bool:
    """Check if whisper output is a known hallucination or silence transcription."""
    normalized = transcript.strip().lower()

    # Empty or whitespace-only
    if not normalized:
        return True

    # Check known hallucination regex patterns
    for pattern in _HALLUCINATION_PATTERNS:
        if re.search(pattern, normalized):
            return True

    # Count meaningful words
    tokens = [t for t in re.findall(r"\b[^\s]+\b", normalized) if t.lower() not in _NON_MEANINGFUL]
    if len(tokens) < _MIN_MEANINGFUL_WORDS:
        return True

    return False


class InterviewSttRuntimeError(RuntimeError):
    pass


def ensure_interview_stt_runtime() -> None:
    if not settings.interview_stt_enabled:
        raise InterviewSttRuntimeError("Interview STT is disabled.")
    if not shutil.which("ffmpeg"):
        raise InterviewSttRuntimeError("ffmpeg is not installed on this server.")
    if not settings.whisper_cli_path.exists():
        raise InterviewSttRuntimeError(
            f"Missing whisper-cli binary at {settings.whisper_cli_path}. Run bootstrap first."
        )
    if not settings.whisper_model_path.exists():
        raise InterviewSttRuntimeError(
            f"Missing Whisper model at {settings.whisper_model_path}. Run bootstrap first."
        )
    if not settings.whisper_en_model_path.exists():
        raise InterviewSttRuntimeError(
            f"Missing English Whisper model at {settings.whisper_en_model_path}. Run bootstrap first."
        )


def _normalize_stt_language(language: str | None) -> str:
    normalized = (language or settings.interview_stt_language or "auto").strip().lower()
    if normalized not in _SUPPORTED_STT_LANGUAGES:
        raise ValueError(f"Unsupported STT language: {language}")
    return normalized


def _whisper_model_path_for_language(language: str) -> Path:
    if language == "en":
        return settings.whisper_en_model_path
    return settings.whisper_model_path


def build_whisper_command(*, wav_path: str, output_prefix: str, language: str | None = None) -> list[str]:
    normalized_language = _normalize_stt_language(language)
    command = [
        str(settings.whisper_cli_path),
        "-m",
        str(_whisper_model_path_for_language(normalized_language)),
        "-f",
        wav_path,
        "-otxt",
        "-of",
        output_prefix,
    ]
    if normalized_language != "auto":
        command.extend(["-l", normalized_language])
    return command


def _sanitize_transcript(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\n", " ")).strip()


def _ffmpeg_output_path(work_dir: Path) -> Path:
    return work_dir / "audio.wav"


def transcribe_audio_bytes(*, audio_bytes: bytes, original_filename: str, language: str | None = None) -> str:
    ensure_interview_stt_runtime()
    settings.interview_stt_temp_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(original_filename or "recording.webm").suffix or ".webm"
    with tempfile.TemporaryDirectory(dir=settings.interview_stt_temp_dir) as tmp_dir:
        work_dir = Path(tmp_dir)
        input_path = work_dir / f"input{suffix}"
        input_path.write_bytes(audio_bytes)

        wav_path = _ffmpeg_output_path(work_dir)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(wav_path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        output_prefix = str(work_dir / "transcript")
        subprocess.run(
            build_whisper_command(
                wav_path=str(wav_path),
                output_prefix=output_prefix,
                language=language,
            ),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        transcript_path = Path(f"{output_prefix}.txt")
        if not transcript_path.exists():
            raise InterviewSttRuntimeError("whisper.cpp did not generate a transcript file.")

        transcript = _sanitize_transcript(transcript_path.read_text(encoding="utf-8"))
        if not transcript:
            raise InterviewSttRuntimeError("The transcript result was empty.")

        # Detect whisper hallucination — silence/noise often produces
        # subscription-style spam instead of silence detection
        if _is_hallucinated_transcript(transcript):
            raise InterviewSttRuntimeError(
                "Bạn hãy kiểm tra lại mic, tôi không có nghe rõ bạn nói gì <3"
            )
        return transcript
