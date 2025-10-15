# AI Output Troubleshooting Guide

## Common Issue: "No tokens remaining" Error

### Problem
Users report that AI responses are not appearing in the chat interface, even though they can see their message was sent.

### Root Cause
The MedWira app uses a token-based system where users need tokens to use AI features. When users have 0 tokens, the API correctly blocks requests and returns:
```json
{
  "status": "ERROR",
  "error": "No tokens remaining. Please upgrade your plan or wait for daily reset.",
  "language": "Chinese"
}
```

### Solution
Add tokens to the user's account in the Supabase database:

1. **Connect to Supabase database**
2. **Update user's token count**:
   ```sql
   UPDATE public.profiles 
   SET tokens = 50 
   WHERE email = 'user@example.com';
   ```

### Verification
Test the API endpoint to confirm the fix:
```bash
curl -X POST http://localhost:3000/api/ai-pharmacist \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"test message","userId":"USER_UUID","language":"English"}'
```

### Token System Details
- **Default tokens**: 30 tokens for new users
- **Token usage**: 1 token per AI request
- **Token deduction**: Happens after successful AI response
- **User identification**: Use UUID from `profiles.id`, not email address

### Prevention
- Monitor user token balances
- Implement token refresh system
- Consider increasing default token allocation
- Add user-facing token balance display

---
*Last updated: October 15, 2025*
