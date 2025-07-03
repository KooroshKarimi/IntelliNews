# IntelliNews - Personalisierter Nachrichtenaggregator

IntelliNews ist ein personalisierter RSS-Feed-Aggregator für einen einzelnen Benutzer, der Nachrichten aus verschiedenen Quellen sammelt, filtert und nach benutzerdefinierten Themen kategorisiert.

## Features (Release 0.1-0.3)

- ✅ RSS-Feed-Aggregation aus mehreren Quellen
- ✅ Themenbezogene Filterung mit Keywords
- ✅ Duplikaterkennung (Jaccard-Index > 0.9)
- ✅ Lokale Konfigurationsspeicherung (localStorage)
- ✅ Responsive Benutzeroberfläche mit TailwindCSS
- ✅ Feed-Management (Hinzufügen/Entfernen von RSS-Feeds)
- ✅ Themen-Management (Keywords und Ausschluss-Keywords)
- ✅ Fehlerbehandlung mit visueller Rückmeldung

## Technologie-Stack

- **Frontend:** React, TypeScript
- **Styling:** TailwindCSS
- **Datenspeicherung:** localStorage
- **RSS-Parsing:** Browser-native DOMParser
- **CORS-Proxy:** AllOrigins (für RSS-Feeds)

## Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd intellinews
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Entwicklungsserver starten:
```bash
npm start
```

Die Anwendung wird unter http://localhost:3000 verfügbar sein.

## Verwendung

### RSS-Feeds verwalten

1. Klicken Sie auf den Tab "Feeds"
2. Klicken Sie auf "+ Feed hinzufügen"
3. Geben Sie einen Namen und die URL des RSS-Feeds ein
4. Wählen Sie die Sprache des Feeds
5. Klicken Sie auf "Hinzufügen"

**Beispiel-Feeds:**
- Heise Online: https://www.heise.de/rss/heise-atom.xml
- BBC Technology: http://feeds.bbci.co.uk/news/technology/rss.xml
- Spiegel Online: https://www.spiegel.de/schlagzeilen/index.rss

### Themen verwalten

1. Klicken Sie auf den Tab "Themen"
2. Klicken Sie auf "+ Thema hinzufügen"
3. Geben Sie einen Themennamen ein
4. Fügen Sie relevante Keywords hinzu (Enter-Taste oder + Button)
5. Optional: Fügen Sie Ausschluss-Keywords hinzu
6. Klicken Sie auf "Hinzufügen"

### Artikel filtern

1. Im Tab "Artikel" können Sie nach Themen filtern
2. Verwenden Sie das Dropdown-Menü "Filter nach Thema"
3. Klicken Sie auf "Artikel aktualisieren" um neue Artikel zu laden

## Datenmodelle

### Article
- Repräsentiert einen einzelnen Nachrichtenartikel
- Enthält Original- und Übersetzungsdaten (für zukünftige Releases)
- Speichert Themen-Zuordnungen und Metadaten

### Feed
- Repräsentiert eine RSS-Feed-Quelle
- Unterstützt mehrsprachige Feeds (de, en, other)
- Fehlerbehandlung mit Zeitstempel

### Topic
- Benutzerdefinierte Interessensgebiete
- Keywords für positive Übereinstimmungen
- Ausschluss-Keywords für Filterung

## Roadmap

### Release 0.4: KI-Integration (Übersetzung)
- Automatische Übersetzung nicht-deutscher Artikel
- Integration mit KI-APIs

### Release 0.5: Erweiterte KI-Funktionen
- Seriositätsbewertung von Artikeln
- KI-generierte Bilder für Artikel ohne Bilder

### Release 0.6: Backend-Simulation
- Verlagerung der Logik in einen API-Service

### Release 1.0: Echtes Backend
- Node.js/Express Backend
- PostgreSQL Datenbank
- Periodisches Feed-Parsing (alle 5 Minuten)

### Release 1.1: Pluggable AI-Architektur
- Austauschbare KI-Provider
- Konfigurierbare Prompts

## Bekannte Einschränkungen

- CORS-Einschränkungen erfordern einen Proxy-Service
- Keine Persistenz außerhalb von localStorage
- Manuelle Aktualisierung der Artikel erforderlich
- Keine Hintergrund-Synchronisation

## Entwicklung

### Build für Produktion
```bash
npm run build
```

### Tests ausführen
```bash
npm test
```

## Lizenz

Dieses Projekt ist für den persönlichen Gebrauch bestimmt.
