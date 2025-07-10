# Google Cloud Workload Identity Federation Setup für GitHub Actions

## 🚀 Moderne und sichere Authentifizierung

Workload Identity Federation ist die aktuellste und sicherste Methode für die Authentifizierung von GitHub Actions mit Google Cloud. Es eliminiert die Notwendigkeit von Service Account Keys und verwendet stattdessen OIDC (OpenID Connect).

## 📋 Voraussetzungen

- Google Cloud Project mit aktivierter Billing
- GitHub Repository mit Admin-Rechten
- `gcloud` CLI installiert und konfiguriert

## 🔧 Setup-Schritte

### 1. Workload Identity Pool erstellen

```bash
# Workload Identity Pool erstellen
gcloud iam workload-identity-pools create "github-actions-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Workload Identity Provider erstellen
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
```

### 2. Service Account erstellen

```bash
# Service Account erstellen
gcloud iam service-accounts create "github-actions-sa" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Service Account"

# Service Account Email speichern
export SA_EMAIL="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 3. IAM Berechtigungen zuweisen

```bash
# Workload Identity User Rolle zuweisen
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/${GITHUB_REPO}"

# Weitere Rollen für deine Anwendung
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.builder"
```

### 4. GitHub Secrets konfigurieren

Füge diese Secrets in deinem GitHub Repository hinzu:

- `GCP_PROJECT_ID`: Deine Google Cloud Project ID
- `GITHUB_ACTIONS_SA_EMAIL`: Die Service Account Email (z.B. `github-actions-sa@your-project.iam.gserviceaccount.com`)

## 🔍 Troubleshooting

### Häufige Fehler und Lösungen

#### 1. "Permission denied" bei der Authentifizierung

```bash
# Überprüfe die Workload Identity Pool Konfiguration
gcloud iam workload-identity-pools providers describe "github-actions-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-actions-pool"
```

#### 2. "Service account not found"

```bash
# Überprüfe ob der Service Account existiert
gcloud iam service-accounts list --project="${PROJECT_ID}"

# Erstelle den Service Account falls er nicht existiert
gcloud iam service-accounts create "github-actions-sa" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Service Account"
```

#### 3. "Repository attribute condition not met"

Stelle sicher, dass das Repository-Format korrekt ist:
- Format: `owner/repository-name`
- Beispiel: `KooroshKarimi/bringee`

## 🆚 Alternative Methoden

### 1. Service Account Key (Nicht empfohlen)

```yaml
- name: 'Authenticate to Google Cloud'
  uses: 'google-github-actions/auth@v2'
  with:
    credentials_json: '${{ secrets.GCP_SA_KEY }}'
```

**⚠️ Sicherheitsrisiken:**
- Keys können kompromittiert werden
- Keys müssen regelmäßig rotiert werden
- Keys haben oft zu viele Berechtigungen

### 2. Application Default Credentials

```yaml
- name: 'Authenticate to Google Cloud'
  uses: 'google-github-actions/auth@v2'
  with:
    credentials_json: '${{ secrets.GCP_SA_KEY }}'
    export_application_default_credentials: true
```

## 🎯 Best Practices

### 1. Minimale Berechtigungen
Verwende das Prinzip der minimalen Berechtigungen:

```bash
# Spezifische Rollen statt breiter Rollen
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.developer"  # Statt roles/run.admin
```

### 2. Repository-spezifische Bedingungen
Beschränke den Zugriff auf spezifische Repositories:

```bash
# Nur für main branch
--attribute-condition="assertion.repository=='owner/repo' && assertion.ref=='refs/heads/main'"
```

### 3. Regelmäßige Audits
Überprüfe regelmäßig die IAM-Berechtigungen:

```bash
# Liste alle Service Accounts
gcloud iam service-accounts list --project="${PROJECT_ID}"

# Überprüfe Berechtigungen
gcloud projects get-iam-policy "${PROJECT_ID}"
```

## 📚 Weitere Ressourcen

- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions Google Cloud Auth](https://github.com/google-github-actions/auth)
- [Security Best Practices](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)

## 🔄 Migration von Service Account Keys

Wenn du von Service Account Keys migrierst:

1. Erstelle die Workload Identity Federation Konfiguration
2. Teste die neue Authentifizierung in einem separaten Branch
3. Aktualisiere das Workflow
4. Entferne die alten Service Account Keys
5. Überwache die Logs für Probleme