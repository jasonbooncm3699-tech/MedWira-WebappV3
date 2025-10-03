# MedGemma 4B Monolith Integration Setup Guide

## Overview
This guide covers the complete setup for integrating MedGemma 4B Monolith with your MedWira application, including authentication, configuration, and deployment.

## Part A: Connection & Setup (Prerequisites)

### 1. ✅ SDK Installation
The Google Cloud Vertex AI SDK is already installed in your project:

```bash
# Verify installation
npm list @google-cloud/vertexai
# Should show: @google-cloud/vertexai@^1.10.0
```

### 2. 🔧 Authentication Configuration

#### Option A: Application Default Credentials (Recommended for Production)
Set up authentication using a Google Cloud Service Account:

1. **Create a Service Account:**
   ```bash
   gcloud iam service-accounts create medgemma-service-account \
     --display-name="MedGemma Service Account" \
     --description="Service account for MedGemma 4B integration"
   ```

2. **Grant Required Permissions:**
   ```bash
   # Grant Vertex AI User role
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:medgemma-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   
   # Grant AI Platform Developer role (for model access)
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:medgemma-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

3. **Download Service Account Key:**
   ```bash
   gcloud iam service-accounts keys create medgemma-key.json \
     --iam-account=medgemma-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Set Environment Variable:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/medgemma-key.json"
   ```

#### Option B: Environment Variable Authentication
For development, you can set the credentials path directly:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

### 3. ✅ Vertex AI Client Initialization

The client is already properly initialized in `src/services/medgemmaAgent.js`:

```javascript
// Environment variables for Google Cloud and MedGemma
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';

// Initialize Vertex AI client
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// MedGemma 4B model path
const MEDGEMMA_MODEL_NAME = 'projects/google/locations/us-central1/publishers/google/models/medgemma-4b-it@001'; 
const model = MEDGEMMA_MODEL_NAME;
```

## Environment Variables Required

Create a `.env.local` file with the following variables:

```bash
# Google Cloud Platform Configuration
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# Optional: Google Cloud Service Account (if not using ADC)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

## Verification Steps

### 1. Test Authentication
```bash
# Test Google Cloud authentication
gcloud auth application-default print-access-token

# Test project access
gcloud config get-value project
```

### 2. Test Vertex AI Access
```bash
# List available models (optional)
gcloud ai models list --region=us-central1
```

### 3. Test MedGemma Integration
```bash
# Run the test suite
npm run test:medgemma
```

## Deployment Options

### 1. Local Development
```bash
# Start Next.js development server
npm run dev

# Or start Express server
npm run server:dev
```

### 2. Production Deployment

#### Option A: Vercel (Next.js)
```bash
# Deploy to Vercel
vercel --prod

# Ensure environment variables are set in Vercel dashboard
```

#### Option B: Google Cloud Run (Express Server)
```bash
# Build and deploy to Cloud Run
gcloud run deploy medgemma-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option C: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "run", "server"]
```

## API Endpoints

### 1. Medicine Analysis
```bash
POST /api/analyze-medicine-medgemma
Content-Type: application/json

{
  "image_data": "data:image/jpeg;base64,/9j/4AAQ...",
  "text_query": "What is this medicine and what are its side effects?",
  "user_id": "user-uuid-here"
}
```

### 2. Token Status Check
```bash
GET /api/token-status?userId=user-uuid-here
```

### 3. Health Check
```bash
GET /api/analyze-medicine-medgemma
```

## Troubleshooting

### Common Issues

1. **Authentication Errors:**
   - Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
   - Ensure service account has `roles/aiplatform.user` permission
   - Check that `GCP_PROJECT_ID` matches your actual project

2. **Model Access Errors:**
   - Verify MedGemma 4B is available in your region
   - Check that the model path is correct
   - Ensure your project has access to the model

3. **Token Management Errors:**
   - Verify Supabase connection and credentials
   - Check that `public.profiles` table exists with `token_count` column
   - Ensure RLS policies allow authenticated access

### Debug Commands

```bash
# Check environment variables
env | grep -E "(GCP_|SUPABASE_|GOOGLE_)"

# Test Supabase connection
npm run test:npra

# Test complete pipeline
npm run test:medgemma
```

## Security Considerations

1. **Service Account Security:**
   - Store service account keys securely
   - Use least privilege principle
   - Rotate keys regularly

2. **Environment Variables:**
   - Never commit `.env` files to version control
   - Use secure secret management in production
   - Validate all environment variables at startup

3. **API Security:**
   - Implement proper authentication middleware
   - Validate all input parameters
   - Rate limit API endpoints
   - Monitor token usage and costs

## Cost Management

1. **Token Tracking:**
   - Monitor token consumption per user
   - Implement usage limits and alerts
   - Track costs per API call

2. **Optimization:**
   - Cache NPRA database results
   - Implement request batching where possible
   - Monitor and optimize model parameters

## Support and Monitoring

1. **Logging:**
   - All API calls are logged with timestamps
   - Token operations are tracked
   - Error responses include detailed information

2. **Monitoring:**
   - Health check endpoints for uptime monitoring
   - Token status endpoints for usage tracking
   - Error rate monitoring and alerting

## Next Steps

1. **Test the Integration:**
   - Run the test suite: `npm run test:medgemma`
   - Test with real medicine images
   - Verify token deduction works correctly

2. **Deploy to Production:**
   - Set up proper authentication
   - Configure environment variables
   - Deploy using your preferred method

3. **Monitor and Optimize:**
   - Set up monitoring and alerting
   - Track costs and usage patterns
   - Optimize based on real-world usage
