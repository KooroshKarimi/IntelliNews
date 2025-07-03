#!/bin/bash

# Projekt-Variablen
PROJECT_ID="gemini-koorosh-karimi"
PROJECT_NUMBER="1002281569314"
SERVICE_ACCOUNT_EMAIL="cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Füge zusätzliche Berechtigungen für Cloud Build hinzu..."

# Cloud Build Service Account Berechtigungen
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Zusätzliche Rolle für unseren Service Account
echo "1. Füge Storage Admin Rolle hinzu..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.admin" \
    --project=${PROJECT_ID}

# Alternative: Spezifischere Berechtigungen für Cloud Build
echo "2. Füge Cloud Build Service Account User Rolle hinzu..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/cloudbuild.serviceAgent" \
    --project=${PROJECT_ID}

# Service Usage Berechtigung
echo "3. Füge Service Usage Consumer Rolle hinzu..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/serviceusage.serviceUsageConsumer" \
    --project=${PROJECT_ID}

echo ""
echo "✅ Berechtigungen aktualisiert!"
echo ""
echo "Generiere neuen Service Account Key..."
gcloud iam service-accounts keys create ~/cloud-run-key-new.json \
    --iam-account=${SERVICE_ACCOUNT_EMAIL} \
    --project=${PROJECT_ID}

echo ""
echo "📄 Neuer Schlüssel gespeichert unter: ~/cloud-run-key-new.json"
echo "🔐 Bitte aktualisieren Sie das GCP_SA_KEY Secret in GitHub mit diesem neuen Schlüssel!"
echo ""
echo "Download mit:"
echo "cloudshell download ~/cloud-run-key-new.json"