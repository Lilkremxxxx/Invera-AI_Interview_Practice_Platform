from __future__ import annotations

import json
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

from app.core.config import settings
from app.services.interview_stt import _sanitize_transcript


class InterviewRealtimeSttRuntimeError(RuntimeError):
    pass


_SUPPORTED_REALTIME_LANGUAGES = {"vi", "en"}
_MODEL_CACHE: dict[str, object] = {}


def _normalize_realtime_language(language: str | None) -> str:
    normalized = (language or "vi").strip().lower()
    if normalized == "auto":
        normalized = "vi"
    if normalized not in _SUPPORTED_REALTIME_LANGUAGES:
        raise ValueError(f"Unsupported realtime STT language: {language}")
    return normalized


def _get_vosk_module():
    try:
        import vosk  # type: ignore
    except ImportError as exc:
        raise InterviewRealtimeSttRuntimeError(
            "Vosk is not installed. Add the Python dependency and download the Vosk models."
        ) from exc
    return vosk


def _model_path_for_language(language: str) -> Path:
    if language == "en":
        return settings.vosk_model_en_path
    return settings.vosk_model_vi_path


def ensure_interview_realtime_stt_runtime(language: str | None = None) -> None:
    if not settings.interview_stt_realtime_enabled:
        raise InterviewRealtimeSttRuntimeError("Realtime STT is disabled.")
    if not shutil.which("ffmpeg"):
        raise InterviewRealtimeSttRuntimeError("ffmpeg is not installed on this server.")
    _get_vosk_module()
    model_path = _model_path_for_language(_normalize_realtime_language(language))
    if not model_path.exists():
        raise InterviewRealtimeSttRuntimeError(
            f"Missing Vosk model directory at {model_path}. Download the configured model first."
        )


def _decode_audio_chunk_to_pcm(audio_bytes: bytes, suffix: str = ".webm") -> bytes:
    with tempfile.TemporaryDirectory(dir=settings.interview_stt_temp_dir) as tmp_dir:
        work_dir = Path(tmp_dir)
        input_path = work_dir / f"chunk{suffix}"
        input_path.write_bytes(audio_bytes)

        output_path = work_dir / "chunk.pcm"
        subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(input_path),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "s16le",
                str(output_path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return output_path.read_bytes()


def _get_model(language: str):
    normalized_language = _normalize_realtime_language(language)
    cached = _MODEL_CACHE.get(normalized_language)
    if cached is not None:
        return cached

    vosk = _get_vosk_module()
    model = vosk.Model(str(_model_path_for_language(normalized_language)))
    _MODEL_CACHE[normalized_language] = model
    return model


def _resample_pcm_to_16k(pcm_bytes: bytes, from_rate: int) -> bytes:
    if from_rate == 16000 or not pcm_bytes:
        return pcm_bytes
    
    count = len(pcm_bytes) // 2
    if count == 0:
        return b""
        
    samples = struct.unpack(f"<{count}h", pcm_bytes)
    ratio = 16000.0 / from_rate
    new_count = int(count * ratio)
    if new_count == 0:
        return b""
        
    output_samples = [0] * new_count
    for i in range(new_count):
        pos = i / ratio
        low_idx = int(pos)
        high_idx = min(low_idx + 1, count - 1)
        weight = pos - low_idx
        val = (1.0 - weight) * samples[low_idx] + weight * samples[high_idx]
        output_samples[i] = int(val)
        
    return struct.pack(f"<{new_count}h", *output_samples)


class VoskRealtimeSession:
    def __init__(self, *, language: str | None = None, sample_rate: int = 16000):
        normalized_language = _normalize_realtime_language(language)
        ensure_interview_realtime_stt_runtime(normalized_language)
        vosk = _get_vosk_module()
        self.language = normalized_language
        self.sample_rate = sample_rate
        self.recognizer = vosk.KaldiRecognizer(_get_model(normalized_language), 16000.0)
        if hasattr(self.recognizer, "SetWords"):
            self.recognizer.SetWords(True)
        self.audio_buffer = b""
        self.processed_pcm_bytes = 0

    def accept_chunk(self, audio_bytes: bytes, suffix: str = ".webm") -> dict[str, str | bool]:
        # Check if input is WebM (EBML magic header is 1A 45 DF A3)
        is_webm = len(audio_bytes) >= 4 and audio_bytes[:4] == b"\x1A\x45\xDF\xA3"

        if is_webm:
            self.audio_buffer += audio_bytes
            full_pcm_bytes = _decode_audio_chunk_to_pcm(self.audio_buffer, suffix=suffix)
            if not full_pcm_bytes:
                return {"type": "partial", "text": "", "is_final": False}
            new_pcm_bytes = full_pcm_bytes[self.processed_pcm_bytes:]
            self.processed_pcm_bytes = len(full_pcm_bytes)
        else:
            # Raw PCM sent directly from frontend AudioContext resampled to 16kHz
            new_pcm_bytes = _resample_pcm_to_16k(audio_bytes, self.sample_rate)

        if not new_pcm_bytes:
            return {"type": "partial", "text": "", "is_final": False}

        is_final = bool(self.recognizer.AcceptWaveform(new_pcm_bytes))

        if is_final:
            payload = json.loads(self.recognizer.Result())
            return {
                "type": "final",
                "text": _sanitize_transcript(payload.get("text", "")),
                "is_final": True,
            }

        payload = json.loads(self.recognizer.PartialResult())
        return {
            "type": "partial",
            "text": _sanitize_transcript(payload.get("partial", "")),
            "is_final": False,
        }

    def finalize(self) -> str:
        payload = json.loads(self.recognizer.FinalResult())
        return _sanitize_transcript(payload.get("text", ""))
