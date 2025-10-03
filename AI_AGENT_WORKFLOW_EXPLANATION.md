# 🤖 AI Agent Workflow - Complete Explanation

## 🔄 **Complete Workflow from Image Upload to Analysis**

### **1. User Uploads Medicine Image**
```
User clicks camera/image icon → Captures image → Converts to base64 → Calls analyzeMedicineImage()
```

### **2. Frontend Processing**
```javascript
// app/page.tsx - analyzeMedicineImage function
const analyzeMedicineImage = async (imageBase64: string) => {
  // Creates user message with image
  const userMessage = {
    id: Date.now().toString(),
    type: 'user',
    content: "I've uploaded an image of a medicine for identification.",
    image: imageBase64
  };
  
  // Calls API endpoint
  const response = await fetch('/api/analyze-medicine-medgemma', {
    method: 'POST',
    body: JSON.stringify({
      image_data: imageBase64,
      text_query: "Please analyze this medicine image and provide detailed information.",
      user_id: user?.id
    })
  });
}
```

### **3. API Route Processing**
```javascript
// app/api/analyze-medicine-medgemma/route.ts
export async function POST(request: NextRequest) {
  const { image_data, user_id, text_query } = await request.json();
  
  // Validates parameters
  if (!image_data && !text_query) {
    return NextResponse.json({ status: "ERROR", message: "Image data or text query required." }, { status: 400 });
  }
  
  // Calls Gemini pipeline
  const result = await runGeminiPipeline(image_data, text_query, user_id);
  
  return NextResponse.json(result.data);
}
```

### **4. Gemini 1.5 Pro Two-Step Pipeline**

#### **Step 1: Image Analysis & Tool Signaling**
```javascript
// src/services/geminiAgent.js
async function runGeminiPipeline(base64Image, textQuery, userId) {
  // 1. Token deduction
  if (!await decrementToken(userId)) {
    return { status: "ERROR", message: "Out of tokens. Please renew your subscription." };
  }
  
  // 2. First Gemini call - Image Analysis
  const firstPrompt = buildGeminiSystemPrompt(true, null, TOOL_CALL_SCHEMA);
  const contentParts = [
    { text: firstPrompt },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
    { text: `User Query: ${textQuery}` }
  ];
  
  const result = await chat.sendMessage(contentParts);
  const firstResponse = result.response.text();
  
  // Expected response format:
  // ```json
  // {
  //   "tool_call": {
  //     "name": "npra_product_lookup",
  //     "parameters": {
  //       "product_name": "Paracetamol 500mg",
  //       "registration_number": "MAL12345678"
  //     }
  //   }
  // }
  // ```
}
```

#### **Step 2: NPRA Database Lookup**
```javascript
// Parse tool signal and execute NPRA lookup
const jsonMatch = firstResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
if (jsonMatch) {
  const jsonSignal = JSON.parse(jsonMatch[1]);
  const { product_name, registration_number } = jsonSignal.tool_call.parameters;
  
  // Execute NPRA database lookup
  const npraResult = await npraProductLookup(product_name, registration_number);
}
```

#### **NPRA Database Query**
```javascript
// src/utils/npraDatabase.ts
export async function npraProductLookup(productName: string, regNumber?: string) {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('medicines') // public.medicines table with 27,175 medicines
    .select('id, reg_no, npra_product, description, status, holder, text')
    .ilike('npra_product', `%${productName}%`);
    
  if (regNumber) {
    query = query.or(`reg_no.eq.${regNumber},npra_product.ilike.%${productName}%`);
  }
  
  const { data, error } = await query.limit(1).single();
  
  // Returns official NPRA data:
  // {
  //   "id": "123",
  //   "reg_no": "MAL12345678",
  //   "npra_product": "Paracetamol 500mg Tablets",
  //   "status": "Active",
  //   "holder": "Pharma Company Sdn Bhd"
  // }
}
```

#### **Step 3: Final Augmentation & Report Generation**
```javascript
// Second Gemini call with NPRA data
const finalPrompt = buildGeminiSystemPrompt(false, npraResult, null);
const finalContentParts = [
  { text: finalPrompt },
  { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
  { text: `User Query: ${textQuery}` }
];

const result = await chat.sendMessage(finalContentParts);
const finalText = result.response.text();

// Expected structured response:
// ```json
// {
//   "status": "SUCCESS",
//   "data": {
//     "packaging_detected": "White tablets in blister pack with '500mg' printed",
//     "medicine_name": "Paracetamol 500mg Tablets - Active ingredient: Paracetamol",
//     "purpose": "Pain relief and fever reduction",
//     "dosage_instructions": "Adults: 1-2 tablets every 4-6 hours, max 8 tablets/day",
//     "side_effects": "Rare: skin rash, liver damage with overdose",
//     "allergy_warning": "Do not use if allergic to paracetamol",
//     "drug_interactions": "May interact with warfarin, alcohol",
//     "safety_notes": "Do not exceed recommended dose, avoid with alcohol",
//     "storage": "Store at room temperature, protect from moisture"
//   }
// }
// ```
```

### **5. Token Management**
```javascript
// Before processing starts
export async function decrementToken(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  // Check current tokens
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('token_count')
    .eq('id', userId)
    .single();
    
  if (profile.token_count <= 0) {
    return false; // No tokens available
  }
  
  // Decrement tokens
  const newCount = profile.token_count - 1;
  await supabase
    .from('profiles')
    .update({ token_count: newCount })
    .eq('id', userId);
    
  return true;
}
```

### **6. Response Handling**
```javascript
// Frontend receives structured response
if (response.status === 200 && result.status === 'SUCCESS') {
  const structuredMessage = {
    id: (Date.now() + 1).toString(),
    type: 'structured',
    content: `**Medicine Analysis Complete**\n\n**Medicine:** ${result.data?.medicine_name}\n**Purpose:** ${result.data?.purpose}`,
    structuredData: result.data // Full 9-section medical report
  };
  
  setMessages(prev => [...prev, structuredMessage]);
}
```

---

## 🔍 **Issue Resolution**

### **Problem Identified**
The error "Requested function was not found" occurred because:
1. **Frontend image upload** was calling `/api/analyze-medicine-enhanced` (old endpoint)
2. **Text queries** were calling `/api/analyze-medicine-medgemma` (new endpoint)
3. **API response format** mismatch between old and new systems

### **Solution Applied**
1. **✅ Updated image upload** to use `/api/analyze-medicine-medgemma`
2. **✅ Fixed request format** to match new API: `image_data`, `text_query`, `user_id`
3. **✅ Updated response handling** to use new format: `result.status`, `result.data.medicine_name`
4. **✅ Removed deprecated fields** like `tokensRemaining`

### **Complete Data Flow**
```
User Image → Frontend (base64) → API Route → Gemini Pipeline → NPRA Database → Final Report → User
```

---

## 🎯 **Expected Results**

### **Successful Analysis Output**
- **Medicine Name**: Official NPRA product name + active ingredients
- **Purpose**: Medical indications and uses
- **Dosage**: Adult and pediatric recommendations
- **Side Effects**: Common and serious effects
- **Allergy Warnings**: Key ingredient warnings
- **Drug Interactions**: Major interactions
- **Safety Notes**: Pregnancy, driving, conditions
- **Storage**: Proper storage conditions

### **Database Integration**
- **27,175 medicines** in NPRA database
- **Official registration numbers** (MAL/NOT format)
- **Product holders** and status information
- **Comprehensive descriptions** and active ingredients

### **Cost Control**
- **Token deduction** before processing
- **User authentication** required
- **Usage tracking** and limits
- **Error handling** for insufficient tokens

---

## 🚀 **Status: READY FOR TESTING**

The AI agent workflow is now properly configured and should work correctly for medicine image analysis!
