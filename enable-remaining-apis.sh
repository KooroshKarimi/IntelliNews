#!/bin/bash

PROJECT_ID="gemini-koorosh-karimi"

echo "Aktiviere Cloud Resource Manager API..."
gcloud services enable cloudresourcemanager.googleapis.com --project=${PROJECT_ID}

echo "Warte 30 Sekunden, damit die API-Aktivierung propagiert wird..."
sleep 30

echo "✅ API aktiviert!"
echo ""
echo "Starten Sie jetzt den GitHub Workflow erneut!"