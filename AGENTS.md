# Repository Guidelines

## Project Structure & Module Organization

- `frontend/src/` contains the React/Vite application: `views/` for screens, `components/` for reusable UI, `services/` for API/audio integrations, and `data/` for UI labels and plan presentation text (lessons, prices and rewards come from the backend).
- `backend/app/` contains the FastAPI API, MongoDB access, accounts and admin routes, audio features, alignment logic, and PAPL-NCCF model code.
- `scripts/` contains the Python tests, `run_checks.sh` and the Playwright smoke test `smoke_ui.js`. Deployment files: `render.yaml`, `backend/Dockerfile`, `frontend/vercel.json`, `docs/DEPLOY.md`. Root-level `.pt`, `vocab.json`, and training artifacts support the AI backend.
- Keep generated folders and local environments out of commits: `frontend/node_modules/`, `frontend/dist/`, `backend/venv/`, `__pycache__/`, and local databases.

## Build, Test, and Development Commands

From the repository root, `./start_vietphonics.sh` starts FastAPI on port 8000 and Vite on port 5173. For isolated work:

```bash
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
backend/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
scripts/run_checks.sh
node scripts/smoke_ui.js
```

Use `npm run preview` in `frontend/` to serve the production build locally. The Playwright scripts expect the frontend and backend to be running.

## Coding Style & Naming Conventions

Use two-space indentation in JavaScript/JSX and standard PEP 8-style Python. Name React components and files in PascalCase (`SubscriptionView.jsx`), JavaScript functions and variables in camelCase, and Python functions/fields in snake_case. Prefer existing Tailwind utility classes and the project’s existing component patterns. Run Oxlint before submitting frontend changes.

## Testing Guidelines

There is no unit-test framework configured. Use `npm run build` and `npm run lint` for frontend validation, then run `scripts/run_checks.sh` and `node scripts/smoke_ui.js`. UI changes should include a browser check at desktop and mobile widths when practical.

## Commit & Pull Request Guidelines

No Git history is currently available, so use concise imperative commits such as `Add subscription pricing view` or `Fix audio fallback`. Pull requests should explain the behavior change, list validation commands, note configuration or database changes, and include screenshots for visual updates. Keep frontend and backend changes separated when they can be reviewed independently.

## Security & Configuration Tips

Do not commit credentials, `.env` files, virtual environments, or production databases. Configure API URLs and deployment secrets through environment variables. Treat uploaded audio and child progress data as sensitive; validate CORS and persistence settings before production deployment.
