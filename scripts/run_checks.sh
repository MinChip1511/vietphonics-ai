#!/bin/bash
# All checks that need neither the model nor a browser. Run from anywhere:  scripts/run_checks.sh
# (Browser smoke test, with both servers running:  node scripts/smoke_ui.js)
set -e
cd "$(dirname "$0")/.."
PY=backend/venv/bin/python

echo "== Python: static check"
$PY -m pyflakes backend/app scripts/*.py

echo "== Python: unit and API tests"
for t in alignment verification audio_quality api production; do
  echo "-- test_$t"
  nice -n 10 $PY scripts/test_$t.py 2>&1 | grep -v "Deprecat\|from starlette" | tail -3
  test "${PIPESTATUS[0]}" -eq 0
done

echo "== Frontend: lint and production build"
(cd frontend && npm run lint --silent && npm run build --silent)

echo "== Deployment files"
$PY -c "import json; json.load(open('frontend/vercel.json')); print('vercel.json ok')"
$PY -c "import re; s=open('render.yaml').read(); assert 'healthCheckPath: /api/health' in s and 'MONGODB_URI' in s and 'mountPath' not in s; print('render.yaml ok')"

echo "All checks passed."
