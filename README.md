# TransLight Solar Quiz (MVP)

Mobile-first web app: 10-question adaptive solar quiz with leaderboard and referral share.

## Tech
- Frontend: Next.js 14 (App Router) + Tailwind + Zustand
- API: FastAPI (Python 3.11)
- DB: PostgreSQL 15, Cache: Redis 7
- Hosting: Web → Vercel, API → Render/Fly.io

## Local Dev (Windows)
```bash
# from project root
copy .env.example .env
# start infra
docker compose up -d

# frontend
cd apps/web && npm run dev

# api (requires Python 3.11+)
cd ../../apps/api
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Env Vars
See `.env.example`. Do not commit real secrets.

## Endpoints (stubbed)
- POST /quiz/start
- POST /quiz/:quizId/section/:section/questions
- POST /quiz/response
- GET /leaderboard
- POST /intent
- GET /admin/stats

## Next Steps
- Wire NextAuth (email + Google)
- Implement Redis timer locks and repetition checks
- Connect DB via Prisma (or Prisma for Next.js + SQLAlchemy for API)
- Implement leaderboard and shareable rank-card
# solar-quiz-translight
