# VitalForce AI - Technical Documentation

## Overview

VitalForce AI helps homeopathic doctors manage patients, schedule appointments, capture consultations, and use Gemini-powered assistance for symptom extraction, repertorization, and Materia Medica search.

## Architecture

- **Frontend:** Next.js App Router, React 19, Tailwind CSS, shadcn/base-ui components, TanStack Query, Firebase Auth.
- **Backend:** Flask app factory, SQLAlchemy ORM, Alembic migrations, SQLite for the current RDBMS.
- **Caching:** Redis caches Gemini-heavy AI responses by normalized payload hash and cache version.
- **Authentication:** The frontend signs in with Firebase Google Auth. The backend verifies Firebase ID tokens and scopes all data by doctor ID.

## Backend Modules

- `app/api/v1` exposes JSON endpoints for health, dashboard, patients, consultations, appointments, and AI.
- `app/models` contains relational doctor, patient, consultation, and appointment models.
- `app/repositories` centralizes scoped SQLAlchemy query helpers.
- `app/services` owns Firebase token verification, Gemini calls, and Redis cache access.
- `migrations/` contains the Alembic schema history.

## Frontend Modules

- `src/app` contains the Next.js route tree and providers.
- `src/components` contains reusable app shell and UI primitives.
- `src/features` contains feature-level pages for dashboard, patients, calendar, consultations, and Materia Medica.
- `src/lib/api` contains typed API clients and DTOs.
- `src/hooks` contains shared auth and error handling hooks.

## Data Flow

1. The doctor signs in with Google through Firebase Auth.
2. Next.js requests include a Firebase ID token in the `Authorization` header.
3. Flask verifies the token, upserts the doctor, and scopes records to that doctor.
4. SQLite stores patients, consultations, and appointments through SQLAlchemy.
5. Redis caches Gemini responses for repeated AI requests.
6. The frontend uses mutation-driven refetches and light polling instead of Firestore realtime listeners.
