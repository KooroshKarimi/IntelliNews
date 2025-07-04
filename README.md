# IntelliNews - AI-Powered News Aggregator

A personalized news aggregator that collects content from RSS feeds and uses AI to translate, classify, and enhance articles for a superior news experience.

## 🚀 Architecture

- **Frontend**: React + TypeScript + TailwindCSS (`/intellinews`)
- **Container**: Multi-stage Docker build with Nginx for production
- **Deployment**: GitHub Actions → Google Cloud Run

## 📋 Prerequisites

### For Cloud Deployment
- Google Cloud project with billing enabled
- Service account with the following roles:
  - Cloud Run Admin
  - Artifact Registry Administrator  
  - Cloud Build Editor
  - Service Account User

### GitHub Secrets Required
Set these secrets in your GitHub repository settings:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID` | Your Google Cloud project ID | `my-project-12345` |
| `GCP_REGION` | Target deployment region | `us-central1` |
| `GCP_SA_KEY` | Service account JSON key | `{"type": "service_account"...}` |

## 🛠️ Local Development

```bash
# Install dependencies
cd intellinews
npm install

# Start development server
npm start

# Build for production
npm run build

# Test with Docker (optional)
docker build -t intellinews .
docker run -p 8080:8080 intellinews
```

## 🚀 Deployment to Cloud Run

### Automatic Deployment
1. Push to `main` branch
2. GitHub Actions automatically:
   - Builds the React application
   - Creates optimized Docker image with Nginx
   - Pushes to Google Artifact Registry
   - Deploys to Cloud Run
   - Provides the service URL

### Manual Deployment (if needed)
```bash
# Build and push manually
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export SERVICE_NAME="intellinews"

# Build Docker image
docker build -t $GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/app/$SERVICE_NAME:latest .

# Push to Artifact Registry
docker push $GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/app/$SERVICE_NAME:latest

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/app/$SERVICE_NAME:latest \
  --region $GCP_REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080
```

## 🔧 Troubleshooting

### Common Issues

**Build Failures**
- Ensure `intellinews/package.json` exists with proper dependencies
- Check Node.js version compatibility (using Node 18)

**Deployment Failures** 
- Verify all GitHub secrets are set correctly
- Check service account permissions
- Ensure APIs are enabled: Cloud Run, Artifact Registry, Cloud Build

**Runtime Issues**
- Application runs on port 8080 (Cloud Run requirement)
- Nginx serves the React SPA with proper routing
- Check Cloud Run logs: `gcloud logs read --service=intellinews`

### Getting Service URL
```bash
gcloud run services describe intellinews \
  --region=us-central1 \
  --format="value(status.url)"
```

## 📁 Project Structure

```
├── intellinews/          # React TypeScript application
│   ├── src/             # Source code
│   ├── public/          # Static assets
│   └── package.json     # Dependencies and scripts
├── .github/workflows/   # CI/CD pipelines
├── Dockerfile          # Production container configuration
├── nginx.conf          # Nginx configuration for serving SPA
└── README.md           # This file
```

## 🎯 Features (Planned)

- RSS feed aggregation and parsing
- AI-powered article translation
- Content classification and filtering
- Seriousness scoring
- AI-generated article images
- Personalized topic filtering
- Real-time feed status monitoring

## 📄 License

This project is part of the IntelliNews specification v1.1 - A self-hosted, single-user news aggregator.