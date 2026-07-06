FROM python:3.11-slim

WORKDIR /app

# Sistem bağımlılıkları (libvips için)
RUN apt-get update && apt-get install -y \
    libvips-dev \
    libvips \
    libvips-tools \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Bağımlılıklar önce (cache optimizasyonu)
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=300 --retries=5 -r requirements.txt

# Uygulama kodu
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
