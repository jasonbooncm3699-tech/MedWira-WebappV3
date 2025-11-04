# Phase 2: Pattern Detection & Permission System

## Overview

Phase 2 enables the AI to detect symptom-trigger patterns, ask for user permission, and use saved patterns for personalized responses.

---

## Implementation Steps

### **Phase 2.1: Pattern Detection Logic** (1-1.5 hours)

**Goal:** Detect symptom + trigger patterns from user messages

**Implementation:**
1. **Add pattern detection function** in `lib/health-profile-service.ts`:
   ```typescript
   export async function detectPatterns(
     message: string,
     extractedKeywords: HealthKeywords
   ): Promise<PatternCandidate | null>
   ```

2. **Pattern detection rules:**
   - Symptom + Trigger mentioned in same message
   - Example: "gastric pain after eating spicy food" → pattern candidate
   - Use Gemini to detect patterns if needed

3. **Pattern candidate structure:**
   ```typescript
   interface PatternCandidate {
     symptom: string;
     trigger: string;
     confidence: number; // 0-1
     detectedAt: string;
   }
   ```

**Files to modify:**
- `lib/health-profile-service.ts` - Add `detectPatterns()` function
- `app/api/ai-pharmacist/route.ts` - Call pattern detection after keyword extraction

---

### **Phase 2.2: Permission System** (1.5-2 hours)

**Goal:** Ask user permission AFTER providing answer

**Implementation:**
1. **Modify AI response format:**
   - AI generates main answer first
   - Then appends permission prompt at the end
   - Example:
     ```
     [MAIN ANSWER]
     
     ─────────────────────────────────
     💡 I noticed this pattern: [symptom] after [trigger]. 
        Would you like me to remember this connection?
     
        [Yes, remember] [No thanks] [Maybe later]
     ```

2. **Permission prompt generation:**
   - Detect pattern → Add permission section to AI response
   - Use structured format that frontend can parse

3. **Frontend integration:**
   - Parse permission prompt from AI response
   - Display buttons for user action
   - Handle user's choice

**Files to modify:**
- `lib/ai-pharmacist-service.ts` - Add pattern detection and permission prompt generation
- `app/api/ai-pharmacist/route.ts` - Handle pattern detection and response formatting
- `app/page.tsx` - Parse and display permission buttons

---

### **Phase 2.3: Pattern Storage** (30 min)

**Goal:** Save patterns when user consents

**Implementation:**
1. **API endpoint for pattern consent:**
   - `/api/health-profile/pattern-consent` (POST)
   - Accepts: `userId`, `symptom`, `trigger`, `consent`
   - Calls `HealthProfileService.addHealthPattern()`

2. **Update health profile service:**
   - `addHealthPattern()` already exists (from Phase 1.1)
   - Verify it works with new pattern data

**Files to modify:**
- `app/api/health-profile/pattern-consent/route.ts` (NEW)
- `lib/health-profile-service.ts` - Verify `addHealthPattern()` method

---

### **Phase 2.4: Pattern Usage in AI Responses** (1 hour)

**Goal:** Use saved patterns in AI responses

**Implementation:**
1. **Already implemented in Phase 1.4:**
   - `formatHealthProfileForAI()` includes patterns
   - AI prompt includes patterns section
   - ✅ This is already done!

2. **Enhancement:**
   - AI should reference patterns naturally
   - Example: "I remember you mentioned gastric pain after spicy food before..."

**Files to modify:**
- `lib/health-profile-service.ts` - Enhance `formatHealthProfileForAI()` (if needed)
- `lib/ai-pharmacist-service.ts` - Update prompt to emphasize pattern usage

---

## Testing Checklist

### Phase 2.1: Pattern Detection
- [ ] Send message: "gastric pain after spicy food"
- [ ] Verify pattern detected: symptom="gastric pain", trigger="spicy food"
- [ ] Test with various patterns

### Phase 2.2: Permission System
- [ ] Pattern detected → Permission prompt appears in response
- [ ] Permission prompt appears AFTER main answer
- [ ] Buttons work correctly

### Phase 2.3: Pattern Storage
- [ ] User clicks "Yes, remember" → Pattern saved to database
- [ ] Verify pattern in `user_health_profiles.patterns` column
- [ ] Test pattern frequency increment

### Phase 2.4: Pattern Usage
- [ ] Send message: "Stomach pain again"
- [ ] AI references pattern: "I remember you mentioned gastric pain after spicy food..."
- [ ] Patterns used naturally in responses

---

## Dependencies

✅ **Phase 1 Complete:**
- Database table exists
- Health profile service works
- Keyword extraction works
- AI integration works

---

## Estimated Time

- Phase 2.1: 1-1.5 hours
- Phase 2.2: 1.5-2 hours
- Phase 2.3: 30 minutes
- Phase 2.4: 1 hour (mostly verification)

**Total: 4-5 hours**

---

## Next Steps

1. ✅ Verification script created
2. ✅ Medication stack integration added
3. ⏳ Start Phase 2.1: Pattern Detection Logic

