# TİTCK listesi — https://github.com/tugcantopaloglu/turkish-medicine-api
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

ARG TITCK_API_REF=main
RUN git clone --depth 1 --branch "${TITCK_API_REF}" \
    https://github.com/tugcantopaloglu/turkish-medicine-api.git . \
    && npm install --omit=dev

RUN mkdir -p /app/data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=3000 \
    DOWNLOAD_PATH=/app/data \
    EXCEL_FILENAME=medicines.xlsx

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
