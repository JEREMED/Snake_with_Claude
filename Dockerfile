# Image de production : nginx en utilisateur non-root (uid 101), port 8080.
FROM nginxinc/nginx-unprivileged:1.31.6-alpine3.24

# Même configuration nginx que le service de dev (en-têtes CSP, nosniff…).
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Fichiers statiques du jeu, propriété de root : lisibles mais non modifiables par nginx.
COPY src/ /usr/share/nginx/html/

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
