# Plan de Réalisation - Test Technique DevOps (LMT Group)

## Contexte & Objectif
Industrialiser le cycle de vie et la livraison de l'application Node.js/PostgreSQL `devops-articles-api` pour le test technique DevOps LMT Group.
Les livrables seront déployés sur un dépôt public GitHub avec GitHub Actions pour le pipeline CI/CD et GitHub Container Registry (GHCR) pour le stockage d'images Docker.

---

## Architecture & Découpage des Phases

### Phase 0 : Initialisation & Reconnaissance
- Reconstituer l'arborescence complète dans `./devops-articles-api/` :
  - `package.json` & `package-lock.json`
  - `src/server.js` & `src/database.js`
  - `tests/api.test.js` (suite de tests unitaires/intégration Jest + Supertest pour `/health` et validation)
  - `.env` local pour le développement
- Vérifier la configuration, les dépendances (`dotenv`, `pg`, `express` bien en dependencies de production), les versions Node (Node 22 recommandé).
- Initialiser le dépôt Git local avec la branche par défaut (`main`).

### Phase 1 : Hygiène Git & Branche Dédiée
- Créer la branche de travail DevOps : `feature/devops-pipeline`.
- Configurer `.gitignore` (exclusion de `node_modules/`, `.env`, logs, etc.) et `.env.example` avec valeurs fictives documentées.
- Vérifier qu'aucun fichier sensible ou lourd n'est suivi par Git.
- Commit conventionnel : `chore(git): ignore node_modules, env files and logs; add .env.example`.

### Phase 2 : Conteneurisation (Dockerfile Multi-stage & .dockerignore)
- Créer `.dockerignore`.
- Créer un `Dockerfile` multi-stage sécurisé :
  - Étape 1 `deps` : installation des dépendances de production (`npm ci --omit=dev`).
  - Étape 2 `runner` : image allégée `node:22-alpine`, exécution sous utilisateur non-root `USER node`, exposition du port 3000, `HEALTHCHECK` HTTP sur `/health`.
- Commit conventionnel : `feat(docker): add multi-stage Dockerfile and .dockerignore`.

### Phase 3 : Orchestration Locale (docker-compose.yml)
- Créer `docker-compose.yml` déclarant :
  - Service `db` : image PostgreSQL 16 Alpine avec volume persistant `pgdata` et healthcheck `pg_isready`.
  - Service `api` : build local avec dépendance conditionnelle `depends_on: db: condition: service_healthy`, variables d'environnement adaptées (`DB_HOST=db`).
- Validation syntaxique et tests des endpoints.
- Commit conventionnel : `feat(docker): add docker-compose with PostgreSQL and healthchecks`.

### Phase 4 : Pipeline CI/CD GitHub Actions (Build & Push GHCR)
- Créer `.github/workflows/ci.yml` :
  - Trigger sur tout `push` vers `feature/devops-pipeline`.
  - Job `build-and-push` : authentification à `ghcr.io` via `${{ secrets.GITHUB_TOKEN }}`, construction et publication de l'image taguée avec le commit SHA et le nom de branche.
- Commit conventionnel : `ci: build and push Docker image to GHCR`.

### Phase 5 : Job de Déploiement & Smoke Test sur le Runner
- Ajouter le job `deploy-local` dans le workflow GitHub Actions :
  - Récupère l'image fraîchement publiée depuis GHCR.
  - Démarre la stack avec `docker compose up -d --no-build --wait`.
  - Vérifie l'état sain des conteneurs (`docker compose ps`) et interroge `/health` (attente d'un 200 `{ status: "UP", database: "UP" }`).
- Commit conventionnel : `ci: add deploy job running the stack with docker compose`.

### Phase 6 : Documentation Technique (README.md en Français)
- Rédiger le fichier `README.md` complet en français :
  - Présentation du projet et de l'architecture.
  - Prérequis d'exécution.
  - Procédure d'exécution locale avec Docker (`docker compose up`).
  - Procédure d'exécution locale sans Docker (`npm ci`, PostgreSQL local).
  - Fonctionnement du pipeline CI/CD GitHub Actions & GHCR.
  - Justification des choix techniques (sécurité non-root, multi-stage, `service_healthy`, etc.).
  - Limites identifiées et pistes d'amélioration.
- Commit conventionnel : `docs: document local run and pipeline`.

### Phase 7 & 8 : Revue Finale & Préparation de la Pull Request / Merge Request
- Contrôle de la propreté Git (`git log`, absence totale de secrets ou `.env`).
- Rédaction du template de Pull Request pour le reviewer `recrutement.dsii`.
