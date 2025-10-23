# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Monorepo with two independent apps:
  - apps/web: Next.js 16 (App Router under src/app), TypeScript, Tailwind CSS v4 via PostCSS, ESLint (eslint-config-next).
  - apps/api: FastAPI service (uvicorn), stubbed endpoints, permissive CORS for local dev.

Common commands
- Web (apps/web)
  - Install deps
    ```bash path=null start=null
    cd apps/web
    npm install
    ```
  - Dev server (http://localhost:3000)
    ```bash path=null start=null
    npm run dev
    ```
  - Build and start (production)
    ```bash path=null start=null
    npm run build
    npm run start
    ```
  - Lint (ESLint using eslint.config.mjs)
    ```bash path=null start=null
    npm run lint -- .
    ```
  - Type check (TypeScript strict, no emit)
    ```bash path=null start=null
    npx tsc --noEmit
    ```
  - Tests: not configured in this app (no jest/vitest config or test scripts).

- API (apps/api)
  - Create and activate venv (PowerShell)
    ```powershell path=null start=null
    cd apps/api
    python -m venv .venv
    .venv\Scripts\Activate.ps1
    ```
  - Install deps
    ```powershell path=null start=null
    pip install -r requirements.txt
    ```
  - Run dev server (uvicorn with reload; default http://127.0.0.1:8000)
    Note: the code lives in apps/api/app/main.py and there is no __init__.py; run from the app folder so the module import works.
    ```powershell path=null start=null
    cd app
    uvicorn main:app --reload --port 8000
    ```
  - Tests: not configured in this app (no pytest/uvicorn test setup present).

High-level architecture and structure
- Web (Next.js)
  - App Router with entrypoints in apps/web/src/app:
    - layout.tsx sets fonts (Geist) and global CSS, wraps all pages.
    - page.tsx is the home route placeholder.
  - TypeScript config (apps/web/tsconfig.json):
    - Strict mode, bundler moduleResolution, path alias "@/*" -> "./src/*".
  - ESLint (apps/web/eslint.config.mjs):
    - Uses eslint-config-next core-web-vitals and typescript presets; ignores build artifacts (.next, out, build, next-env.d.ts).
  - Styling: Tailwind v4 via PostCSS plugin defined in apps/web/postcss.config.mjs; global styles in src/app/globals.css.
  - Next.js config (apps/web/next.config.ts) is default; no custom webpack/runtime config.

- API (FastAPI)
  - apps/api/app/main.py defines the FastAPI application with the following JSON models and routes (all responses are stubbed for now):
    - POST /quiz/start -> QuizStartResponse: { quizId, sectionSeq[], state, difficultyTier }
    - POST /quiz/{quizId}/section/{section}/questions -> SectionQuestionsResponse: questions[] with fields { question_text, options[], correct_index, concept_tags[], difficulty_rating }
    - POST /quiz/response -> acknowledges a submitted QuizResponseIn
    - GET /leaderboard -> LeaderboardResponse: { weekId, globalBoard[], friendsBoard[] }
    - POST /intent -> returns { created, redirect }
    - GET /admin/stats -> AdminStats summary
  - CORS is wide-open for local development (allow_origins=["*"]).
  - Dependencies pinned in apps/api/requirements.txt (FastAPI, Uvicorn, Pydantic v2, Redis, Psycopg binary). No persistence layer wired yet.

Conventions and notes
- Run web and API in separate terminals; there is no root-level orchestration (no docker-compose, turbo, or npm workspace).
- For API imports, run uvicorn from apps/api/app due to lack of __init__.py; if you later add packages, adjust the module path accordingly (e.g., uvicorn app.main:app from apps/api).
- The web app can call the API at http://localhost:8000 during local dev; no environment variables are defined in this repo for API base URLs.
- There are no repository-wide lint/typecheck scripts; run tooling per-app as above.
