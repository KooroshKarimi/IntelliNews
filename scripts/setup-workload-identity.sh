#!/bin/bash

# Google Cloud Workload Identity Federation Setup Script
# Für GitHub Actions Authentifizierung

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Überprüfe gcloud Installation
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI ist nicht installiert. Bitte installiere es zuerst."
        exit 1
    fi
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Du bist nicht bei gcloud angemeldet. Führe 'gcloud auth login' aus."
        exit 1
    fi
}

# Überprüfe und setze Variablen
setup_variables() {
    print_info "Konfiguriere Variablen..."
    
    # Project ID
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            read -p "Google Cloud Project ID: " PROJECT_ID
        fi
    fi
    
    # GitHub Repository
    if [ -z "$GITHUB_REPO" ]; then
        read -p "GitHub Repository (Format: owner/repo): " GITHUB_REPO
    fi
    
    # Service Account Name
    if [ -z "$SA_NAME" ]; then
        SA_NAME="github-actions-sa"
    fi
    
    # Setze abgeleitete Variablen
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    POOL_NAME="github-actions-pool"
    PROVIDER_NAME="github-actions-provider"
    
    print_success "Variablen konfiguriert:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Project Number: $PROJECT_NUMBER"
    echo "  GitHub Repo: $GITHUB_REPO"
    echo "  Service Account: $SA_EMAIL"
}

# Erstelle Workload Identity Pool
create_workload_identity_pool() {
    print_info "Erstelle Workload Identity Pool..."
    
    # Prüfe ob Pool bereits existiert
    if gcloud iam workload-identity-pools describe "$POOL_NAME" \
        --project="$PROJECT_ID" \
        --location="global" &>/dev/null; then
        print_warning "Workload Identity Pool '$POOL_NAME' existiert bereits."
        return 0
    fi
    
    gcloud iam workload-identity-pools create "$POOL_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --display-name="GitHub Actions Pool"
    
    print_success "Workload Identity Pool erstellt."
}

# Erstelle Workload Identity Provider
create_workload_identity_provider() {
    print_info "Erstelle Workload Identity Provider..."
    
    # Prüfe ob Provider bereits existiert
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_NAME" &>/dev/null; then
        print_warning "Workload Identity Provider '$PROVIDER_NAME' existiert bereits."
        return 0
    fi
    
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_NAME" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository=='$GITHUB_REPO'"
    
    print_success "Workload Identity Provider erstellt."
}

# Erstelle Service Account
create_service_account() {
    print_info "Erstelle Service Account..."
    
    # Prüfe ob Service Account bereits existiert
    if gcloud iam service-accounts describe "$SA_EMAIL" \
        --project="$PROJECT_ID" &>/dev/null; then
        print_warning "Service Account '$SA_EMAIL' existiert bereits."
        return 0
    fi
    
    gcloud iam service-accounts create "$SA_NAME" \
        --project="$PROJECT_ID" \
        --display-name="GitHub Actions Service Account"
    
    print_success "Service Account erstellt."
}

# Weise IAM Berechtigungen zu
assign_iam_permissions() {
    print_info "Weise IAM Berechtigungen zu..."
    
    # Workload Identity User Rolle
    gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
        --project="$PROJECT_ID" \
        --role="roles/iam.workloadIdentityUser" \
        --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_NAME/attribute.repository/$GITHUB_REPO"
    
    # Cloud Run Admin
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/run.admin"
    
    # Storage Admin (für Artifact Registry)
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/storage.admin"
    
    # Artifact Registry Admin
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/artifactregistry.admin"
    
    # Cloud Build Service Account (falls benötigt)
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/cloudbuild.builds.builder"
    
    print_success "IAM Berechtigungen zugewiesen."
}

# Zeige GitHub Secrets an
show_github_secrets() {
    print_info "GitHub Secrets die du konfigurieren musst:"
    echo ""
    echo "GCP_PROJECT_ID: $PROJECT_ID"
    echo "GITHUB_ACTIONS_SA_EMAIL: $SA_EMAIL"
    echo ""
    echo "Gehe zu: https://github.com/$GITHUB_REPO/settings/secrets/actions"
    echo "und füge diese Secrets hinzu."
}

# Teste die Konfiguration
test_configuration() {
    print_info "Teste die Konfiguration..."
    
    # Teste Service Account
    if gcloud iam service-accounts describe "$SA_EMAIL" \
        --project="$PROJECT_ID" &>/dev/null; then
        print_success "Service Account ist konfiguriert."
    else
        print_error "Service Account Test fehlgeschlagen."
        return 1
    fi
    
    # Teste Workload Identity Pool
    if gcloud iam workload-identity-pools describe "$POOL_NAME" \
        --project="$PROJECT_ID" \
        --location="global" &>/dev/null; then
        print_success "Workload Identity Pool ist konfiguriert."
    else
        print_error "Workload Identity Pool Test fehlgeschlagen."
        return 1
    fi
    
    # Teste Provider
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_NAME" &>/dev/null; then
        print_success "Workload Identity Provider ist konfiguriert."
    else
        print_error "Workload Identity Provider Test fehlgeschlagen."
        return 1
    fi
    
    print_success "Alle Tests erfolgreich!"
}

# Hauptfunktion
main() {
    echo "🚀 Google Cloud Workload Identity Federation Setup"
    echo "=================================================="
    echo ""
    
    # Überprüfe Voraussetzungen
    check_gcloud
    
    # Setup
    setup_variables
    create_workload_identity_pool
    create_workload_identity_provider
    create_service_account
    assign_iam_permissions
    
    # Teste und zeige Ergebnisse
    test_configuration
    show_github_secrets
    
    echo ""
    print_success "Setup abgeschlossen! 🎉"
    echo ""
    echo "Nächste Schritte:"
    echo "1. Füge die GitHub Secrets hinzu"
    echo "2. Aktualisiere dein Workflow mit der neuen Authentifizierung"
    echo "3. Teste die Authentifizierung in einem Pull Request"
}

# Hilfe anzeigen
show_help() {
    echo "Verwendung: $0 [OPTIONEN]"
    echo ""
    echo "Optionen:"
    echo "  -p, --project-id PROJECT_ID    Google Cloud Project ID"
    echo "  -r, --repo GITHUB_REPO         GitHub Repository (Format: owner/repo)"
    echo "  -s, --service-account SA_NAME  Service Account Name (Standard: github-actions-sa)"
    echo "  -h, --help                     Zeige diese Hilfe"
    echo ""
    echo "Beispiel:"
    echo "  $0 -p my-project-123 -r owner/my-repo"
}

# Parse Kommandozeilenargumente
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        -r|--repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        -s|--service-account)
            SA_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unbekannte Option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Führe Hauptfunktion aus
main "$@"