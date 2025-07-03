# Softwarespezifikation: IntelliNews v1.1

## 1. Projektvision & Ziele

**Vision:** IntelliNews ist ein personalisierter Nachrichtenaggregator für einen **einzelnen Benutzer (Single-User, Self-Hosted)**, der Inhalte aus vom Benutzer definierten RSS-Feeds sammelt. Mithilfe von künstlicher Intelligenz übersetzt, klassifiziert, bewertet und reichert es Artikel an, um eine hochrelevante und effiziente Nachrichtenerfahrung zu bieten. Das System soll modular aufgebaut sein, um das Experimentieren mit verschiedenen KI-Anbietern zu ermöglichen.

**Hauptziele:**
* **Aggregation:** Sammeln von Artikeln aus mehreren RSS-Feeds.
* **Personalisierung:** Filtern und Kategorisieren von Artikeln basierend auf benutzerdefinierten Themen (Keywords).
* **KI-Veredelung:** Automatische Übersetzung, Zusammenfassung, Bewertung der Seriosität und Generierung von passenden Bildern.
* **Benutzerfreundlichkeit:** Eine saubere, responsive und intuitive Benutzeroberfläche.
* **Modularität:** Eine Backend-Architektur, die den Austausch des KI-Dienstes erlaubt.
* **Robustheit:** Klares und sichtbares Feedback an den Benutzer bei Fehlern (z.B. nicht erreichbare Feeds).

---

## 2. Kernkonzepte & Datenmodelle

### Article
Repräsentiert einen einzelnen Nachrichtenartikel.
* `id` (string, primärer Schlüssel, z.B. die URL des Artikels)
* `link` (string, URL zum Originalartikel)
* `originalTitle`, `originalSummary`, `originalContent` (string)
* `translatedTitle`, `translatedSummary` (string, optional)
* `sourceFeedName` (string)
* `publicationDate` (string, ISO 8601)
* `processedDate` (string, ISO 8601, wann der Artikel vom System verarbeitet wurde)
* `topics` (string[], Namen der zugeordneten Themen)
* `seriousnessScore` (number, 1-10, optional, von KI bewertet)
* `imageUrl` (string, optional, aus Feed extrahiert oder von KI generiert)
* `imageGenerated` (boolean, optional, true wenn imageUrl von KI stammt)
* `aiEnhanced` (boolean, true wenn der Artikel von einer KI verarbeitet wurde)

### Feed
Repräsentiert eine RSS-Feed-Quelle.
* `id` (string, UUID)
* `name` (string, benutzerdefinierter Name)
* `url` (string, URL des RSS-Feeds)
* `language` (enum: 'de', 'en', 'other')

### Topic
Repräsentiert ein benutzerdefiniertes Interessensgebiet.
* `id` (string, UUID)
* `name` (string, Name des Themas)
* `keywords` (string[], Schlüsselwörter zur Identifizierung)
* `excludeKeywords` (string[], optionale Schlüsselwörter zum Ausschluss)

---

## 3. Technische Architektur

### Frontend
* **Technologie:** React, TypeScript.
* **Styling:** TailwindCSS.
* **Kommunikation:** RESTful API mit dem Backend.
* **Kernverantwortung:** Darstellung der Daten, Benutzerinteraktion, UI-Konfiguration. **Zusätzlich:** Anzeige von Fehlerzuständen (z.B. ein Warnsymbol neben einem Feed, dessen Quelle nicht erreichbar ist).

### Backend
* **Technologie:** Node.js mit Express.js oder Fastify, TypeScript.
* **Datenbank:** PostgreSQL (Produktion), SQLite/JSON-Dateien (Entwicklung).
* **Kernverantwortung:** API-Bereitstellung, Konfigurationsverwaltung, periodisches Parsen von Feeds, KI-Kommunikation.
* **Sicherheit:** API-Schlüssel werden ausschließlich über Umgebungsvariablen (`process.env.API_KEY`) verwaltet.

---

## 4. Fehlerbehandlung und Systemverhalten

Dieser Abschnitt definiert, wie das System auf häufige Fehler reagiert.

* **Unerreichbarer RSS-Feed:**
    * **Backend:** Wenn ein Feed nicht abgerufen werden kann, wird dies protokolliert. Es wird stündlich ein erneuter Versuch unternommen (`Retry`-Logik).
    * **Frontend:** In der Feed-Verwaltung wird neben dem betroffenen Feed ein deutliches Warnsymbol angezeigt. Beim Mouse-Over oder Klick auf das Symbol erscheint eine Meldung, z.B.: *"Feed 'Beispiel-Feed' ist seit [Datum/Uhrzeit] nicht erreichbar."*
* **Fehlgeschlagener KI-API-Aufruf:**
    * **Backend:** Schlägt ein Aufruf an die KI-API fehl (z.B. durch API-Limits, ungültigen Inhalt), wird der Fehler protokolliert. Der betroffene Artikel wird ohne die jeweilige KI-Anreicherung (z.B. ohne Übersetzung oder Seriositäts-Score) gespeichert und angezeigt. Es gibt **keine** automatischen Retries für einzelne Artikel, um Kosten zu sparen und die Verarbeitung nicht zu blockieren.
    * **Frontend:** Im Frontend wird eine kleine, dezente und temporäre Benachrichtigung (Toast-Nachricht) angezeigt, z.B.: *"KI-Anreicherung für einen Artikel fehlgeschlagen."*
* **Fehlerhafte Artikelverarbeitung:**
    * **Backend:** Wenn ein einzelner Artikel nicht übersetzt oder bewertet werden kann (z.B. weil der Inhalt leer ist), wird dieser Schritt einfach übersprungen. Der Artikel erscheint in seiner Originalform. Es wird **keine** Aktion oder Fehlermeldung ausgelöst.

---

## 5. Release-Plan (Iterative Entwicklung)

### Release 0.1 - 0.3: Grundfunktionen
* **Ziel:** Statischer Feed-Reader mit lokaler Konfiguration und Filterung.
* **Details:** Implementierung der grundlegenden Frontend-Komponenten. Konfiguration wird im `localStorage` gespeichert. Keyword-Matching erfolgt case-insensitive in Titel und Zusammenfassung. Duplikaterkennung basiert auf einem Jaccard-Index-Schwellenwert von `> 0.9`.

### Release 0.4: Erste KI-Integration (Übersetzung)
* **Ziel:** Artikel aus nicht-deutschen Feeds werden automatisch übersetzt.
* **Details:** Logik für die Kommunikation mit der KI wird temporär im Frontend gekapselt. Die `ArticleCard` wird erweitert, um Übersetzungen und Fehlerzustände anzuzeigen.

### Release 0.5: Erweiterte KI-Funktionen
* **Ziel:** Anreicherung der Artikel mit Seriositätsbewertung und generierten Bildern.
* **Details:** Die Prompts für die KI-Funktionen werden aus einer simulierten Konfigurationsdatei (`prompts.json`) geladen.

### Release 0.6: Backend-Simulation
* **Ziel:** Verlagerung der gesamten Logik in einen simulierten Backend-Service (`apiService.ts`), um das Frontend für eine echte API vorzubereiten.

### Release 1.0: Echte Backend-Separierung
* **Ziel:** Implementierung eines eigenständigen Node.js-Backends.
* **Frontend:** Umstellung des `apiService.ts` auf echte `fetch`-Aufrufe. UI zur Anzeige von Warnsymbolen wird implementiert.
* **Backend:**
    * Implementierung der REST-API-Endpunkte.
    * Einrichtung eines Cron-Jobs, der **alle 5 Minuten** läuft.
    * Implementierung der unter Punkt 4 definierten Fehlerbehandlungs- und Retry-Logik.

### Release 1.1: Pluggable AI-Architektur
* **Ziel:** Das Backend so umgestalten, dass KI-Anbieter austauschbar sind.
* **Backend:**
    * Definition einer generischen `IAiProvider`-Schnittstelle.
    * Erstellung von Implementierungen (`GeminiAiProvider`, `MockAiProvider`, etc.).
    * Nutzung einer Factory, die den Provider basierend auf `process.env.AI_PROVIDER` auswählt.
    * Die Prompts für die KI werden aus einer Konfigurationsdatei (z.B. `config/prompts.json`) geladen.
