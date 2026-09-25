# End Time Soldiers — Media Command Center

> ⚔️ Raising Bold Believers — AI-powered content engine for End Time Soldiers Christian ministry

[![End Time Soldiers](https://img.shields.io/badge/ETS-Command%20Center-informational)](https://github.com/King-Greatman-Spirit/ets-media-center)

## Overview

The ETS Media Command Center is a full-stack application that automates the entire content pipeline for End Time Soldiers ministry. It transforms raw video/audio into platform-optimized content across 8+ platforms, schedules it, manages approval, publishes it, and tracks performance.

## Features

- **Media Library** — Upload videos, images, and audio with AI auto-analysis
- **AI Studio** — Generate platform-optimized content with GPT-4o
- **Autonomous Agents** — Self-running AI agents for repurpose, schedule, publish, analyze, and scout
- **DA/BI Analytics** — KPI tracking, engagement analytics, AI insights
- **Smart Calendar** — 3 posts/day at 6AM, 12PM, 6PM across all platforms
- **Platform Connections** — Connect YouTube, TikTok, Instagram, Facebook, X, Threads, LinkedIn, Telegram
- **Approval Workflow** — 3-tier content review before publishing
- **Scripture Verification** — Automatic Bible reference checking
- **Brand Compliance** — Enforces Christian ministry content standards

## Architecture

```
┌─────────────────────────────────────────────┐
│  FRONTEND (React 19 + TanStack Router)      │
│  ├── Dashboard ├── Library ├── AI Studio    │
│  ├── Calendar ├── DA/BI ├── Agents          │
│  ├── Connections └── User Guide             │
├─────────────────────────────────────────────┤
│  BACKEND (FastAPI + PostgreSQL)             │
│  ├── Models ├── Schemas ├── Services        │
│  ├── API Routes ├── Workers ├── AI Engine   │
├─────────────────────────────────────────────┤
│  AI/ML                                      │
│  ├── GPT-4o Content Generation              │
│  ├── Whisper Transcription                  │
│  ├── Vector Embeddings (pgvector)           │
│  └── Autonomous Agent System                │
├─────────────────────────────────────────────┤
│  INFRASTRUCTURE                             │
│  ├── Supabase (Database + Storage + Auth)   │
│  ├── Redis + Celery (Task Queue)            │
│  ├── FFmpeg (Video Processing)              │
│  └── Docker + Docker Compose                │
└─────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker + Docker Compose
- FFmpeg installed
- Supabase account

### Install & Run

```sh
git clone https://github.com/King-Greatman-Spirit/ets-media-center.git
cd ets-media-center

# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Workers
cd backend && celery -A workers.media_engine worker --loglevel=info

# Or use Docker
docker-compose up --build
```

### Access
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Project Structure

```
ets-media-center/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Config, security, exceptions
│   │   ├── db/           # Database session
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── workers/      # Background tasks
│   ├── alembic/          # Database migrations
│   ├── requirements.txt
│   └── pyproject.toml
├── src/                  # React frontend source
│   ├── components/       # UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── app/          # AppShell, PageHeader, UserGuide
│   │   ├── brand/        # ETS branding
│   │   └── ...
│   ├── lib/              # Data, AI, platforms
│   ├── store/            # Zustand state management
│   ├── hooks/            # Custom React hooks
│   ├── routes/           # TanStack Router pages
│   └── integrations/     # Supabase client
├── supabase/             # Supabase config & migrations
├── frontend/             # Vite + React config
├── shared/               # Shared types & constants
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose
└── .env.example          # Environment variables
```

## Development

### Frontend
```sh
cd frontend
npm install
npm run dev
```

### Backend
```sh
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Database
```sh
# Run migrations
cd backend
alembic upgrade head

# Generate new migration
alembic revision --autogenerate -m "message"
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `uvicorn main:app` | Start backend API |
| `celery worker` | Start background workers |
| `docker-compose up` | Start everything with Docker |

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** (file-based routing)
- **TanStack Query** (data fetching)
- **shadcn/ui** components
- **Tailwind CSS** v4
- **Zustand** (state management)

### Backend
- **FastAPI** (Python)
- **PostgreSQL** with **pgvector**
- **SQLAlchemy** + **Alembic**
- **Celery** + **Redis** (task queue)
- **OpenAI GPT-4o** (AI)
- **Whisper** (transcription)

### Infrastructure
- **Supabase** (Database, Storage, Auth)
- **Docker** + **Docker Compose**
- **FFmpeg** (video processing)

## Brand

| Attribute | Value |
|-----------|-------|
| Name | End Time Soldiers |
| Handle | @KingdomArmyTV |
| Tagline | Raising bold believers ⚔️ |
| Description | Sermons, teachings & inspiration to strengthen your walk with Christ |
| Link | https://linktr.ee/endtimesoldiers |
| Colors | Obsidian (#0A0A0A), Gold (#D4AF37), White, Deep Red (#8B0000) |

## Core Principles

```
TRUTH → CHRIST → EDIFICATION → REACH → ENGAGEMENT → KINGDOM IMPACT
```

- Never use deception, fear, or controversy
- Never invent Bible verses or quotes
- Always verify Scripture references
- Always distinguish Scripture from preacher statements
- Content approved for sensitive topics before publishing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

All rights reserved — End Time Soldiers Ministry

---

**End Time Soldiers** | **Raising Bold Believers ⚔️**
**Link:** https://linktr.ee/endtimesoldiers
