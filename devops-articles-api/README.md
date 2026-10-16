# Articles API - Industrialisation et Pipeline CI/CD

Ce dépôt contient l'API de gestion d'articles conteneurisée et son pipeline d'intégration et de déploiement continu automatisé, réalisé dans le cadre du test technique DevOps (LMT Group).

---

## 1. Présentation du projet

L'application est une API REST développée en **Node.js** avec le framework **Express**, s'appuyant sur une base de données relationnelle **PostgreSQL** via la bibliothèque `pg`.

### Endpoints exposés
- `GET /health` : Vérification de l'état de santé de l'API et de la connexion PostgreSQL (200 si fonctionnel, 503 sinon).
- `POST /articles` : Création d'un article (`name`, `description`, `price`, `stock_quantity`).
- `GET /articles` : Liste de tous les articles ordonnés par identifiant décroissant.
- `GET /articles/:id` : Consultation d'un article par son identifiant.
- `PUT /articles/:id` : Mise à jour complète d'un article existant.
- `DELETE /articles/:id` : Suppression d'un article par son identifiant.

---

## 2. Prérequis

Pour exécuter et tester la solution en local, les outils suivants sont requis :
- **Docker Engine** (version 24+ recommandée) et **Docker Compose** (version 2+).
- Ou, pour une exécution sans Docker : **Node.js 22** et une instance **PostgreSQL 16**.

---

## 3. Exécution locale avec Docker

L'orchestration est configurée dans `docker-compose.yml` avec injection automatique de valeurs par défaut pour un démarrage immédiat.

### Démarrage de la stack
```bash
# 1. (Optionnel) Copier le fichier d'exemple si vous souhaitez surcharger les identifiants
cp .env.example .env

# 2. Construire l'image et démarrer les conteneurs en arrière-plan
docker compose up -d --build

# 3. Vérifier l'état de santé des services
docker compose ps
```

### Vérification des endpoints
```bash
# Vérification du point de terminaison de santé
curl -s http://localhost:3000/health

# Création d'un article de test
curl -s -X POST http://localhost:3000/articles \
  -H "Content-Type: application/json" \
  -d '{"name":"Article Test","description":"Description de test","price":25.5,"stock_quantity":10}'

# Consultation de la liste des articles
curl -s http://localhost:3000/articles
```

### Arrêt et nettoyage
```bash
# Arrêt des conteneurs et suppression du volume de données PostgreSQL
docker compose down -v
```

---

## 4. Exécution locale sans Docker

```bash
# 1. Installation des dépendances
npm ci

# 2. Configuration des variables d'environnement
cp .env.example .env
# Adapter DB_HOST, DB_USER, DB_PASSWORD selon votre instance PostgreSQL locale

# 3. Lancement de l'application
node src/server.js

# 4. Exécution des tests unitaires et d'intégration
npm test
```

---

## 5. Fonctionnement du pipeline CI/CD

Le dépôt propose deux configurations de pipelines équivalentes : GitHub Actions (`.github/workflows/ci.yml`) et GitLab CI (`.gitlab-ci.yml`).

### Déclenchement
Le pipeline s'exécute automatiquement à chaque `push` sur la branche de travail dédiée (`feature/devops-pipeline`) ainsi que sur `main`.

### Description des étapes

1. **Étape 1 : Build et Push de l'image Docker** (`build-and-push`)
   - Authentification sécurisée auprès du registre de conteneurs (GitHub Container Registry `ghcr.io` ou GitLab Container Registry) à l'aide des variables d'authentification prédéfinies (`GITHUB_TOKEN` / `CI_REGISTRY_PASSWORD`), sans aucun secret en clair.
   - Construction multi-stage de l'image avec mise en cache des couches.
   - Publication automatique de l'image taguée avec :
     - Le SHA court du commit (`<short-sha>`).
     - Le nom de la branche (`<branch-name>`).

2. **Étape 2 : Déploiement et Smoke Test sur le Runner** (`deploy-local`)
   - Téléchargement (`docker compose pull api`) de l'image Docker publiée à l'étape précédente.
   - Démarrage de la stack complète (`PostgreSQL` + `API`) sans rebuild local : `docker compose up -d --no-build --wait`.
   - Contrôle d'état des conteneurs avec `docker compose ps`.
   - Interrogation du endpoint `/health` et exécution de requêtes réelles de test (`POST /articles`, `GET /articles`).
   - Nettoyage automatique des conteneurs et volumes (`docker compose down -v`).

### Note sur le déploiement sur le runner
- **Sur un runner Docker (dind / conteneurisé)** : Le déploiement constitue un *smoke deployment* éphémère validant l'intégrité de la stack et des communications réseau dans un environnement isolé.
- **Sur un runner Shell** : Les conteneurs persistent sur l'hôte hôte du runner.

---

## 6. Choix techniques et architecture

- **Multi-stage build Docker** : L'étape de construction (`deps`) isole `npm ci --omit=dev` afin d'exclure les outils de développement (Jest, Supertest) de l'image finale de production, réduisant drastiquement l'empreinte disque et la surface d'attaque.
- **Principe du moindre privilège (Non-root user)** : L'exécution du serveur Node.js est confiée à l'utilisateur non privilégié `USER node` fourni par l'image officielle Alpine.
- **Gestion des dépendances de démarrage (`condition: service_healthy`)** : L'API appelle `process.exit(1)` au démarrage si la base de données est indisponible. Le `docker-compose.yml` configure donc un `healthcheck` PostgreSQL avec `pg_isready` et impose à l'API d'attendre l'état sain (`service_healthy`) de la base avant d'initialiser son écoute réseau.
- **Protection des données sensibles** : `.gitignore` et `.dockerignore` bloquent strictement les fichiers `.env` et les dossiers `node_modules/`. Le fichier `.env.example` documente les clés attendues sans divulguer de mot de passe réel.

---

## 7. Limites identifiées et pistes d'amélioration

- **Étape de tests automatisés dans la CI** : Ajouter une étape dédiée `test` exécutant `npm test` dans un conteneur avant la publication de l'image.
- **Scan de vulnérabilités** : Intégrer un scanner d'images (ex. Trivy, Grype ou Snyk) dans la pipeline pour détecter d'éventuelles failles CVE au niveau de l'OS Alpine ou des dépendances npm.
- **Résilience applicative au démarrage** : Dans le code applicatif (`src/server.js`), implémenter une boucle de retry avec backoff exponentiel lors de la connexion initiale à PostgreSQL, évitant le `process.exit(1)` immédiat.
- **Gestion gracieuse de l'arrêt (Graceful Shutdown)** : Écouter les signaux système `SIGTERM` et `SIGINT` pour fermer proprement le pool de connexions `pg` et le serveur HTTP Express lors des redéploiements.
- **Stratégie de versionnement sémantique** : Automatiser la génération de tags de release (ex. `v1.0.0`) lors du merge sur la branche par défaut via Semantic Release.
