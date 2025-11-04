# 504 Gateway Timeout Issue Analysis

## Problem Identified

**Error:** `504 Gateway Timeout` from `/api/ai-pharmacist` endpoint
**User Query:** Text-only question about gastric issues (no image)
**Issue:** AI is timing out when answering text questions

---

## Root Causes

### 1. ⚠️ **CRITICAL: Timeout Too Short (30 seconds)**
**Location:** `app/api/ai-pharmacist/route.ts` line 15
```typescript
export const maxDuration = 30; // TOO SHORT!
```

**Problem:**
- Text queries now do multiple operations that can exceed 30 seconds:
  - Health profile loading (database)
  - Medication stack loading (database)
  - Main AI response (Gemini API call) ~3-5 seconds
  - Keyword extraction (Gemini API call) ~2-3 seconds ⚠️ **SYNCHRONOUS**
  - Pattern detection (Gemini API call) ~2-3 seconds ⚠️ **SYNCHRONOUS**
  - Chat history saving (database)
  - Total: **10-15+ seconds minimum**, can easily exceed 30s with network latency

---

### 2. ⚠️ **CRITICAL: Pattern Detection Running Synchronously**
**Location:** `app/api/ai-pharmacist/route.ts` lines 203-230

**Problem:**
```typescript
// Phase 2.1: Detect patterns synchronously for permission prompt
// We do this synchronously so we can include pattern in response
let detectedPattern: PatternCandidate | null = null;
if (userId && userMessage) {
  // Extract keywords first (needed for pattern detection)
  const keywords = await extractHealthKeywords(userMessage, language, keywordStatusCallback);
  // This calls Gemini API - takes 2-3 seconds
  
  // Detect pattern if we have symptoms and triggers
  if (keywords.symptoms && keywords.symptoms.length > 0 && 
      keywords.triggers && keywords.triggers.length > 0) {
    detectedPattern = await detectPatterns(userMessage, keywords, language, patternStatusCallback);
    // This ALSO calls Gemini API - takes another 2-3 seconds
  }
}
```

**Impact:**
- **2-3 additional Gemini API calls** happening synchronously AFTER the main response
- These are blocking the API response
- Adds 4-6 seconds to response time
- Combined with main AI call = **7-11 seconds just for AI calls**
- Plus database operations = **easily exceeds 30 seconds**

---

### 3. ⚠️ **Keyword Extraction Running Synchronously**
**Location:** `app/api/ai-pharmacist/route.ts` line 213

**Problem:**
- `extractHealthKeywords()` is called synchronously in the API route
- This calls Gemini API (another 2-3 seconds)
- This is needed for pattern detection, but it's blocking the response

---

### 4. ⚠️ **Wrong Error Message**
**Location:** `app/page.tsx` line 557

**Problem:**
```typescript
content: 'Sorry, I encountered an error while analyzing your medicine. Please try again.',
```

**Issue:**
- Says "analyzing your medicine" even for text queries
- Should say "processing your question" or "answering your question"
- Makes users think it's tied to image analysis

---

### 5. ⚠️ **Multiple Sequential Database Operations**
**Location:** `lib/ai-pharmacist-service.ts` lines 176-240

**Problem:**
- Health profile loading (database call)
- Medication stack loading (database call)
- These happen sequentially, not in parallel
- Each can take 1-2 seconds
- Total: 2-4 seconds just for data loading

---

## Current Flow (Text Query)

```
User Request
  ↓
Rate Limit Check (instant)
  ↓
Token Check (database ~1s)
  ↓
Load Health Profile (database ~1-2s)
  ↓
Load Medication Stack (database ~1-2s)
  ↓
Main AI Response (Gemini ~3-5s)
  ↓
Save Chat History (database ~1s)
  ↓
Extract Keywords (Gemini ~2-3s) ⚠️ SYNCHRONOUS
  ↓
Detect Patterns (Gemini ~2-3s) ⚠️ SYNCHRONOUS
  ↓
Return Response
```

**Total Time:** 10-17 seconds minimum (can be 20-30+ with network latency)

---

## Solutions

### Solution 1: Increase Timeout (Quick Fix)
**File:** `app/api/ai-pharmacist/route.ts`

```typescript
// Increase Vercel timeout for comprehensive analysis
export const maxDuration = 60; // Increase from 30 to 60 seconds
```

**Pros:**
- Quick fix
- Allows time for all operations

**Cons:**
- Still inefficient
- Users wait longer
- Doesn't solve the root cause

---

### Solution 2: Make Pattern Detection Truly Asynchronous (Recommended)
**File:** `app/api/ai-pharmacist/route.ts`

**Change:**
- Don't wait for pattern detection
- Return response immediately after main AI response
- Run pattern detection in background
- Include pattern in next response or use WebSocket/SSE

**Implementation:**
```typescript
// Return the result immediately
if (result.success) {
  // Return response immediately
  const response = NextResponse.json({...});
  
  // Run pattern detection in background (don't await)
  if (userId && userMessage) {
    detectPatternInBackground(userId, userMessage, language).catch(error => {
      console.error('Error detecting patterns in background:', error);
    });
  }
  
  return response;
}
```

**Pros:**
- Faster response time
- Better user experience
- Pattern can be added later via WebSocket/SSE or next message

**Cons:**
- Pattern won't be in immediate response
- Need to implement async pattern delivery

---

### Solution 3: Optimize Database Operations (Parallel Loading)
**File:** `lib/ai-pharmacist-service.ts`

**Change:**
- Load health profile and medication stack in parallel
- Use `Promise.all()` instead of sequential `await`

**Implementation:**
```typescript
if (userId) {
  // Load both in parallel
  const [healthProfile, medicationsResult] = await Promise.all([
    HealthProfileService.loadUserHealthProfile(userId),
    supabase
      .from('user_medication_stack')
      .select('medicine_name, generic_name, active_ingredients, frequency, dosage')
      .eq('user_id', userId)
      .eq('is_active', true)
  ]);
  
  // Process results...
}
```

**Pros:**
- Faster data loading
- Reduces total time by 1-2 seconds

**Cons:**
- Still have Gemini API calls blocking

---

### Solution 4: Fix Error Message (Quick Fix)
**File:** `app/page.tsx`

**Change:**
```typescript
// OLD:
content: 'Sorry, I encountered an error while analyzing your medicine. Please try again.',

// NEW:
content: 'Sorry, I encountered an error while processing your question. Please try again.',
```

**Pros:**
- Better user experience
- Accurate error message
- Shows it's not tied to image analysis

---

### Solution 5: Combine Solutions (Best Approach)

**Recommended Implementation:**

1. **Increase timeout to 45 seconds** (safety margin)
2. **Make pattern detection background** (don't block response)
3. **Parallelize database operations** (faster loading)
4. **Fix error message** (better UX)
5. **Add timeout protection** (fail gracefully if still too long)

---

## Recommended Fix Priority

### Immediate (Do Now):
1. ✅ **Increase timeout to 60 seconds** - Prevents 504 errors
2. ✅ **Fix error message** - Better UX
3. ✅ **Make pattern detection background** - Faster responses

### Short-term (Do Next):
4. ✅ **Parallelize database operations** - Optimize performance
5. ✅ **Add timeout protection** - Graceful degradation

---

## Estimated Impact

### Before Fix:
- Response time: 15-30+ seconds
- 504 timeouts: Frequent
- User experience: Poor

### After Fix:
- Response time: 5-10 seconds (main response)
- 504 timeouts: Rare
- User experience: Good
- Pattern detection: Background (doesn't block)

---

## Files to Modify

1. `app/api/ai-pharmacist/route.ts`
   - Increase `maxDuration` to 60
   - Make pattern detection background
   - Add timeout protection

2. `lib/ai-pharmacist-service.ts`
   - Parallelize database operations

3. `app/page.tsx`
   - Fix error message

---

## Testing Checklist

After fixes:
- [ ] Text query responds within 10 seconds
- [ ] No 504 timeouts for normal queries
- [ ] Error message is accurate
- [ ] Pattern detection still works (background)
- [ ] Health profile loads correctly
- [ ] Medication stack loads correctly

---

## Summary

**Main Issue:** Pattern detection and keyword extraction are running synchronously, adding 4-6 seconds to response time, causing 504 timeouts.

**Solution:** Make pattern detection background, increase timeout, optimize database operations, fix error message.

**Expected Result:** Faster responses, no more 504 errors, better user experience.

