#!/bin/bash

echo "Starting FiveBot Full Stack Application..."
echo

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if npm exists
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[1/2] Starting Backend Server..."
cd "$SCRIPT_DIR/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Start backend in background
npm run start:dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

echo "[2/2] Starting Frontend Server..."
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

echo
echo "✅ All services are starting..."
echo
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Dashboard: http://localhost:3000/dashboard"
echo "🤖 Bots: http://localhost:3000/bots"
echo
echo "Press Ctrl+C to stop all services..."

# Wait for Ctrl+C
trap 'echo "Stopping all services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT

# Keep script running
wait