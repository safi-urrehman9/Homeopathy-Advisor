# VitalForce AI

VitalForce AI is a modular homeopathic advisor for doctors. The app is now split into a Flask backend and a Next.js frontend, with Redis caching and SQLite persistence.

## Structure

- `backend/` - Flask API, SQLAlchemy models, Alembic migrations, Redis-backed AI cache, Firebase token verification.
- `frontend/` - Next.js App Router UI with Firebase Google login and API-driven feature modules.
- `docker-compose.yml` - Local stack for frontend, backend, Redis, and SQLite volume.

## Run Locally

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Configure Firebase Admin credentials for backend token verification using application default credentials or `GOOGLE_APPLICATION_CREDENTIALS`.
3. Start the stack:

```bash
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:5000/api/v1/health`

## Direct Commands

```bash
python3 -m pip install -r backend/requirements.txt
npm install
npm run test:backend
npm run lint:frontend
npm run build:frontend
```
