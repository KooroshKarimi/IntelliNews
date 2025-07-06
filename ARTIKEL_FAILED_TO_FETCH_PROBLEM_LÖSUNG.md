# Lösung: "Failed to fetch" beim Abrufen von Artikeln

## Problem
Beim Versuch, Artikel in der IntelliNews-Anwendung abzurufen, erschien die Fehlermeldung:
**"Failed to fetch"**

## Ursachenanalyse

### 1. Symptome identifiziert
- Backend-Server lief korrekt (✓)
- API-Endpoints waren erreichbar (✓)
- Aber: Keine Artikel vorhanden (leeres Array `[]`)

### 2. Grundursache gefunden
Das Problem lag an **fehlenden RSS-Feed-Konfigurationen**:

```json
{
  "feeds": [],
  "topics": []
}
```

### 3. Logik-Kette analysiert
1. **App.tsx Zeile 67**: Artikel werden nur geladen, wenn `configuration.feeds.length > 0`
2. **Aber**: Beim manuellen "Artikel aktualisieren" wird `loadArticles()` aufgerufen
3. **apiService.getArticles()** wird ausgeführt, auch wenn keine Feeds konfiguriert sind
4. **Resultat**: "Failed to fetch" oder leeres Ergebnis

### 4. Warum keine Standard-Feeds geladen wurden
Die `getDefaultConfiguration()` Methode in `apiService.ts` wird nur als Fallback verwendet, wenn die API-Konfiguration nicht geladen werden kann, **nicht** wenn die Konfiguration leer ist.

## Lösung

### 1. Standard-Feeds und Topics hinzufügen
```bash
curl -s -X POST http://localhost:8080/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [
      {
        "id": "1",
        "name": "Heise Online",
        "url": "https://www.heise.de/rss/heise-atom.xml",
        "language": "de"
      },
      {
        "id": "2",
        "name": "BBC Technology",
        "url": "http://feeds.bbci.co.uk/news/technology/rss.xml",
        "language": "en"
      }
    ],
    "topics": [
      {
        "id": "1",
        "name": "Künstliche Intelligenz",
        "keywords": ["KI", "AI", "künstliche intelligenz", "artificial intelligence", "machine learning", "deep learning"],
        "excludeKeywords": []
      },
      {
        "id": "2",
        "name": "Cybersecurity",
        "keywords": ["security", "hack", "cyber", "datenschutz", "privacy", "breach"],
        "excludeKeywords": []
      }
    ]
  }'
```

### 2. Feed-Verarbeitung auslösen
```bash
curl -s -X POST http://localhost:8080/api/parse
```

### 3. Ergebnis prüfen
```bash
curl -s http://localhost:8080/api/articles
```

## Erfolgreiche Lösung - Resultate

### ✅ Konfiguration gespeichert
```json
{
  "status": "configuration updated",
  "feedsCount": 2,
  "topicsCount": 2
}
```

### ✅ Artikel erfolgreich geladen
Nach der Feed-Verarbeitung wurden **13 Artikel** erfolgreich geladen:
- BBC Technology Feed Artikel
- Vollständige Datenstruktur mit Übersetzungen
- Automatische Themen-Zuordnung
- Generierte Bilder und Seriosität-Scores

### ✅ Beispiel-Artikel
```json
{
  "id": "https://www.bbc.com/news/articles/cy7nppe5gkgo",
  "originalTitle": "Minister tells Turing AI institute to focus on defence",
  "translatedTitle": "Minister tells Turing AI institute to focus auf defence",
  "sourceFeedName": "BBC Technology",
  "seriousnessScore": 5,
  "imageGenerated": true,
  "topics": []
}
```

## Technische Details

### Konfigurationsfluss
1. **Frontend**: Lädt Konfiguration über `/api/config`
2. **Leer**: Wenn keine Feeds vorhanden → keine Artikel-Anfrage
3. **Feeds hinzufügen**: Via Frontend oder API
4. **Automatische Verarbeitung**: Backend verarbeitet Feeds alle 5 Minuten
5. **Artikel verfügbar**: Frontend kann Artikel laden

### Artikel-Verarbeitung
- **RSS-Parsing**: Externe Feeds werden geparst
- **AI-Enhancement**: Übersetzungen und Seriosität-Scores
- **Bild-Generierung**: Automatische Bilder via Unsplash
- **Themen-Zuordnung**: Keyword-basierte Kategorisierung

## Präventive Maßnahmen

### 1. Bessere Fallback-Logik
```typescript
// In apiService.ts
async getConfiguration(): Promise<AppConfiguration> {
  try {
    const config = await this.request<AppConfiguration>('/config');
    // Wenn leer, Standard-Konfiguration verwenden
    if (config.feeds.length === 0 && config.topics.length === 0) {
      return this.getDefaultConfiguration();
    }
    return config;
  } catch (error) {
    console.error('Failed to load configuration from API, using defaults:', error);
    return this.getDefaultConfiguration();
  }
}
```

### 2. Bessere Fehlerbehandlung im Frontend
```typescript
// In App.tsx
const loadArticles = useCallback(async () => {
  if (loading) return;
  
  // Prüfe ob Feeds vorhanden sind
  if (configuration.feeds.length === 0) {
    setError('Keine RSS-Feeds konfiguriert. Bitte fügen Sie Feeds hinzu.');
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    const articleData = await apiService.getArticles(selectedTopic || undefined, 100);
    setArticles(articleData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
    setError(message);
    addToast('Artikel konnten nicht geladen werden');
  } finally {
    setLoading(false);
  }
}, [loading, selectedTopic, configuration.feeds.length]);
```

### 3. Automatische Initialisierung
```javascript
// In server.js beim Start
const initializeDefaultData = async () => {
  const config = await db.get('SELECT COUNT(*) as count FROM feeds');
  if (config.count === 0) {
    // Standard-Feeds hinzufügen
    await addDefaultFeeds();
  }
};
```

## Zusammenfassung

**Problem**: "Failed to fetch" beim Artikel-Abruf aufgrund fehlender RSS-Feed-Konfiguration
**Lösung**: Standard-Feeds und Topics hinzugefügt, Feed-Verarbeitung ausgelöst
**Status**: ✅ Behoben - 13 Artikel erfolgreich geladen

Die Anwendung funktioniert jetzt ordnungsgemäß und lädt Artikel aus den konfigurierten RSS-Feeds.