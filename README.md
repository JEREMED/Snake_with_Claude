# Snake

Jeu Snake en 2D dans le navigateur : HTML, CSS, JavaScript (modules ES) et `<canvas>`,
**sans aucune dépendance**. Le développement, les tests et le service passent **uniquement par Docker**.

## Fonctionnalités

- Grille 20x20, serpent en dégradé de vert, tête avec des yeux, pommes rouges.
- Score et meilleur score (sauvegardé dans le `localStorage` du navigateur).
- La vitesse augmente un peu toutes les 5 pommes.
- Game Over en cas de collision avec un mur ou avec soi-même ; victoire si la grille est pleine.
- Contrôles : flèches, ZQSD, WASD ; `Espace` = pause ; swipe sur mobile.
  Le demi-tour instantané est interdit et les changements rapides sont mis en file.
- Pause automatique quand l'onglet est masqué.

## Prérequis

Docker Engine et Docker Compose. Rien d'autre à installer.

## Développement

```sh
docker compose up -d dev      # http://localhost:8080
docker compose logs -f dev
docker compose down
```

`./src` est monté en lecture seule : modifiez les fichiers puis rechargez la page.

## Tests

```sh
docker compose run --rm test
```

Les tests (`tests/game.test.js`) utilisent `node:test` et portent sur la logique pure (`src/game.js`).

## Production

```sh
docker build -f Dockerfile.vercel -t snake:prod .
docker run -d --rm -p 8081:8080 --name snake-prod snake:prod   # http://localhost:8081
docker inspect --format '{{.State.Health.Status}}' snake-prod  # état du HEALTHCHECK
docker stop snake-prod
```

L'image repose sur `nginxinc/nginx-unprivileged` (utilisateur non-root, uid 101), écoute
sur le port 8080 et envoie des en-têtes de sécurité (CSP, `X-Content-Type-Options`…).

## Déploiement

Le déploiement est entièrement piloté par GitHub Actions (`.github/workflows/ci-cd.yml`) :
`vercel.json` désactive les déploiements Git de Vercel, seul le CI déploie.

```
push / PR sur main ──┬─► tests  : docker compose run --rm test
                     │
                     └─► image  : build de Dockerfile.vercel, docker run,
                                  curl sur la page + vérification uid ≠ root
                                    │
        (push sur main uniquement)  ▼
                        deploy : conteneur node:22.23.3-alpine3.24, CLI vercel figé
                                 vercel deploy --prod ──► Vercel construit et exécute
                                                          Dockerfile.vercel (port 8080)
                                    │
                                    ▼
                        smoke test curl sur l'URL + URL dans le résumé du job
```

Les pull requests exécutent `tests` et `image`, sans déployer. Le workflow peut aussi être lancé
à la main (`workflow_dispatch`) ; il ne déploie que s'il s'agit d'un push sur `main`.

### Secrets GitHub nécessaires

À créer dans *Settings → Secrets and variables → Actions* du dépôt :

| Secret              | Origine                                                                 |
|---------------------|-------------------------------------------------------------------------|
| `VERCEL_TOKEN`      | vercel.com → *Account Settings → Tokens*                                |
| `VERCEL_ORG_ID`     | `orgId` de `.vercel/project.json` (créé par `vercel link`) : **Team ID** (`team_…`) si le projet appartient à une équipe, User ID (`user_…`) seulement pour un projet personnel |
| `VERCEL_PROJECT_ID` | `projectId` du même fichier                                             |

`vercel link` peut être lancé sans rien installer :
`docker run --rm -it -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD:/app" -w /app node:22.23.3-alpine3.24 npx --yes vercel@62.4.0 link`.
Le dossier `.vercel/` est ignoré par Git ; aucun secret ne doit être commité.

Côté Vercel, le projet doit définir la variable `PORT=8080` (l'image écoute sur 8080 en non-root).

## Structure

```
src/
  index.html     page du jeu
  style.css      thème sombre, responsive
  game.js        logique pure (sans DOM), testable
  main.js        rendu canvas, boucle de jeu, clavier / tactile
  favicon.svg
tests/
  game.test.js   tests node:test
nginx/
  default.conf   conf nginx commune au dev et à la prod
docker-compose.yml   services dev (nginx) et test (node, profil « test »)
Dockerfile.vercel    image de production (déployée sur Vercel)
vercel.json          désactive les déploiements Git de Vercel (seul le CI déploie)
.github/workflows/   pipeline CI/CD (tests, image, déploiement)
package.json         uniquement "type": "module" pour Node (aucune dépendance)
```

Les versions des images Docker sont figées (`nginx:1.31.6-alpine3.24`,
`nginxinc/nginx-unprivileged:1.31.6-alpine3.24`, `node:22.23.3-alpine3.24`).
