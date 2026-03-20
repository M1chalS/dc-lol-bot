#!/bin/sh
set -e

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ -f "$CERT_PATH" ]; then
    echo "[nginx] SSL certs found — starting in HTTPS mode"
    envsubst '$DOMAIN' < /etc/nginx/templates/nginx.https.conf > /etc/nginx/conf.d/default.conf
else
    echo "[nginx] SSL certs not found — starting in HTTP-only mode"
    echo "[nginx] To get certs run:"
    echo "  docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN} --email YOUR_EMAIL --agree-tos --no-eff-email"
    echo "  docker compose restart web"
    cp /etc/nginx/templates/nginx.http.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'