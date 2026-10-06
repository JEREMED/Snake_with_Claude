# Snake — règles du projet

## Règles impératives

- **Rien n'est installé sur l'hôte** : pas de npm, node ni python en local.
  Toute exécution (dev, tests, build) passe par `docker` / `docker compose`.
- **Aucune dépendance externe** : HTML + CSS + JavaScript (modules ES) + `<canvas>`.
  Pas de CDN, pas de paquet npm, pas de police ou image distante.
- **Langue** : commentaires, messages de commit et documentation en français.
- **Production** : le conteneur tourne en utilisateur non-root (image nginx-unprivileged).
- **Images Docker figées** : toujours un tag de version exact, jamais `latest` ni `alpine` seul.

## Architecture

- `src/game.js` : logique pure (état, déplacement, collisions, pommes). Aucun accès au DOM,
  aléatoire injecté → entièrement testable sous Node.
- `src/main.js` : rendu canvas, boucle de jeu, entrées clavier / tactile, localStorage.
- `src/index.html`, `src/style.css` : interface (aucun script ni style inline, à cause de la CSP).
- `tests/game.test.js` : tests `node:test`, sans dépendance.
- `nginx/default.conf` : configuration nginx **partagée** par le service dev et l'image de prod
  (en-têtes CSP, X-Content-Type-Options…).

## Commandes

```sh
docker compose run --rm test        # tests
docker compose up -d dev            # serveur de dev → http://localhost:8080
docker build -t snake:prod .        # image de production
```
