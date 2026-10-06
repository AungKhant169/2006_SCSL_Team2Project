# syntax=docker/dockerfile:1
FROM python:3.14-slim

# uv is a single static binary, so copy it from its official image instead of installing it.
# Keep the version in step with the setup-uv step in .github/workflows/ci.yml.
COPY --from=ghcr.io/astral-sh/uv:0.12.23 /uv /usr/local/bin/uv

# UV_LINK_MODE=copy: the cache mount below is a different filesystem from site-packages, so
# uv's default hardlinks would fail and fall back to copying with a warning.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Dependencies first so this layer is cached until requirements.txt changes. The cache mount keeps
# downloaded wheels between builds without adding them to the image.
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.txt

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
