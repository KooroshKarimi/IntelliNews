# Lösung: Konfiguration konnte nicht gespeichert werden

## Problem
Die Anwendung zeigte folgende Fehlermeldungen:
- **Beim Hinzufügen neuer RSS Feeds**: "Konfiguration konnte nicht gespeichert werden"
- **Beim Hinzufügen neuer Themen**: "Konfiguration konnte nicht gespeichert werden"

## Ursachenanalyse

### 1. Fehlerquelle identifiziert
Die Fehlermeldung wird in `intellinews/src/App.tsx` Zeile 37 generiert:
```typescript
addToast('Konfiguration konnte nicht gespeichert werden');
```

### 2. API-Aufruf-Kette verfolgt
- **Frontend**: `App.tsx` → `apiService.saveConfiguration()`
- **API Service**: `intellinews/src/utils/apiService.ts` → POST Request zu `/api/config`
- **Backend**: `backend/server.js` → `/api/config` Endpoint → Database Operations

### 3. Grundursache gefunden
Das Problem lag in der **fehlenden SQLite3-Abhängigkeit**:
```
Error: No database driver available
```

Die Datenbankmodul `backend/db.js` konnte weder PostgreSQL noch SQLite3 laden, da die Abhängigkeiten nicht installiert waren.

## Lösung

### 1. Backend-Abhängigkeiten installieren
```bash
cd backend
npm install
```

### 2. Frontend-Abhängigkeiten installieren
```bash
cd intellinews
npm install
```

### 3. Datenbankfunktionalität testen
Nach der Installation funktionieren die Datenbankoperationen korrekt:
```
✓ Database read works - feeds: 0
✓ Database read works - topics: 0
✓ Database write works - created test topic
✓ Database cleanup works - deleted test topic
```

## Technische Details

### Datenbankarchitektur
Das System verwendet ein **Dual-Database-Setup**:
- **PostgreSQL**: Für Produktionsumgebungen (wenn `DATABASE_URL` gesetzt)
- **SQLite3**: Für Entwicklungsumgebungen (lokale Datei `backend/data.db`)

### Konfigurationsspeicherung
Die Konfiguration wird über den `/api/config` Endpoint gespeichert:
- **Upsert-Logik**: Erstellt neue Einträge oder aktualisiert bestehende
- **Soft-Delete**: Deaktiviert Feeds/Topics statt sie zu löschen
- **Foreign-Key-Schutz**: Verhindert Datenverlust bei Referenzen

### Betroffene Komponenten
1. **FeedManager**: Zum Hinzufügen/Bearbeiten von RSS-Feeds
2. **TopicManager**: Zum Hinzufügen/Bearbeiten von Themen
3. **Database Layer**: SQLite3/PostgreSQL Operationen

## Präventive Maßnahmen

### 1. Automatische Dependency-Installation
Für zukünftige Deployments sollte ein Setup-Skript erstellt werden:
```bash
#!/bin/bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../intellinews && npm install

# Build frontend
npm run build
```

### 2. Bessere Fehlerbehandlung
Der Database-Layer könnte verbesserte Fehlermeldungen liefern:
```javascript
catch (error) {
  if (error.message.includes('No database driver available')) {
    console.error('Database setup incomplete. Run npm install in backend directory.');
  }
  throw error;
}
```

### 3. Dependency-Check im Startskript
```javascript
// In server.js
try {
  await db.run('SELECT 1');
  console.log('✓ Database connection successful');
} catch (error) {
  console.error('✗ Database connection failed:', error.message);
  process.exit(1);
}
```

## Zusammenfassung

**Problem**: Konfigurationsspeicherung fehlgeschlagen aufgrund fehlender SQLite3-Abhängigkeit
**Lösung**: Installation der Node.js-Abhängigkeiten für Backend und Frontend
**Status**: ✅ Behoben - Konfiguration kann jetzt erfolgreich gespeichert werden

Das System funktioniert nun ordnungsgemäß und Benutzer können RSS-Feeds und Themen ohne Fehler hinzufügen und bearbeiten.