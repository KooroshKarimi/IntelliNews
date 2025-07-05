# IntelliNews Backend

Backend für die IntelliNews-Anwendung - ein personalisierter Nachrichtenaggregator mit KI-Anreicherung.

## Features

- **RSS-Feed-Parsing**: Automatisches Sammeln von Artikeln aus konfigurierten RSS-Feeds
- **KI-Integration**: Unterstützung für mehrere KI-Provider (OpenAI, Gemini, Mock)
- **Automatische Übersetzung**: Übersetzung nicht-deutscher Artikel
- **Seriositätsbewertung**: KI-basierte Bewertung der Artikel-Seriosität (1-10)
- **Bildgenerierung**: Automatische Generierung von Bildern für Artikel
- **Cron-Jobs**: Automatische Feed-Updates alle 5 Minuten
- **Duplikaterkennung**: Entfernung von Duplikaten mit Jaccard-Similarity
- **Topic-Matching**: Automatische Zuordnung von Artikeln zu Themen
- **REST API**: Vollständige API für Frontend-Integration

## Installation

```bash
npm install
```

## Konfiguration

### Umgebungsvariablen

Erstellen Sie eine `.env` Datei im Backend-Verzeichnis:

```env
# Server-Konfiguration
PORT=8080

# KI-Provider-Auswahl (mock, openai, gemini)
AI_PROVIDER=mock

# OpenAI-Konfiguration (optional)
OPENAI_API_KEY=your_openai_api_key_here

# Gemini-Konfiguration (optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Datenbank-Konfiguration (zukünftig)
DATABASE_URL=postgresql://username:password@localhost:5432/intellinews
```

### Prompts konfigurieren

Die KI-Prompts können in `config/prompts.json` angepasst werden:

```json
{
  "translation": "Übersetze den folgenden Text von {fromLang} nach {toLang}. Gib nur die Übersetzung zurück, ohne zusätzliche Erklärungen:\n\n{text}",
  "seriousness": "Bewerte die Seriosität des folgenden Nachrichtenartikels auf einer Skala von 1-10...",
  "imageGeneration": "Create a professional, news-appropriate image for an article with the title: {title}"
}
```

## Starten

### Entwicklung

```bash
npm run dev
```

### Produktion

```bash
npm start
```

## API-Endpunkte

### Konfiguration

- `GET /api/config` - Konfiguration abrufen
- `POST /api/config` - Konfiguration speichern

### Feeds

- `GET /api/feeds` - Alle Feeds abrufen
- `POST /api/feeds` - Feed hinzufügen
- `DELETE /api/feeds/:id` - Feed löschen

### Themen

- `GET /api/topics` - Alle Themen abrufen
- `POST /api/topics` - Thema hinzufügen
- `DELETE /api/topics/:id` - Thema löschen

### Artikel

- `GET /api/articles` - Alle Artikel abrufen
- `GET /api/articles?topic=TopicName` - Artikel nach Thema filtern
- `GET /api/articles?limit=50` - Artikel begrenzen

### Utilities

- `GET /api/feed?url=RSS_URL` - RSS-Feed direkt parsen
- `GET /api/health` - Systemstatus

## KI-Provider

### Mock Provider

Der Mock-Provider ist für Entwicklung und Tests gedacht:

```env
AI_PROVIDER=mock
```

- Simuliert KI-Funktionen ohne externe API-Aufrufe
- Schnelle Antworten mit einfachen Heuristiken
- Keine API-Schlüssel erforderlich

### OpenAI Provider

Für die Nutzung mit OpenAI GPT und DALL-E:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key
```

### Gemini Provider

Für die Nutzung mit Google Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key
```

## Deployment

### Docker

```bash
# Build
docker build -t intellinews-backend .

# Run
docker run -p 8080:8080 -e AI_PROVIDER=mock intellinews-backend
```

### Google Cloud Run

```bash
# Deploy
gcloud run deploy intellinews-backend --source . --platform managed --region europe-west1
```

## Architektur

```
backend/
├── server.js              # Hauptserver
├── ai/                    # KI-Provider-Abstraktionen
│   ├── IAiProvider.js     # Interface
│   ├── AiProviderFactory.js
│   ├── MockAiProvider.js
│   ├── OpenAiProvider.js
│   └── GeminiAiProvider.js
├── utils/                 # Utility-Funktionen
│   └── duplicateDetection.js
├── config/                # Konfigurationsdateien
│   ├── prompts.json       # KI-Prompts
│   └── configuration.json # System-Konfiguration
└── package.json
```

## Überwachung

### Logs

Der Server loggt wichtige Ereignisse:

- Feed-Updates
- KI-API-Aufrufe
- Fehler und Warnungen
- Cron-Job-Ausführungen

### Health Check

```bash
curl http://localhost:8080/api/health
```

Antwort:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.1.0",
  "aiProvider": "mock"
}
```

## Entwicklung

### Neue KI-Provider hinzufügen

1. Erstellen Sie eine neue Klasse, die `IAiProvider` implementiert
2. Registrieren Sie den Provider in `AiProviderFactory.js`
3. Fügen Sie entsprechende Umgebungsvariablen hinzu

### Datenbank-Integration

Aktuell verwendet das System JSON-Dateien als Speicher. Für die Produktion ist eine PostgreSQL-Integration geplant.

## Fehlerbehandlung

Das System behandelt Fehler graceful:

- Nicht erreichbare Feeds werden markiert und stündlich erneut versucht
- Fehlgeschlagene KI-Aufrufe führen nicht zum Absturz
- Artikel werden auch ohne KI-Anreicherung gespeichert

## Lizenz

Dieses Projekt ist Teil der IntelliNews-Anwendung.