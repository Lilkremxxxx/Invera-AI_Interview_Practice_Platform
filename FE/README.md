# Invera Frontend (FE)

## Overview
This is the frontend application for the **Invera AI Interview Practice Platform**. Built to deliver a seamless **Video Interview Mode** experience, it leverages modern React patterns and real-time media handling to simulate realistic interview environments.

## Key Features
- **Video Interview Experience**: Advanced UI/UX supporting real-time camera previews (`useCameraPreview` hooks) and webcam telemetry.
- **Interactive Dashboards**: Comprehensive candidate dashboard for tracking past sessions, scores, and improvements.
- **Admin Portal**: Extensive management tools including Revenue tracking, Session audits, User management, and Question Bank controls.
- **Modern UI Components**: Styled with TailwindCSS and Shadcn UI (Radix UI primitives).

## Tech Stack
- **React 18** + **TypeScript**
- **Vite** (Build Tool)
- **TailwindCSS** + **Shadcn UI**
- **React Router** & **React Query** (TanStack)
- **MediaPipe Tasks Vision** (for advanced webcam telemetry & tracking)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Testing
The application uses Vitest and React Testing Library for comprehensive component and integration testing:
```bash
npm run test
```
