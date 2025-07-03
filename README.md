# Node.js + React on Google Cloud Run

This repository contains a minimal full-stack application:

* **Backend**: Node.js + Express (`/backend`)
* **Frontend**: React (Create React App) (`/frontend`)
* **Container**: Multi-stage Dockerfile builds frontend and serves it via Express
* **Local testing**: `docker compose up`
* **Cloud deployment**: GitHub Actions workflow deploys to Google Cloud Run

## Prerequisites

* Docker (local) – already available on your Synology NAS
* Google Cloud project with Artifact Registry and Cloud Run enabled
* Service-account JSON key stored as GitHub secret `GCP_SA_KEY`

## Local development

```
# Build and start container
docker compose up --build

# Access the app
http://localhost:8080
```

The React frontend will be served and `/api/health` returns `{ "status": "ok" }`.

## Deployment via GitHub Actions

1. Push to `main` branch.
2. The workflow in `.github/workflows/deploy.yml` will:
   * Authenticate using the service-account key.
   * Build the container with Cloud Build.
   * Push the image to Artifact Registry.
   * Deploy/Update Cloud Run service.

Adjust `GCP_REGION`, `GCP_PROJECT_ID`, and `SERVICE_NAME` in the workflow if necessary.