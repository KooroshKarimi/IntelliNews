# IntelliNews - Pluggable AI Architecture (Release 1.1)

## Overview

IntelliNews Release 1.1 introduces a pluggable AI architecture that allows easy switching between different AI providers. This modular design enables experimentation with various AI services while maintaining a consistent interface.

## Architecture Components

### 1. AI Provider Interface (`IAiProvider`)
- **Location**: `backend/ai/IAiProvider.js`
- **Purpose**: Defines the contract for all AI provider implementations
- **Methods**:
  - `translate(text, sourceLang)`: Translate text to German
  - `summarize(content, language)`: Generate article summaries
  - `rateSeriousness(title, content, language)`: Rate article seriousness (1-10)
  - `generateImage(title, summary, language)`: Generate representative images
  - `isAvailable()`: Check if provider is configured and available

### 2. AI Providers

#### Mock Provider (`MockAiProvider`)
- **Location**: `backend/ai/MockAiProvider.js`
- **Purpose**: Testing and development without external API calls
- **Features**:
  - Simulates network delays
  - Provides predictable responses
  - Always available (no API key required)
  - Useful for development and testing

#### Gemini Provider (`GeminiAiProvider`)
- **Location**: `backend/ai/GeminiAiProvider.js`
- **Purpose**: Production-ready AI using Google's Gemini API
- **Features**:
  - Full AI capabilities
  - Requires API key configuration
  - Graceful error handling
  - Customizable prompts

### 3. AI Provider Factory (`AiProviderFactory`)
- **Location**: `backend/ai/AiProviderFactory.js`
- **Purpose**: Creates appropriate AI provider based on configuration
- **Features**:
  - Environment-based provider selection
  - Prompt configuration loading
  - Fallback to default prompts if config file missing

### 4. AI Service (`AiService`)
- **Location**: `backend/services/AiService.js`
- **Purpose**: Unified interface for the backend to use AI providers
- **Features**:
  - Automatic provider initialization
  - Article enhancement pipeline
  - Language detection
  - Error handling and graceful degradation

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# AI Provider Configuration
AI_PROVIDER=mock  # or 'gemini'

# Gemini API Configuration (if using Gemini)
GEMINI_API_KEY=your_api_key_here

# Server Configuration
PORT=8080
```

### Prompt Configuration

Prompts are configured in `backend/config/prompts.json`:

```json
{
  "translate": "Übersetze den folgenden Text von {sourceLang} ins Deutsche...",
  "summarize": "Fasse den folgenden Artikel in {language} zusammen...",
  "rateSeriousness": "Bewerte die Seriosität dieses Artikels...",
  "generateImagePrompt": "Generiere eine beschreibende Aufforderung..."
}
```

## Usage

### Starting the Server

```bash
cd backend
npm install
npm start
```

### API Endpoints

#### Get AI Provider Information
```bash
GET /api/ai-provider
```

Returns information about the current AI provider:
```json
{
  "name": "MockAiProvider",
  "available": true,
  "supportedProviders": ["mock", "gemini"],
  "currentProvider": "mock"
}
```

#### Enhance Article with AI
```bash
POST /api/enhance-article
```

Request body:
```json
{
  "article": {
    "originalTitle": "Sample Article Title",
    "originalContent": "Article content here...",
    "originalSummary": "Brief summary..."
  }
}
```

Response:
```json
{
  "id": "article-id",
  "originalTitle": "Sample Article Title",
  "translatedTitle": "[ÜBERSETZT] Sample Article Title",
  "originalContent": "Article content here...",
  "translatedSummary": "[ZUSAMMENFASSUNG] Article content here...",
  "seriousnessScore": 6,
  "imageUrl": "https://picsum.photos/400/300?random=12345",
  "imageGenerated": true,
  "aiEnhanced": true,
  "processedDate": "2024-01-15T10:30:00.000Z"
}
```

#### Test AI Functionality
```bash
POST /api/test-ai
```

Request body:
```json
{
  "operation": "enhance",
  "data": {
    "title": "Test Article",
    "content": "This is a test article for AI processing."
  }
}
```

## Adding New AI Providers

To add a new AI provider:

1. **Create Provider Class**:
   ```javascript
   // backend/ai/NewAiProvider.js
   import { IAiProvider } from './IAiProvider.js';
   
   export class NewAiProvider extends IAiProvider {
     constructor(apiKey, prompts) {
       super();
       this.apiKey = apiKey;
       this.prompts = prompts;
     }
     
     async translate(text, sourceLang) {
       // Implementation
     }
     
     // ... implement other methods
   }
   ```

2. **Update Factory**:
   ```javascript
   // backend/ai/AiProviderFactory.js
   import { NewAiProvider } from './NewAiProvider.js';
   
   // Add to switch statement
   case 'newprovider':
     return new NewAiProvider(process.env.NEW_PROVIDER_API_KEY, prompts);
   ```

3. **Update Environment Variables**:
   ```bash
   AI_PROVIDER=newprovider
   NEW_PROVIDER_API_KEY=your_key_here
   ```

## Error Handling

The system includes robust error handling:

- **Provider unavailable**: Falls back to mock provider
- **API failures**: Graceful degradation (article saved without AI enhancements)
- **Invalid responses**: Default values or original content returned
- **Configuration errors**: Fallback to default prompts

## Testing

### Using Mock Provider
```bash
AI_PROVIDER=mock npm start
```

### Using Gemini Provider
```bash
AI_PROVIDER=gemini GEMINI_API_KEY=your_key npm start
```

### Testing API Endpoints
```bash
# Test health check
curl http://localhost:8080/api/health

# Test AI provider info
curl http://localhost:8080/api/ai-provider

# Test article enhancement
curl -X POST http://localhost:8080/api/enhance-article \
  -H "Content-Type: application/json" \
  -d '{"article":{"originalTitle":"Test Article","originalContent":"This is a test."}}'
```

## Benefits

1. **Modularity**: Easy to switch between AI providers
2. **Testability**: Mock provider for development and testing
3. **Extensibility**: Simple to add new AI providers
4. **Configurability**: Customizable prompts without code changes
5. **Reliability**: Graceful error handling and fallbacks
6. **Cost Control**: Environment-based provider selection

## Future Extensions

The architecture is designed to support future enhancements:

- Additional AI providers (OpenAI, Claude, etc.)
- Provider-specific optimizations
- Load balancing between providers
- A/B testing capabilities
- Performance monitoring
- Cost tracking