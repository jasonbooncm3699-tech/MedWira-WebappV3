# AI Image Analysis Pipeline - MedWira

## Overview
This document describes the comprehensive AI image analysis pipeline for MedWira, featuring real-time multi-phase status display, token-based monetization, and advanced medicine identification capabilities.

## Architecture

### Components

#### 1. Supabase Edge Function (`analyze-medicine`)
**Location:** `supabase/functions/analyze-medicine/index.ts`

**Features:**
- Multi-phase AI analysis with real-time status updates
- Token-based monetization with immediate deduction
- Google Gemini 1.5 Pro integration for image analysis
- Database integration for medicine lookup
- Web search augmentation for comprehensive results
- Error handling for non-medicine images
- Scan history logging

**Phases:**
1. **Token Check & Deduction** - Verify user has tokens and deduct 1 token
2. **AI Image Analysis** - Validate medicine content and extract basic info
3. **Database Lookup** - Search NPRA medicine database
4. **Web Search Augmentation** - Enhance with additional data
5. **Final Analysis** - Generate comprehensive medicine information

#### 2. Enhanced API Route
**Location:** `app/api/analyze-medicine-enhanced/route.ts`

**Features:**
- Calls Supabase Edge Function
- Input validation and error handling
- CORS support
- Response formatting

#### 3. Frontend Components

**AIStatusDisplay Component** (`components/AIStatusDisplay.tsx`)
- Real-time typing animation with dots
- Multi-phase status display
- Responsive design
- Smooth animations

**Updated Main Page** (`app/page.tsx`)
- AI status state management
- Enhanced user experience with visual feedback
- Immediate user message display
- Structured medicine response rendering

## Features

### Real-Time Status Display
The system provides visual feedback through 5 distinct phases:

1. `"Analyzing Image..."` - Initial AI processing
2. `"Checking Medicine Database..."` - NPRA database lookup
3. `"Augmenting Data via Web Search..."` - Web search enhancement
4. `"Summarizing and Formatting Response..."` - Final analysis
5. `"idle"` - Process complete

### Token Monetization
- **Pre-flight Check:** Verifies user has available tokens
- **Immediate Deduction:** Deducts 1 token before processing
- **Error Handling:** Returns appropriate error for insufficient tokens
- **Real-time Updates:** Frontend shows remaining tokens

### Comprehensive Medicine Analysis
The system provides 11-section detailed analysis:

1. **Packaging Detected** - Description of visible packaging and markings
2. **Medicine Name** - Full medicine name with active ingredients
3. **Purpose** - Medical uses and indications
4. **Dosage Instructions** - Age-specific dosage recommendations
5. **Side Effects** - Common and rare side effects with overdose warnings
6. **Allergy Warning** - Specific contraindications and allergies
7. **Drug Interactions** - Drug, food, and alcohol interactions
8. **Safety Notes** - Special population considerations
9. **Cross-Border Info** - International availability
10. **Storage** - Storage requirements and conditions
11. **Disclaimer** - Medical disclaimer and consultation advice

### Error Handling
- **Non-Medicine Images:** Detects and rejects non-pharmaceutical content
- **Token Exhaustion:** Graceful handling of insufficient tokens
- **Network Errors:** Robust error handling with user-friendly messages
- **Invalid Images:** Format validation and error reporting

## Deployment

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Supabase project created and configured
3. Environment variables set up

### Environment Variables
```bash
# Required in Supabase Edge Function environment
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key  # Fallback

# Required in Next.js environment
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Deployment Steps

1. **Deploy Edge Function:**
   ```bash
   ./deploy-edge-function.sh
   ```

2. **Set Environment Variables in Supabase Dashboard:**
   - Go to Project Settings > Edge Functions
   - Add `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`

3. **Test the Function:**
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-medicine' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"imageBase64":"data:image/jpeg;base64,...", "userId":"user-id"}'
   ```

## Usage

### Frontend Integration
```typescript
// Upload image and start analysis
const analyzeMedicineImage = async (imageBase64: string) => {
  setAiStatus('Analyzing Image...');
  
  const response = await fetch('/api/analyze-medicine-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      userId: user?.id,
      language: 'English',
      allergy: userAllergies
    }),
  });
  
  const result = await response.json();
  // Handle response...
};
```

### Response Format
```json
{
  "success": true,
  "status": "SUCCESS",
  "data": {
    "packagingDetected": "Blister pack with markings...",
    "medicineName": "SAMPLE_MEDICINE (ActiveIngredient1 60mg, ActiveIngredient2 2.5mg)",
    "purpose": "Treatment of common cold and allergies...",
    "dosageInstructions": "Adults: one tablet every 4-6 hours...",
    "sideEffects": "Common: dry mouth, dizziness...",
    "allergyWarning": "Contains active ingredients and excipients...",
    "drugInteractions": "May interact with MAOIs...",
    "safetyNotes": "Use with caution in children...",
    "crossBorderInfo": "Availability in other countries...",
    "storage": "Store at room temperature...",
    "disclaimer": "This information is for informational purposes only..."
  },
  "tokensRemaining": 29
}
```

## Performance Considerations

### Optimization Strategies
1. **Visual Delays:** Strategic delays between status phases for better UX
2. **Parallel Processing:** Database and web search can run concurrently
3. **Caching:** Consider caching frequent medicine lookups
4. **Rate Limiting:** Implement rate limiting to prevent abuse

### Monitoring
- Monitor Edge Function execution time
- Track token usage patterns
- Monitor error rates and types
- Analyze user engagement with status display

## Security

### Token Security
- Server-side token validation and deduction
- No client-side token manipulation possible
- Secure database operations with RLS

### Image Processing
- Base64 validation and sanitization
- Size limits and format restrictions
- Secure AI API key handling

### Error Information
- No sensitive information in error messages
- Proper error logging for debugging
- User-friendly error messages

## Future Enhancements

### Planned Features
1. **Streaming Responses:** Real-time streaming of analysis phases
2. **Batch Processing:** Multiple image analysis in single request
3. **Offline Mode:** Cached analysis for common medicines
4. **Advanced Analytics:** Detailed usage analytics and insights
5. **Multi-language Support:** Enhanced localization for all phases

### Performance Improvements
1. **Edge Caching:** CDN integration for faster responses
2. **Database Optimization:** Indexed medicine database queries
3. **AI Model Optimization:** Fine-tuned models for medicine identification
4. **Response Compression:** Gzip compression for large responses

## Troubleshooting

### Common Issues

1. **Edge Function Not Deploying:**
   - Check Supabase CLI installation
   - Verify login status: `supabase status`
   - Check environment variables

2. **Token Deduction Failing:**
   - Verify `profiles` table structure
   - Check RLS policies
   - Ensure service role key is correct

3. **AI Analysis Failing:**
   - Verify Gemini API key
   - Check image format and size
   - Monitor API rate limits

4. **Status Display Not Updating:**
   - Check React state management
   - Verify component re-rendering
   - Check for JavaScript errors

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=true
```

This will provide detailed logs for each phase of the analysis pipeline.

## Support

For technical support or questions about the AI analysis pipeline:
1. Check the troubleshooting section above
2. Review Supabase Edge Function logs
3. Monitor browser console for frontend errors
4. Contact the development team with specific error messages
