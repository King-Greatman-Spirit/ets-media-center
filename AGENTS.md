# ETS Media Command Center — Agent Guide

Stack: React 19 + TanStack Router/Start + Vite 8 + Tailwind 4 + shadcn/ui | FastAPI + SQLAlchemy + Postgres (Supabase) + Celery/Redis

## Commands
- Frontend: `npm install` → `npm run dev` (http://localhost:5173), `npm run build`
- Backend: `cd backend && pip install -r requirements.txt && PYTHONPATH=app uvicorn app.main:app --reload` (http://localhost:8000/docs)
- Workers: `PYTHONPATH=app celery -A workers.media_engine worker --loglevel=info`
- Docker: `docker-compose up --build`

## Project rules
- Brand: End Time Soldiers — Raising bold believers ⚔️ — https://linktr.ee/endtimesoldiers
- Never invent Bible verses; verify scripture; distinguish Scripture from preacher statements.
