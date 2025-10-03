# Gemini 1.5 Pro Integration Setup Guide

## Overview
This guide covers the complete setup for integrating Gemini 1.5 Pro with your MedWira application, including authentication, configuration, and deployment.

## Part A: Connection & Setup (Prerequisites)

### 1. ✅ SDK Installation
The Google Generative AI SDK is already installed in your project:

```bash
# Verify installation
npm list @google/generative-ai
# Should show: @google/generative-ai@^0.21.0
```

### 2. 🔧 Authentication Configuration

#### Option A: API Key Authentication (Recommended)
Set up authentication using a Google AI Studio API key:

1. **Get API Key from Google AI Studio:**
   - Visit: https://makersuite.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated API key

2. **Set Environment Variable:**
   ```bash
   export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key-here"
   ```

#### Option B: Environment File
For development, add the key to your `.env.local` file:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

### 3. ✅ Gemini 1.5 Pro Client Initialization

The client is already properly initialized in `src/services/geminiAgent.js`:

```javascript
// Initialize Gemini 1.5 Pro client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
```

## Environment Variables Required

Create a `.env.local` file with the following variables:

```bash
# Google Gemini API Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key-here

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# Debug mode (optional)
DEBUG=true
```

## Verification Steps

### 1. Test Authentication
```bash
# Test API key by running a simple test
npm run test:gemini
```

### 2. Test Gemini Integration
```bash
# Test the complete pipeline
npm run test:pipeline

# Verify setup
npm run verify:gemini
```

### 3. Test NPRA Database
```bash
# Test database functions
npm run test:npra
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

# Ensure environment variables are set in Vercel dashboard:
# GOOGLE_GENERATIVE_AI_API_KEY
# SUPABASE_URL
# SUPABASE_KEY
```

#### Option B: Google Cloud Run (Express Server)
```bash
# Build and deploy to Cloud Run
gcloud run deploy gemini-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY=your-key
```

#### Option C: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
ENV GOOGLE_GENERATIVE_AI_API_KEY=your-key
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
   - Verify `GOOGLE_GENERATIVE_AI_API_KEY` is set correctly
   - Check that the API key is valid and active
   - Ensure the key has proper permissions

2. **API Rate Limits:**
   - Gemini 1.5 Pro has rate limits based on your quota
   - Monitor usage in Google AI Studio dashboard
   - Implement retry logic for rate limit errors

3. **Token Management Errors:**
   - Verify Supabase connection and credentials
   - Check that `public.profiles` table exists with `token_count` column
   - Ensure RLS policies allow authenticated access

### Debug Commands

```bash
# Check environment variables
env | grep -E "(GOOGLE_|SUPABASE_)"

# Test Supabase connection
npm run test:npra

# Test complete pipeline
npm run test:gemini
```

## Security Considerations

1. **API Key Security:**
   - Store API keys securely in environment variables
   - Never commit API keys to version control
   - Use different keys for development and production

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
   - Run the test suite: `npm run test:gemini`
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
