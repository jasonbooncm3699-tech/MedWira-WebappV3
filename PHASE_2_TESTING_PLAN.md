# Phase 2 Testing Plan & Pre-Commit Checklist

## **Pre-Commit Error Check**

### **✅ TypeScript Compilation:**
- ✅ Fixed: `extractHealthKeywords` function signature
- ✅ Fixed: `detectPatterns` function signature
- ✅ All TypeScript errors resolved

### **✅ Linter Check:**
- ✅ No linter errors found
- ⚠️ Some warnings (React hooks, image optimization) - non-critical

---

## **Testing Plan**

### **Test 1: Pattern Detection (Phase 2.1)**

**Test Cases:**
1. **Clear Pattern:**
   ```
   Input: "I have gastric pain after eating spicy food"
   Expected: Pattern detected (symptom="gastric pain", trigger="spicy food")
   ```

2. **No Pattern (symptom only):**
   ```
   Input: "I have gastric pain"
   Expected: No pattern (missing trigger)
   ```

3. **No Pattern (trigger only):**
   ```
   Input: "I ate spicy food"
   Expected: No pattern (missing symptom)
   ```

4. **Pattern with Confidence:**
   ```
   Input: "Headache when I drink coffee"
   Expected: Pattern detected (confidence > 0.5)
   ```

**How to Test:**
```typescript
// Test in API route or test script
const pattern = await detectPatterns(
  "gastric pain after spicy food",
  undefined,
  "English"
);
console.log('Pattern detected:', pattern);
```

---

### **Test 2: Permission Prompt (Phase 2.2)**

**Test Cases:**
1. **Permission Prompt Appears:**
   ```
   Input: "gastric pain after spicy food"
   Expected: Permission prompt in response
   ```

2. **Permission Prompt NOT Appears:**
   ```
   Input: "What is paracetamol?"
   Expected: No permission prompt (no pattern)
   ```

3. **Multi-Language:**
   ```
   Input: "gastric pain after spicy food" (English)
   Expected: "Would you like me to remember this connection?"
   
   Input: Same (Chinese)
   Expected: "您希望我记住这个关联吗？"
   ```

**How to Test:**
- Send message via API
- Check response `data.detectedPattern`
- Check response `data.message` contains permission prompt

---

### **Test 3: Pattern Storage (Phase 2.3)**

**Test Cases:**
1. **User Consents:**
   ```
   POST /api/health-profile/pattern-consent
   Body: { userId, symptom: "gastric pain", trigger: "spicy food", consent: true }
   Expected: Pattern saved to database
   ```

2. **User Declines:**
   ```
   POST /api/health-profile/pattern-consent
   Body: { userId, symptom: "gastric pain", trigger: "spicy food", consent: false }
   Expected: Pattern NOT saved (but API returns success)
   ```

3. **Pattern Frequency Increment:**
   ```
   - Save pattern first time → frequency = 1
   - Save same pattern again → frequency = 2
   ```

**How to Test:**
```sql
-- Check database
SELECT patterns FROM user_health_profiles WHERE user_id = 'your-user-id';
-- Should see pattern in JSONB array
```

---

### **Test 4: Pattern Usage (Phase 2.4)**

**Test Cases:**
1. **Pattern Referenced:**
   ```
   Step 1: Save pattern ("gastric pain" after "spicy food")
   Step 2: Ask: "Stomach pain again"
   Expected: AI mentions pattern: "I remember you mentioned gastric pain after spicy food..."
   ```

2. **Pattern Not Referenced:**
   ```
   Step 1: No pattern saved
   Step 2: Ask: "Stomach pain"
   Expected: AI doesn't mention pattern (no pattern exists)
   ```

**How to Test:**
- Save pattern via API
- Send message asking about symptom
- Check AI response for pattern reference

---

### **Test 5: End-to-End Flow**

**Complete Flow Test:**
```
1. User sends: "gastric pain after spicy food"
   ✅ Keywords extracted
   ✅ Pattern detected
   ✅ Permission prompt shown

2. User clicks "Yes, remember"
   ✅ Pattern saved to database

3. User sends: "Stomach pain again"
   ✅ AI references pattern
   ✅ Personalized response
```

---

## **Database Testing**

### **Test 1: Keywords Extraction**

**SQL Query:**
```sql
-- Check keywords extracted
SELECT 
  symptoms,
  conditions,
  medications,
  triggers,
  extraction_count,
  last_extraction_at
FROM user_health_profiles
WHERE user_id = 'your-user-id';
```

**Expected:**
- Keywords arrays populated
- `extraction_count` incremented
- `last_extraction_at` updated

---

### **Test 2: Pattern Storage**

**SQL Query:**
```sql
-- Check patterns saved
SELECT 
  patterns,
  pattern_tracking_consent,
  consent_given_at
FROM user_health_profiles
WHERE user_id = 'your-user-id';
```

**Expected:**
- `patterns` JSONB contains pattern
- Pattern has: symptom, trigger, frequency, confirmed

---

## **API Testing**

### **Test 1: Text Question with Pattern**

**Request:**
```bash
POST /api/ai-pharmacist
{
  "userMessage": "gastric pain after spicy food",
  "userId": "user-123",
  "language": "English"
}
```

**Expected Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "message": "[AI Answer]\n\n[Permission Prompt]",
    "detectedPattern": {
      "symptom": "gastric pain",
      "trigger": "spicy food",
      "confidence": 0.9
    }
  }
}
```

---

### **Test 2: Pattern Consent**

**Request:**
```bash
POST /api/health-profile/pattern-consent
{
  "userId": "user-123",
  "symptom": "gastric pain",
  "trigger": "spicy food",
  "consent": true
}
```

**Expected Response:**
```json
{
  "status": "SUCCESS",
  "message": "Pattern saved successfully",
  "data": {
    "symptom": "gastric pain",
    "trigger": "spicy food",
    "saved": true
  }
}
```

---

## **Error Scenarios**

### **Test 1: Missing User ID**
```
Input: No userId
Expected: Error response (400)
```

### **Test 2: Invalid Pattern Data**
```
Input: Missing symptom or trigger
Expected: Error response (400)
```

### **Test 3: Database Error**
```
Input: Valid data but database error
Expected: Graceful error handling (500)
```

---

## **Pre-Commit Checklist**

### **Code Quality:**
- [x] TypeScript compilation passes
- [x] No linter errors
- [x] All imports correct
- [x] Function signatures match

### **Functionality:**
- [ ] Pattern detection works
- [ ] Permission prompt appears
- [ ] Pattern consent API works
- [ ] Patterns saved to database
- [ ] Patterns used in AI responses

### **Error Handling:**
- [x] Try-catch blocks in place
- [x] Graceful fallbacks
- [x] Error logging

### **Documentation:**
- [x] Code comments added
- [x] Phase 2 documentation complete

---

## **Quick Test Script**

**Create test file: `test-phase2.ts`:**

```typescript
// Quick test for Phase 2
import { detectPatterns, extractHealthKeywords } from './lib/health-profile-service';

async function testPhase2() {
  // Test 1: Pattern Detection
  const pattern = await detectPatterns(
    "gastric pain after spicy food",
    undefined,
    "English"
  );
  console.log('Pattern detected:', pattern);
  
  // Test 2: Keyword Extraction
  const keywords = await extractHealthKeywords(
    "I have gastric pain and high blood pressure",
    "English"
  );
  console.log('Keywords:', keywords);
}

testPhase2();
```

---

## **Recommended Testing Order**

1. ✅ **Fix TypeScript Errors** (done)
2. ⏳ **Test Pattern Detection** (manual test)
3. ⏳ **Test Permission Prompt** (manual test)
4. ⏳ **Test Pattern Storage** (API test)
5. ⏳ **Test Pattern Usage** (end-to-end test)
6. ⏳ **Test Database** (SQL queries)
7. ⏳ **Test Error Scenarios** (edge cases)

---

## **Status**

**Pre-Commit:**
- ✅ TypeScript errors fixed
- ✅ Linter check passed
- ⏳ Manual testing needed

**Ready for:**
- ⏳ Testing
- ⏳ Git commit (after testing)

