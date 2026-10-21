# Один образ: собранный фронт раздаёт сам FastAPI (как в .exe-сборке).

# ── 1. Сборка фронтенда ─────────────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Пустой VITE_API_URL — API на том же origin, что и страница
ENV VITE_API_URL=""
RUN npm run build

# ── 2. Backend ──────────────────────────────────────────────────────────────
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LMSSI_FRONTEND_DIST=/app/frontend_dist \
    UPLOAD_DIR=/data/uploads
WORKDIR /app

COPY backend/requirements.txt backend/requirements-postgres.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-postgres.txt

COPY backend/ ./
COPY --from=frontend /frontend/dist ./frontend_dist
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && mkdir -p /data/uploads

EXPOSE 8000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
