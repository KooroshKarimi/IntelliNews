#!/bin/bash

# Erst die Projekt-ID aus der Projektnummer ermitteln
echo "Ermittle Projekt-ID..."
PROJECT_ID=$(gcloud projects list --filter="projectNumber:1002281569314" --format="value(projectId)")

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Fehler: Konnte Projekt-ID nicht ermitteln"
    echo "Bitte führen Sie folgenden Befehl aus und notieren Sie die PROJECT_ID:"
    echo "gcloud projects list --filter='projectNumber:1002281569314'"
    exit 1
fi

echo "✅ Gefundene Projekt-ID: ${PROJECT_ID}"

# Variablen
SERVICE_ACCOUNT_NAME="cloud-run-deployer"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Projekt mit ID setzen (nicht Nummer!)
gcloud config set project ${PROJECT_ID}

# Service Account erstellen (falls noch nicht vorhanden)
echo "Erstelle Service Account..."
gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
    --display-name="Cloud Run Deployer" \
    --description="Service account for deploying to Cloud Run" \
    --project=${PROJECT_ID} 2>/dev/null || echo "Service Account existiert bereits"

# Kurz warten, damit der Service Account propagiert wird
sleep 5

# Rollen zuweisen
echo "Weise Rollen zu..."
for role in "roles/run.admin" "roles/artifactregistry.writer" "roles/cloudbuild.builds.editor" "roles/iam.serviceAccountUser"; do
    echo "  - ${role}"
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="${role}" \
        --project=${PROJECT_ID} \
        --quiet
done

# Artifact Registry Repository erstellen
echo "Erstelle Artifact Registry Repository..."
gcloud artifacts repositories create app \
    --repository-format=docker \
    --location=europe-west3 \
    --description="Container repository for Node+React app" \
    --project=${PROJECT_ID} 2>/dev/null || echo "Repository existiert bereits"

# Service Account Key erstellen
echo "Erstelle Service Account Key..."
gcloud iam service-accounts keys create ~/cloud-run-key.json \
    --iam-account=${SERVICE_ACCOUNT_EMAIL} \
    --project=${PROJECT_ID}

echo ""
echo "✅ Setup erfolgreich abgeschlossen!"
echo "📄 Der Schlüssel wurde gespeichert unter: ~/cloud-run-key.json"
echo "🔐 WICHTIG: Laden Sie diesen Schlüssel herunter und löschen Sie ihn dann!"
echo ""
echo "Projekt-ID für GitHub Secrets: ${PROJECT_ID}"
echo ""
echo "Download-Befehl:"
echo "cloudshell download ~/cloud-run-key.json"