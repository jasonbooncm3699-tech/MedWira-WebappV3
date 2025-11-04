# Integration: user_medication_stack with user_health_profiles

## Table Relationship

### **Existing Table: `user_medication_stack`**
**Purpose:** Track user's current medications with detailed info
**Status:** ✅ Already exists

**Columns:**
- `id`, `user_id`
- `medicine_name`, `generic_name`, `active_ingredients`
- `start_date`, `end_date`, `frequency`, `dosage`
- `is_active`, `notes`

**Used For:**
- Current medication tracking
- Medication interaction checking
- Detailed medication information

---

### **New Table: `user_health_profiles`**
**Purpose:** Health profile with extracted keywords and patterns
**Status:** ✅ Created

**Columns:**
- `medications[]` - Array of medications mentioned (from AI extraction)
- `symptoms[]`, `conditions[]`, `triggers[]` - Health keywords
- `patterns` - Symptom-trigger patterns

**Used For:**
- AI context (quick lookup)
- Pattern detection
- Health profile for AI personalization

---

## Integration Strategy

### **Option A: Use Both Tables Separately** (Recommended) ✅

**Strategy:**
1. **`user_medication_stack`** → Current medications (detailed)
   - For medication interaction checking
   - For user context in AI prompts
   - For medication management

2. **`user_health_profiles.medications[]`** → AI-extracted keywords
   - Medications mentioned in conversations
   - May include medications user asked about (not necessarily taking)
   - Quick reference for AI context

**Implementation:**
```typescript
// Load current medications from user_medication_stack for user context
async function getUserContextForAI(userId: string) {
  // Get current medications from medication stack
  const { data: medications } = await supabase
    .from('user_medication_stack')
    .select('medicine_name, generic_name, active_ingredients')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  // Get health profile for AI context
  const healthProfile = await HealthProfileService.loadUserHealthProfile(userId);
  
  // Combine for AI context
  return {
    currentMedications: medications || [],
    healthProfile: healthProfile,
    // Use medication_stack for interactions
    // Use health_profile.medications[] for AI context
  };
}
```

**Why This Works:**
- ✅ Don't duplicate data
- ✅ Each table serves different purpose
- ✅ `medication_stack` has more details (frequency, dates)
- ✅ `health_profiles.medications[]` is for quick AI context

---

## Recommended Implementation

### **Update AI Pharmacist Service to Use Both:**

```typescript
// In handleTextOnlyQuery() or handleConversation()

// Step 1: Load current medications from user_medication_stack
const { data: currentMedications } = await supabase
  .from('user_medication_stack')
  .select('medicine_name, generic_name, active_ingredients, frequency')
  .eq('user_id', userId)
  .eq('is_active', true);

// Step 2: Load health profile (has extracted medications)
const healthProfile = await HealthProfileService.loadUserHealthProfile(userId);

// Step 3: Format for AI context
const userContext = {
  currentMedications: currentMedications || [], // From medication_stack (detailed)
  medications: healthProfile?.medications || [], // From health_profiles (extracted)
  symptoms: healthProfile?.symptoms || [],
  conditions: healthProfile?.conditions || [],
  triggers: healthProfile?.triggers || [],
  patterns: healthProfile?.patterns || []
};
```

---

## Current Code Status

### **✅ Already Integrated (Phase 1.4):**
- Health profile loading works
- AI uses profile context in prompts
- Keyword extraction works

### **⏳ Needs Integration:**
- Load medications from `user_medication_stack` for user context
- Combine with health profile for complete context

---

## Recommended Next Steps

### **Option 1: Enhance Phase 1.4** (Quick Fix - 15 min)

**Add medication_stack loading:**

```typescript
// In lib/ai-pharmacist-service.ts handleTextOnlyQuery()

// Load current medications from medication_stack
let currentMedicationsFromStack = [];
if (userId) {
  try {
    const { data } = await supabase
      .from('user_medication_stack')
      .select('medicine_name, generic_name, active_ingredients, frequency')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    currentMedicationsFromStack = data || [];
  } catch (error) {
    console.error('Error loading medication stack:', error);
  }
}

// Use in userContext
userContext.currentMedications = currentMedicationsFromStack.map(m => ({
  name: m.medicine_name,
  activeIngredients: m.active_ingredients,
  frequency: m.frequency
}));
```

**Time:** +15 minutes to Phase 1.4

---

### **Option 2: Keep As Is** (Recommended for Now)

**Why:**
- Phase 1.4 works as is
- Can enhance medication loading later
- `user_medication_stack` integration can be separate feature

**Recommendation:**
- ✅ Continue with Phase 2
- ✅ Add medication_stack integration later if needed

---

## Final Recommendation

### **✅ Proceed to Phase 2** (Keep medication_stack separate for now)

**Rationale:**
1. Phase 1.4 works without medication_stack integration
2. Health profile already provides medication context (from extraction)
3. Can enhance medication_stack integration later
4. Keep Phase 1 simple and working

**If Needed Later:**
- Can add medication_stack loading to Phase 1.4 enhancement
- Or create separate feature for medication management

---

**Status:** ✅ **Phase 1 Complete - Ready for Phase 2**

**Next Step:** Proceed to Phase 2 (Pattern Detection & Permission System)

**Medication Stack:** Can integrate later if needed (not critical for Phase 1)

