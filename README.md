<div align="center">

# Invera AI Interview Practice Platform

**A full-stack interview practice platform for mock sessions, scoring, profile management, Q&A, billing, and admin operations.**

<p>
  <img src="https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=0B0F19" alt="React 18" />
  <img src="https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p>
  <img src="https://img.shields.io/badge/UI-shadcn%2Fui-111111?style=flat-square&logo=shadcnui&logoColor=white" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/Styling-Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Data-React_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white" alt="React Query" />
  <img src="https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Payments-VNPay-0055A4?style=flat-square&logoColor=white" alt="VNPay" />
</p>

</div>

---

## Overview

Invera is built for advanced interview preparation workflows that heavily emphasize **Video Interview Mode**. The platform combines user authentication, real-time webcam telemetry, live speech-to-text (STT) parsing via Vosk, AI-driven answer scoring (powered by DeepSeek), profile file handling, subscription plans, and an admin system for question-bank operations.

The repository is organized as a full-stack application:

- `FE/` contains the Vite + React SPA with real-time video interview components.
- `BE/` contains the FastAPI backend, deep learning services, and database migrations.
- `scripts/` contains local bootstrap and deployment helpers.
- `deploy/` contains systemd and cloudflared templates for running the stack.

## What This Project Includes

- Public landing pages and product pages.
- Email/password auth plus OAuth callback flow.
- Email verification and password reset flow.
- Interview session creation, session history, and detail views.
- **Full-screen Video Interview Room** with real-time STT, TTS, and webcam telemetry hooks.
- **AI Scoring & Feedback** using DeepSeek models to evaluate candidate responses.
- Q&A module and DOCX export support.
- Profile avatar and resume upload management.
- Plan tiers, VNPay billing flow, and upgrade pages.
- **Admin Dashboard** for managing video sessions, user telemetry, revenue, and question-banks.

## Product Flow

The frontend routes show the core user journey clearly:

- Public pages: `/`, `/about`, `/contact`, `/privacy`, `/terms`
- Auth flow: `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/oauth/callback`
- App flow: `/app`, `/app/new`, `/app/sessions`, `/app/sessions/:id`, `/app/interview/:id`, `/app/profile`, `/app/qna`, `/app/settings`, `/app/upgrade`
- Admin flow: `/admin`, `/admin/questions`, `/admin/access`, `/admin/sessions`, `/admin/users`, `/admin/revenue`

## The Backend API

The backend exposes feature areas under `/api`:

- `auth`
- `sessions`
- `meetings`
- `profile`
- `qna`
- `billing`
- `admin`
- `telemetry`

## Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- React Router
- TanStack React Query
- React Hook Form
- MediaPipe Tasks Vision (Webcam Telemetry)
- Zod & Recharts

### Backend

- FastAPI
- Uvicorn
- asyncpg (PostgreSQL)
- Vosk (Speech-to-Text)
- DeepSeek Client Integration
- python-jose & passlib
- python-dotenv
- httpx
- python-docx

## Architecture

Invera is structured as a single deployable product with a separate SPA frontend and API backend:

- `BE/app/main.py` wires the FastAPI app, middleware, CORS, OpenAPI, route registration, and static frontend serving.
- `BE/migrations/*.sql` are applied automatically on backend startup.
- `FE/src/lib/api.ts` handles token-aware API requests, session expiry handling, and file downloads.
- `FE/src/App.tsx` defines the public, authenticated, and admin routing layers.
- Built frontend assets from `FE/dist` can be served directly by the backend in deployed environments.

## Project Structure

```text
.
├── BE/
│   ├── app/
│   │   ├── api/endpoints/
│   │   ├── core/
│   │   ├── db/
│   │   ├── schemas/
│   │   └── services/ (DeepSeek, STT, TTS, Telemetry)
│   ├── migrations/
│   └── tests/
├── FE/
│   ├── public/
│   ├── src/
│   │   ├── components/ (Interview, Landing, Admin)
│   │   ├── contexts/
│   │   ├── hooks/ (useCameraPreview)
│   │   ├── lib/
│   │   └── pages/
│   └── package.json
├── deploy/
└── scripts/
```

## Quick Start

### 1. Backend setup

Requirements:

- Python 3.10+
- PostgreSQL
- A working Python environment or conda environment

Install backend dependencies:

```bash
./scripts/bootstrap_backend.sh
```

Create `BE/.env` with a minimum local setup (refer to `.env.example`):

```bash
API_PREFIX=/api
BACKEND_HOST=127.0.0.1
BACKEND_PORT=9000
PG_HOST=127.0.0.1
PG_PORT=5432
PG_DBNAME=invera
PG_USER=postgres
PG_PASSWORD=postgres
SECRET_KEY=change-me
```

Run the backend:

```bash
cd BE
python -m uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
```

### 2. Frontend setup

```bash
cd FE
npm install
npm run dev
```

By default the frontend talks to `/api`. Override with `VITE_API_BASE_URL` if needed.

## Scripts

### Frontend

```bash
cd FE
npm run dev
npm run build
npm run test
npm run lint
```

### Project helpers

```bash
./scripts/bootstrap_backend.sh
./scripts/publish_frontend.sh
./scripts/inveractl up
./scripts/inveractl status
./scripts/inveractl logs
./scripts/inveractl smoke
```

## Environment Variables

Important backend variables:

- `API_PREFIX`
- `BACKEND_HOST`
- `BACKEND_PORT`
- `FRONTEND_URL`
- `API_URL`
- `PG_HOST`
- `PG_PORT`
- `PG_DBNAME`
- `PG_USER`
- `PG_PASSWORD`
- `SECRET_KEY`
- `ALGORITHM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SMTP_*`
- `VNPAY_*`
- `DEEPSEEK_API_KEY`

## API Docs

Once the backend is running:

- Swagger UI: `http://127.0.0.1:9000/api/docs`
- OpenAPI JSON: `http://127.0.0.1:9000/api/openapi.json`
- Health check: `http://127.0.0.1:9000/healthz`

## Deployment Notes

- The backend can serve the compiled frontend bundle from `FE/dist`.
- Public uploads are served from `/media`.
- `deploy/systemd/user/` contains user-level service templates.
- `deploy/cloudflared/` contains tunnel config templates for public exposure.

## Testing

Backend tests are located in `BE/tests/`.

Frontend tests are available through Vitest:

```bash
cd FE
npm run test
```

## Why This Repo Reads Well on GitHub

This repository is organized as a production-style full-stack application rather than a classroom prototype. The separation between frontend, backend, migrations, services, and deployment scripts makes it easy to extend into a hosted product or portfolio-grade showcase.
