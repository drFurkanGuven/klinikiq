#!/bin/sh
set -e
cd /app

if [ ! -f /app/data/medicines.xlsx ]; then
  echo "[titck-medicine-api] medicines.xlsx yok; TİTCK indiriliyor (birkaç dakika sürebilir)..."
  npm run download
fi

echo "[titck-medicine-api] Sunucu başlıyor (PORT=${PORT})..."
exec npm start
