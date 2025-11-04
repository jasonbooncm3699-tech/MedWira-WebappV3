# Medication Stack Suggestion Logic

## **When to Suggest Adding Medicine to Medication Stack**

### **Scenario 1: After Medicine Image Analysis** ✅

**Flow:**
```
User uploads medicine image
    ↓
AI analyzes image → Identifies medicine
    ↓
AI returns result with medicine details:
  - medicine_name: "Paracetamol 500mg"
  - generic_name: "Paracetamol"
  - dosage: "500mg"
    ↓
┌─────────────────────────────────────┐
│ SUGGESTION TRIGGERED                │
│                                      │
│ Check: Is this a medicine the user  │
│        might be taking?              │
│                                      │
│ Conditions to show suggestion:       │
│ 1. Medicine name is identified       │
│ 2. User is authenticated             │
│ 3. Medicine not already in stack     │
└─────────────────────────────────────┘
    ↓
Display suggestion in UI:
┌─────────────────────────────────────┐
│ 💊 Would you like to add this to     │
│    your medication stack?             │
│                                      │
│    [Yes, add it] [No thanks]         │
└─────────────────────────────────────┘
    ↓
If user clicks "Yes":
  → Save to user_medication_stack
  → Show success message
```

**When to show:**
- ✅ After successful image analysis
- ✅ When medicine name is identified
- ✅ When medicine is not already in user's stack

**When NOT to show:**
- ❌ If medicine name is unclear/unknown
- ❌ If user already has this medicine in stack
- ❌ If user is not authenticated

---

### **Scenario 2: After Text Question About Medicine** ✅

**Flow:**
```
User asks: "Can I take paracetamol with my blood pressure medicine?"
    ↓
AI analyzes question
    ↓
AI identifies medicine mentioned: "paracetamol"
    ↓
AI generates response
    ↓
┌─────────────────────────────────────┐
│ SUGGESTION TRIGGERED                │
│                                      │
│ Check: Did user mention a medicine   │
│        they might be taking?          │
│                                      │
│ Conditions to show suggestion:       │
│ 1. Medicine clearly identified      │
│ 2. Context suggests user might take  │
│    this medicine                      │
│ 3. Medicine not already in stack     │
└─────────────────────────────────────┘
    ↓
Display suggestion at end of AI response:
┌─────────────────────────────────────┐
│ [AI Response]                        │
│ ...                                  │
│                                      │
│ ─────────────────────────────────── │
│ 💡 I noticed you mentioned           │
│    paracetamol. Would you like to    │
│    add it to your medication stack?  │
│                                      │
│    [Yes, add it] [No thanks]         │
└─────────────────────────────────────┘
```

**When to show:**
- ✅ After text question mentioning medicine
- ✅ When medicine is clearly identified
- ✅ When context suggests user might be taking it
- ✅ When medicine not already in stack

**When NOT to show:**
- ❌ If user is just asking about medicine (not taking it)
- ❌ If medicine is unclear/ambiguous
- ❌ If medicine already in stack

---

## **Logic Implementation**

### **Step 1: Detect Medicine Mention**

**From Image Analysis:**
```typescript
// After image analysis
if (result.success && result.medicineName) {
  const medicineDetected = {
    name: result.medicineName,
    genericName: result.genericName,
    dosage: result.dosage,
    activeIngredients: result.activeIngredients
  };
  
  // Check if already in stack
  const isInStack = await checkIfInMedicationStack(userId, medicineDetected.name);
  
  if (!isInStack) {
    // Show suggestion
    return {
      ...result,
      suggestMedicationStack: true,
      medicineDetails: medicineDetected
    };
  }
}
```

**From Text Question:**
```typescript
// After AI response generation
const mentionedMedicines = extractMedicinesFromMessage(userMessage);

if (mentionedMedicines.length > 0) {
  // Check each medicine
  for (const medicine of mentionedMedicines) {
    const isInStack = await checkIfInMedicationStack(userId, medicine);
    
    if (!isInStack && isLikelyUserMedication(userMessage, medicine)) {
      // Show suggestion
      return {
        ...result,
        suggestMedicationStack: true,
        medicineDetails: { name: medicine }
      };
    }
  }
}
```

---

### **Step 2: Determine if User is Taking Medicine**

**Heuristics:**
```typescript
function isLikelyUserMedication(message: string, medicine: string): boolean {
  const lowerMessage = message.toLowerCase();
  const lowerMedicine = medicine.toLowerCase();
  
  // Patterns that suggest user is taking medicine
  const patterns = [
    `i take ${lowerMedicine}`,
    `i'm taking ${lowerMedicine}`,
    `i use ${lowerMedicine}`,
    `my ${lowerMedicine}`,
    `${lowerMedicine} with my`,
    `taking ${lowerMedicine}`
  ];
  
  return patterns.some(pattern => lowerMessage.includes(pattern));
}
```

**Examples:**
- ✅ "I take paracetamol" → Yes, suggest
- ✅ "Can I take paracetamol with my blood pressure medicine?" → Yes, suggest
- ❌ "What is paracetamol?" → No, don't suggest
- ❌ "Tell me about paracetamol" → No, don't suggest

---

### **Step 3: Display Suggestion**

**UI Location:**
- **After Image Analysis:** Show at bottom of analysis result
- **After Text Question:** Show at end of AI response message

**UI Format:**
```typescript
// In frontend component
{result.suggestMedicationStack && (
  <div className="medication-suggestion">
    <p>💊 Would you like to add <strong>{result.medicineDetails.name}</strong> to your medication stack?</p>
    <div className="buttons">
      <button onClick={() => addToMedicationStack(result.medicineDetails)}>
        Yes, add it
      </button>
      <button onClick={() => dismissSuggestion()}>
        No thanks
      </button>
    </div>
  </div>
)}
```

---

### **Step 4: Handle User Response**

**If User Clicks "Yes":**
```typescript
async function addToMedicationStack(medicineDetails: {
  name: string;
  genericName?: string;
  dosage?: string;
  activeIngredients?: string;
}) {
  // Save to user_medication_stack
  const { error } = await supabase
    .from('user_medication_stack')
    .insert({
      user_id: userId,
      medicine_name: medicineDetails.name,
      generic_name: medicineDetails.genericName || null,
      dosage: medicineDetails.dosage || null,
      active_ingredients: medicineDetails.activeIngredients || null,
      is_active: true,
      start_date: new Date().toISOString()
    });
  
  if (!error) {
    // Show success message
    showSuccessMessage(`Added ${medicineDetails.name} to your medication stack`);
  }
}
```

**If User Clicks "No thanks":**
```typescript
function dismissSuggestion() {
  // Just hide the suggestion
  // Don't ask again for this session
  setShowSuggestion(false);
}
```

---

## **Implementation Priority**

### **Phase 1 (Now):**
1. ✅ Extract keywords from image analysis → Save to health profile
2. ✅ Add `suggestMedicationStack` flag to response
3. ⚠️ Frontend UI (can be simple button for now)

### **Phase 2 (Later):**
1. ✅ Smart detection (is user taking medicine?)
2. ✅ Better UI/UX
3. ✅ Don't show if already in stack

---

## **Summary**

### **When to Suggest:**

**After Image Analysis:**
- ✅ Always suggest (if medicine identified)
- ✅ User can accept or decline

**After Text Question:**
- ✅ Only if medicine clearly mentioned
- ✅ Only if context suggests user is taking it
- ✅ Don't suggest if just asking about medicine

### **Logic Flow:**

```
Medicine Detected
    ↓
Check: Already in stack?
    ↓ (No)
Check: Is user taking it? (for text questions)
    ↓ (Yes)
Show Suggestion
    ↓
User chooses:
├─ Yes → Save to medication_stack
└─ No → Dismiss
```

---

## **Next Steps**

1. ✅ Implement image analysis enhancement (extract keywords)
2. ✅ Add suggestion flag to API response
3. ✅ Add simple frontend UI (can enhance later)
4. ✅ Test with image analysis
5. ✅ Test with text questions (Phase 2)

Ready to implement! 🚀

