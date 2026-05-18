#!/bin/sh
set -e

echo "⏳ Waiting for database (postgres_ai) to be ready..."
python -c "
import socket
import time
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
while True:
    try:
        s.connect(('postgres_ai', 5432))
        s.close()
        print('Database port is open!')
        break
    except socket.error:
        time.sleep(1)
"

echo "🔄 Running database migrations..."
alembic upgrade head

echo "🚀 Starting FastAPI AI Agent Service..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000
