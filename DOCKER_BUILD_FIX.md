# Docker Build Fix für CI/CD Pipeline

## Problem

Der GitHub Actions CI/CD Build schlug mit folgendem Fehler fehl:

```
#12 [7/8] COPY backend/ ./backend/
#12 ERROR: failed to calculate checksum of ref: "/backend": not found
```

## Root Cause

Der Fehler trat auf, weil:

1. **`.dockerignore` Ausschluss**: Die `.dockerignore` Datei enthielt `backend/` und `frontend/` in der Ausschlussliste
2. **Fehlender Build-Kontext**: Docker konnte diese Verzeichnisse nicht sehen, obwohl das Dockerfile sie kopieren wollte
3. **Inkonsistente Konfiguration**: Das Dockerfile wurde geändert, um `backend/` zu verwenden, aber die `.dockerignore` blockierte den Zugriff

## Solution

### 1. .dockerignore korrigiert

```diff
# Other projects
- backend/
- frontend/
+ # backend/ - needed for integrated build
+ # frontend/ - needed for integrated build
```

### 2. Vollständige Lösung

Die Lösung besteht aus mehreren Komponenten:

#### A. Dockerfile (bereits korrigiert)
```dockerfile
# Copy backend
COPY backend/ ./backend/
RUN cd backend && npm ci

# Start the backend server
CMD ["node", "backend/server.js"]
```

#### B. Backend Server (bereits erweitert)
- Serviert statische React-Dateien
- Stellt alle API-Endpoints bereit
- Behandelt React Router korrekt

#### C. .dockerignore (jetzt korrigiert)
- Erlaubt Zugriff auf `backend/` und `frontend/` Verzeichnisse
- Behält andere Ausschlüsse bei

## Verifikation

Der CI/CD Build sollte jetzt erfolgreich durchlaufen:

1. ✅ `npm ci` - Abhängigkeiten installieren
2. ✅ `npm run build` - React-App bauen
3. ✅ `npm test` - Tests durchführen
4. ✅ `docker build` - Docker Image erstellen

## Build-Ablauf

```bash
# 1. React-App wird gebaut
cd intellinews && npm ci && npm run build

# 2. Backend wird kopiert und konfiguriert
COPY backend/ ./backend/
RUN cd backend && npm ci

# 3. Backend Server startet und serviert:
#    - React-App (statische Dateien)
#    - API-Endpoints (/api/*)
#    - React Router (catch-all)
```

## Testen

Lokal testen:
```bash
# Build testen
docker build -t intellinews-test .

# Container starten
docker run -p 8080:8080 intellinews-test

# Testen
curl http://localhost:8080/api/health
# Should return JSON, not HTML
```

## Deployment

Nach dem Fix sollte der GitHub Actions Build erfolgreich durchlaufen und die App korrekt deployed werden.

Die finale Architektur:
- **Ein Container** mit integriertem Frontend und Backend
- **Ein Server** (`backend/server.js`) der alles serviert
- **Korrekte API-Responses** (JSON statt HTML)
- **Funktionierendes React Router**