#!/bin/bash

# VietPhonics AI - Startup Script
echo "=================================================="
echo "🚀 Khởi động VietPhonics AI (Frontend + Backend)"
echo "=================================================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Start Backend API
echo "Starting Backend API on http://127.0.0.1:8000 ..."
cd "$PROJECT_DIR"
backend/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# 2. Start Frontend Dev Server
echo "Starting Frontend on http://127.0.0.1:5173 ..."
cd "$PROJECT_DIR/frontend"
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

echo "=================================================="
echo "✅ Hệ thống VietPhonics AI đã sẵn sàng!"
echo "👉 Mở trình duyệt tại: http://127.0.0.1:5173/"
echo "👉 API Backend:        http://127.0.0.1:8000/api/health"
echo "👉 Nhấn Ctrl+C để dừng cả 2 server."
echo "=================================================="

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
