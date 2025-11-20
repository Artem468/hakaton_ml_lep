# Stage 1: Builder
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --prefix=/install --no-cache-dir -r requirements.txt


# Stage 2: Final
FROM python:3.12-slim
WORKDIR /app

# ---- OpenCV / Ultralytics Dependencies for Debian 13 (Trixie) ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*
# ------------------------------------------------------------------

COPY --from=builder /install /usr/local
COPY . .

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["gunicorn", "ml_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
