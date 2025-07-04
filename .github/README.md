# GitHub Workflows für IntelliNews

Dieses Repository enthält zwei GitHub Actions Workflows für das IntelliNews Projekt:

## 🔄 CI Pipeline (`ci.yml`)

**Zweck:** Continuous Integration - läuft bei jedem Push und Pull Request

**Features:**
- ✅ Testet gegen Node.js 18 und 20
- ✅ Installiert Dependencies mit `npm ci`
- ✅ Läuft ESLint für Code-Qualität
- ✅ Führt Tests mit Coverage aus
- ✅ Baut das Projekt
- ✅ Überprüft Build-Größe
- ✅ Upload von Coverage Reports zu Codecov (optional)

**Triggers:** Push/PR auf `main`, `master`, `develop`

## 🚀 CI/CD Pipeline (`ci-cd.yml`)

**Zweck:** Continuous Integration + Deployment zu GitHub Pages

**Features:**
- ✅ Alle CI Features von oben
- 🚀 Automatisches Deployment zu GitHub Pages bei Push auf main/master
- 📦 Upload von Build Artifacts
- 🔒 Sichere Permissions für GitHub Pages

**Triggers:** Push/PR auf `main`, `master`

## Setup & Konfiguration

### 1. GitHub Pages aktivieren (für ci-cd.yml)

1. Gehe zu Repository Settings → Pages
2. Setze Source auf "GitHub Actions"
3. Der Workflow deployed automatisch nach erfolgreichem Build

### 2. Codecov Integration (optional)

Für Coverage Reports:
1. Gehe zu [codecov.io](https://codecov.io)
2. Verbinde dein GitHub Repository
3. Coverage wird automatisch hochgeladen

### 3. Node.js Versionen anpassen

Die Workflows nutzen Node.js 18 und 20. Um Versionen zu ändern:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20] # Deine gewünschten Versionen
```

### 4. Branches konfigurieren

Workflow-Triggers können in der `on:` Sektion angepasst werden:

```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
```

## Workflow Status

Die Workflows erscheinen als Status Checks bei Pull Requests und können als Branch Protection Rules gesetzt werden.

## Troubleshooting

### Tests schlagen fehl?
- Stelle sicher, dass alle Tests auch lokal laufen: `npm test`
- Prüfe, ob `package.json` alle benötigten Dependencies enthält

### Build schlägt fehl?
- Überprüfe TypeScript Errors: `npm run build`
- Stelle sicher, dass alle Assets im `public/` Ordner vorhanden sind

### Deployment funktioniert nicht?
- Überprüfe GitHub Pages Einstellungen
- Stelle sicher, dass der Repository Branch `main` oder `master` heißt
- Prüfe die Workflow Permissions

## Nächste Schritte

Für die IntelliNews Backend-Integration (Release 1.0+) könntest du zusätzliche Workflows hinzufügen:

- 🐳 Docker Build & Push
- 🧪 Backend API Tests
- 🗄️ Database Migrations
- 🔄 E2E Tests mit Cypress/Playwright