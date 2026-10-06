# Snake — règles du projet

## Règles impératives

- **Rien n'est installé sur l'hôte** : pas de npm, node ni python en local.
  Toute exécution (dev, tests, build) passe par `docker` / `docker compose`.
- **Aucune dépendance externe** : HTML + CSS + JavaScript (modules ES) + `<canvas>`.
  Pas de CDN, pas de paquet npm, pas de police ou image distante.
- **Langue** : commentaires, messages de commit et documentation en français.
- **Production** : le conteneur tourne en utilisateur non-root (image nginx-unprivileged).
- **Images Docker figées** : toujours un tag de version exact, jamais `latest` ni `alpine` seul.
- **Jamais de secret dans le code ni dans les commits** (tokens, clés SSH, `.env`, `.vercel/`) :
  les identifiants de déploiement vivent uniquement dans les secrets GitHub Actions.

## Architecture

- `src/game.js` : logique pure (état, déplacement, collisions, pommes). Aucun accès au DOM,
  aléatoire injecté → entièrement testable sous Node.
- `src/main.js` : rendu canvas, boucle de jeu, entrées clavier / tactile, localStorage (record, langue, difficulté).
- `src/i18n.js` : textes FR / EN, module pur. Tout texte visible passe par `t()` ou un attribut `data-i18n`.
- `src/sound.js` : sons synthétisés (Web Audio API), aucun fichier audio.
- `src/index.html`, `src/style.css` : interface (aucun script ni style inline, à cause de la CSP).
- `tests/*.test.js` : tests `node:test`, sans dépendance (logique du jeu, traductions).
- `nginx/default.conf` : configuration nginx **partagée** par le service dev et l'image de prod
  (en-têtes CSP, X-Content-Type-Options…).
- `Dockerfile.vercel` : source unique de l'image de prod, construite par le CI et déployée par Vercel.
- `vercel.json` : déploiements Git de Vercel désactivés, seul le CI déploie.
- `.github/workflows/ci-cd.yml` : tests → image → déploiement Vercel (push sur `main`).

## Commandes

```sh
docker compose run --rm test        # tests
docker compose up -d dev            # serveur de dev → http://localhost:8080
docker build -f Dockerfile.vercel -t snake:prod .   # image de production (déployée par Vercel)
```
