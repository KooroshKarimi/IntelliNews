#!/bin/bash

# Variablen
PROJECT_ID="1002281569314"
SERVICE_ACCOUNT_NAME="cloud-run-deployer"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Projekt setzen
gcloud config set project ${PROJECT_ID}

# APIs aktivieren
echo "Aktiviere benötigte APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Service Account erstellen
echo "Erstelle Service Account..."
gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
    --display-name="Cloud Run Deployer" \
    --description="Service account for deploying to Cloud Run"

# Rollen zuweisen
echo "Weise Rollen zu..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

# Artifact Registry Repository erstellen
echo "Erstelle Artifact Registry Repository..."
gcloud artifacts repositories create app \
    --repository-format=docker \
    --location=europe-west3 \
    --description="Container repository for Node+React app" || echo "Repository existiert bereits"

# Service Account Key erstellen
echo "Erstelle Service Account Key..."
gcloud iam service-accounts keys create ~/cloud-run-key.json \
    --iam-account=${SERVICE_ACCOUNT_EMAIL}

echo "✅ Setup abgeschlossen!"
echo "📄 Der Schlüssel wurde gespeichert unter: ~/cloud-run-key.json"
echo "🔐 WICHTIG: Laden Sie diesen Schlüssel herunter und löschen Sie ihn dann aus der Cloud Shell!"
echo ""
echo "Download-Befehl:"
echo "cloudshell download ~/cloud-run-key.json"