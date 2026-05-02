# VitalForce AI

VitalForce AI is a modular homeopathic advisor for doctors. The app is split into a Flask backend and a Next.js frontend, with Redis caching, SQLite persistence, and backend-managed JWT authentication.

## Structure

- `backend/` - Flask API, SQLAlchemy models, Alembic migrations, Redis-backed AI cache, and JWT auth endpoints.
- `frontend/` - Next.js App Router UI with local session handling and API-driven feature modules.
- `docker-compose.yml` - Local stack for frontend, backend, Redis, and SQLite volume.

## Run Locally

1. Copy `.env.example` to `.env` and set `DEEPSEEK_API_KEY`.
2. Set a strong `SECRET_KEY` for JWT signing.
3. Start the stack:

```bash
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:5000/api/v1/health`

Create a doctor account from the sign-in screen the first time you open the frontend.

## Direct Commands

```bash
python3 -m pip install -r backend/requirements.txt
npm install
npm run test:backend
npm run lint:frontend
npm run build:frontend
```
