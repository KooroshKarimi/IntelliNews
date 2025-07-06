# JSON Parsing Error Fix

## Problem

Die React-App erhielt den Fehler: `Unexpected token '<', "<!doctype "... is not valid JSON`

## Root Cause

Der Fehler trat auf, weil:

1. **Falsche Server-Konfiguration**: Das Dockerfile startete den falschen Server (`server.js` statt `backend/server.js`)
2. **Fehlende API-Endpoints**: Der einfache `server.js` hatte nur einen `/health` Endpoint, aber die React-App rief `/api/health` auf
3. **Fehlende statische Dateien**: Der `backend/server.js` hatte keine Konfiguration zum Servieren der React-App

## Solution

### 1. Dockerfile korrigiert

```dockerfile
# Vorher:
CMD ["node", "server.js"]

# Nachher:
CMD ["node", "backend/server.js"]
```

### 2. Backend Server erweitert

- **Static File Serving hinzugefügt**: Serviert jetzt die React-App Dateien aus `../intellinews/build/`
- **Catch-all Route**: Alle nicht-API Routes werden an React weitergeleitet
- **Korrekte API-Endpoints**: `/api/health` und alle anderen API-Endpoints sind verfügbar

### 3. Änderungen in `backend/server.js`

```javascript
// Static file serving
app.use(express.static(path.join(__dirname, '../intellinews/build')));

// Catch-all handler für React Router
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    // API 404 handling
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  // Serve React app
  res.sendFile(path.join(__dirname, '../intellinews/build/index.html'));
});
```

## Testen

Nach dem Fix sollte:
1. Die React-App korrekt laden
2. Der `/api/health` Endpoint JSON zurückgeben
3. Alle anderen API-Endpoints funktionieren
4. React Router korrekt funktionieren

## Deployment

```bash
# Container neu bauen
docker build -t intellinews .

# Container starten
docker run -p 8080:8080 intellinews
```

Die App ist dann unter `http://localhost:8080` erreichbar.