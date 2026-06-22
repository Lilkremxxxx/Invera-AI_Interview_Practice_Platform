# Invera Backend (BE)

## Overview
This is the backend service for the **Invera AI Interview Practice Platform**, heavily optimized for **Video Interview Mode**. It provides the core APIs for real-time speech-to-text (STT), text-to-speech (TTS), AI scoring, and session telemetry.

## Key Features
- **FastAPI Framework**: High-performance async API.
- **Video Interview Core**: Real-time STT capabilities built using Vosk and advanced transcript cleanup algorithms.
- **AI Evaluation**: Integration with DeepSeek and LLM providers for real-time answer scoring, feedback, and Q&A generation.
- **Telemetry & Analytics**: Comprehensive logging of user answers, interaction telemetry, and video interview performance metrics.
- **Admin Endpoints**: Secure routes for managing questions, sessions, and system telemetry.

## Tech Stack
- **Python 3.10+**
- **FastAPI** & **Uvicorn**
- **PostgreSQL** (via asyncpg)
- **Vosk** (for Speech-to-Text)
- **Pydantic**, **Pytest**

## Installation & Running

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Setup environment variables (refer to `.env.example`).
   - For Google sign-in, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - The Google OAuth callback URL should be:
     `https://invera.pp.ua/api/auth/oauth/google/callback`
   - In local development, point the callback to your local API URL instead.
3. Run migrations and start the server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Testing
Run the test suite using pytest:
```bash
pytest tests/
```
