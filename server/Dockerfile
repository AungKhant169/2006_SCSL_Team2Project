# syntax=docker/dockerfile:1
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first so this layer is cached until requirements.txt changes.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# Run as an unprivileged user. The SQLite database lives on a volume at /data.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin app \
    && mkdir /data \
    && chown app /data
USER app

ENV DATABASE_URL=sqlite:////data/main.db
VOLUME /data

# SECRET_KEY and FRONTEND_ORIGIN are required at run time (see the compose file).
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/', timeout=2)" || exit 1

# Apply database migrations, then serve. A single worker is required: refresh tokens are held in
# process memory.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
