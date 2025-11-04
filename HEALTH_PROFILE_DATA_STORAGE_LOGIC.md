# Health Profile Data Storage Logic - How Data Gets Filled

## **Key Questions Answered**

### **Q1: When does the AI fill up the table?**
### **Q2: Does it store 1 row or multiple rows?**

---

## **Answer Summary**

### **✅ Single Row Per User (Accumulative Data)**

**Database Structure:**
- ✅ **ONE row per user** (UNIQUE constraint on `user_id`)
- ✅ **Arrays accumulate data** over time (symptoms[], conditions[], medications[], triggers[])
- ✅ **Profile created on FIRST chat** (even if unrelated to health)
- ✅ **Keywords extracted from EVERY message** (in background)
- ✅ **Keywords MERGED into existing arrays** (not new rows)

---

## **Detailed Flow Explanation**

### **Scenario: User Chats Gradually**

Let's trace through a user's journey:

---

### **Chat 1: Unrelated Question**
```
User: "What time does the pharmacy close?"
```

**What Happens:**
1. ✅ **Profile created** (empty row created on first interaction)
   ```sql
   INSERT INTO user_health_profiles (user_id) VALUES ('user-123');
   -- Result: 1 row created with empty arrays
   ```

2. ✅ **Keyword extraction runs** (in background)
   ```typescript
   extractHealthKeywords("What time does the pharmacy close?")
   // Result: { symptoms: [], conditions: [], medications: [], triggers: [], keywords: [] }
   ```

3. ✅ **No keywords found** → Arrays remain empty
   ```json
   {
     "user_id": "user-123",
     "symptoms": [],
     "conditions": [],
     "medications": [],
     "triggers": [],
     "extraction_count": 1
   }
   ```

**Result:** Profile row exists, but arrays are empty (no health info yet)

---

### **Chat 5: User Mentions Health Info**
```
User: "I have gastric pain after eating spicy food"
```

**What Happens:**
1. ✅ **Profile already exists** (from Chat 1)
   - No new row created
   - Uses existing row

2. ✅ **Keyword extraction runs** (in background)
   ```typescript
   extractHealthKeywords("I have gastric pain after eating spicy food")
   // Result: {
   //   symptoms: ["gastric pain"],
   //   conditions: [],
   //   medications: [],
   //   triggers: ["spicy food"],
   //   keywords: ["gastric", "pain", "spicy", "food"]
   // }
   ```

3. ✅ **Keywords MERGED into existing arrays**
   ```typescript
   // Database function: update_health_keywords()
   // Merges new keywords with existing ones
   // Deduplicates (removes duplicates)
   ```
   ```json
   // BEFORE (from Chat 1):
   {
     "symptoms": [],
     "triggers": []
   }
   
   // AFTER (Chat 5):
   {
     "symptoms": ["gastric pain"],
     "triggers": ["spicy food"],
     "extraction_count": 2  // Incremented
   }
   ```

**Result:** Same row updated, arrays now contain data

---

### **Chat 20: User Mentions More Health Info**
```
User: "I also have high blood pressure"
```

**What Happens:**
1. ✅ **Profile already exists** (same row from Chat 1)
2. ✅ **Keywords extracted:**
   ```typescript
   {
     conditions: ["high blood pressure"],
     symptoms: [],  // No new symptoms
     medications: [],
     triggers: []
   }
   ```
3. ✅ **MERGED into existing arrays:**
   ```json
   // BEFORE (from Chat 5):
   {
     "symptoms": ["gastric pain"],
     "conditions": [],
     "triggers": ["spicy food"]
   }
   
   // AFTER (Chat 20):
   {
     "symptoms": ["gastric pain"],  // Kept from Chat 5
     "conditions": ["high blood pressure"],  // Added from Chat 20
     "triggers": ["spicy food"]  // Kept from Chat 5
   }
   ```

**Result:** Same row, arrays accumulate over time

---

### **Chat 35: User Mentions Medication**
```
User: "Can I take paracetamol with my blood pressure medicine?"
```

**What Happens:**
1. ✅ **Profile already exists** (same row)
2. ✅ **Keywords extracted:**
   ```typescript
   {
     medications: ["paracetamol", "blood pressure medicine"],
     symptoms: [],
     conditions: [],
     triggers: []
   }
   ```
3. ✅ **MERGED into existing arrays:**
   ```json
   // BEFORE (from Chat 20):
   {
     "symptoms": ["gastric pain"],
     "conditions": ["high blood pressure"],
     "medications": [],
     "triggers": ["spicy food"]
   }
   
   // AFTER (Chat 35):
   {
     "symptoms": ["gastric pain"],
     "conditions": ["high blood pressure"],
     "medications": ["paracetamol", "blood pressure medicine"],  // Added
     "triggers": ["spicy food"]
   }
   ```

**Result:** Same row, all data accumulates

---

## **Database Function: How Merging Works**

### **`update_health_keywords()` Function**

From `database/CREATE_USER_HEALTH_PROFILES.sql`:

```sql
CREATE OR REPLACE FUNCTION update_health_keywords(
  user_uuid UUID,
  new_keywords TEXT[] DEFAULT NULL,
  new_symptoms TEXT[] DEFAULT NULL,
  new_conditions TEXT[] DEFAULT NULL,
  new_medications TEXT[] DEFAULT NULL,
  new_triggers TEXT[] DEFAULT NULL
)
```

**What it does:**
1. ✅ **Loads existing arrays** from current row
2. ✅ **Merges new keywords** with existing ones
3. ✅ **Deduplicates** (removes duplicates)
4. ✅ **Updates same row** (not creating new row)

**Example:**
```sql
-- Existing: symptoms = ['gastric pain']
-- New: symptoms = ['gastric pain', 'headache']
-- Result: symptoms = ['gastric pain', 'headache']  (deduplicated)
```

---

## **Key Points**

### **1. Profile Creation:**
- ✅ **Created on FIRST chat** (even if unrelated)
- ✅ **One row per user** (UNIQUE constraint)
- ✅ **Empty arrays initially** (if no health keywords)

### **2. Keyword Extraction:**
- ✅ **Runs on EVERY message** (background, non-blocking)
- ✅ **Only extracts if health keywords found**
- ✅ **If no keywords found** → Arrays stay empty (but profile row exists)

### **3. Data Storage:**
- ✅ **Single row per user** (not multiple rows)
- ✅ **Arrays accumulate** over time
- ✅ **Data merged** (not replaced)
- ✅ **Deduplication** (no duplicates)

### **4. Unrelated Chats:**
- ✅ **Profile row still created** (on first chat)
- ✅ **Arrays remain empty** (if no health keywords)
- ✅ **No error** - system handles gracefully

---

## **Visual Example**

### **Database State Over Time:**

**After Chat 1 (unrelated):**
```json
{
  "user_id": "user-123",
  "symptoms": [],
  "conditions": [],
  "medications": [],
  "triggers": [],
  "extraction_count": 1
}
```

**After Chat 5 (gastric pain):**
```json
{
  "user_id": "user-123",  // Same row
  "symptoms": ["gastric pain"],
  "conditions": [],
  "medications": [],
  "triggers": ["spicy food"],
  "extraction_count": 2
}
```

**After Chat 20 (blood pressure):**
```json
{
  "user_id": "user-123",  // Same row
  "symptoms": ["gastric pain"],  // Kept
  "conditions": ["high blood pressure"],  // Added
  "medications": [],
  "triggers": ["spicy food"],  // Kept
  "extraction_count": 3
}
```

**After Chat 35 (medications):**
```json
{
  "user_id": "user-123",  // Same row
  "symptoms": ["gastric pain"],  // Kept
  "conditions": ["high blood pressure"],  // Kept
  "medications": ["paracetamol", "blood pressure medicine"],  // Added
  "triggers": ["spicy food"],  // Kept
  "extraction_count": 4
}
```

**Result:** ✅ **1 row, accumulates data over time**

---

## **Summary**

### **Q1: When does AI fill up the table?**

**Answer:**
- ✅ **Profile row created:** On first chat (even if unrelated)
- ✅ **Keywords filled:** Only when health keywords are found in messages
- ✅ **Runs on every message:** Keyword extraction runs in background
- ✅ **Gradual accumulation:** Data builds up over multiple chats (Chat 5, 20, 35, etc.)

### **Q2: Does it store 1 row or multiple rows?**

**Answer:**
- ✅ **1 row per user** (UNIQUE constraint on `user_id`)
- ✅ **Arrays accumulate** (symptoms[], conditions[], medications[], triggers[])
- ✅ **Data merged** (not replaced)
- ✅ **No duplicates** (deduplication)

---

## **Code Implementation**

### **Profile Creation (First Chat):**
```typescript
// In lib/ai-pharmacist-service.ts
if (!healthProfile) {
  healthProfile = await HealthProfileService.initializeHealthProfile(userId);
  // Creates 1 row with empty arrays
}
```

### **Keyword Extraction (Every Chat):**
```typescript
// In app/api/ai-pharmacist/route.ts
extractKeywordsInBackground(userId, userMessage).catch(error => {
  // Runs in background, doesn't block response
});

// Only updates if keywords found
if (hasKeywords) {
  await HealthProfileService.updateHealthKeywords(userId, keywords);
  // Updates same row, merges arrays
}
```

### **Database Function (Merging):**
```sql
-- In database/CREATE_USER_HEALTH_PROFILES.sql
-- Function: update_health_keywords()
-- Merges: existing_array || new_array
-- Deduplicates: array(SELECT DISTINCT unnest(merged_array))
-- Updates: Same row (WHERE user_id = user_uuid)
```

---

## **Final Answer**

### **✅ Single Row Per User**
- **1 row per user** (never multiple rows)
- **Arrays accumulate** over time
- **Data merged** (not replaced)
- **Gradual filling** (Chat 5, 20, 35, etc.)

### **✅ Smart Extraction**
- **Profile created** on first chat (even unrelated)
- **Keywords extracted** from every message (background)
- **Only fills arrays** when health keywords found
- **Handles unrelated chats** gracefully (empty arrays OK)

**Result:** Perfect for gradual user data collection! 🎯

