# Feature 3 & 7 Integration Plan - Food Photo Analysis & Timeline Visualization

## Overview
This document outlines how to integrate Feature 3 (Food Photo Analysis) and Feature 7 (Health Timeline Visualization) into the PWA for full functionality.

---

## Feature 3: Food Photo Analysis with Trigger Warnings

### **What It Does:**
- User uploads food photo using existing camera function
- AI analyzes food for ingredients
- Cross-references with user's health profile triggers
- Warns about potential triggers proactively
- Suggests safer alternatives

### **Integration Approach:**

#### **Option A: Enhance Existing `/api/analyze-image` Route** (Recommended)
**Strategy:** Add food detection to existing image analysis route

**Advantages:**
- ✅ Reuse existing image upload flow
- ✅ Same camera function
- ✅ Same UI components
- ✅ Minimal code changes

**Implementation:**
```typescript
// In /api/analyze-image/route.ts
// Step 1: Detect if image is food or medicine
const imageType = await detectImageType(imageBase64);

if (imageType === 'food') {
  // Food analysis flow
  return await analyzeFoodPhoto(imageBase64, userId, language);
} else if (imageType === 'medicine') {
  // Existing medicine analysis flow
  return await geminiAnalyzer.analyzeMedicineImageWithStatus(...);
}
```

#### **Option B: Separate `/api/analyze-food` Route**
**Strategy:** Create new dedicated route for food analysis

**Advantages:**
- ✅ Clear separation of concerns
- ✅ Easier to maintain
- ✅ More flexible

**Disadvantages:**
- ❌ Duplicate image handling logic
- ❌ Need to update UI to route correctly

**Recommendation:** Use **Option A** - enhance existing route

---

## Feature 7: Health Timeline Visualization

### **What It Does:**
- User requests: "Show timeline" or "Show me my health timeline"
- AI generates visual graph/timeline
- Shows symptom frequency over time
- Identifies trigger patterns
- Visual representation in chat or separate view

### **Integration Approach:**

#### **Option A: Inline Chart in Chat** (Recommended for PWA)
**Strategy:** Display chart component within chat message

**Advantages:**
- ✅ Works well in PWA (no separate page)
- ✅ Integrated with chat flow
- ✅ Responsive to mobile/desktop

**Implementation:**
```typescript
// User sends: "Show timeline"
// AI detects request and generates:
{
  message: "Here's your health timeline:",
  chartData: {
    symptoms: [...],
    timeline: [...],
    patterns: [...]
  },
  messageType: 'timeline' // Special message type
}

// UI component renders chart based on messageType
```

#### **Option B: Modal/Overlay View**
**Strategy:** Show chart in modal overlay

**Advantages:**
- ✅ Larger viewing area
- ✅ Better for detailed charts

**Disadvantages:**
- ❌ More complex UI state
- ❌ Less integrated with chat

**Recommendation:** Use **Option A** - inline chart in chat

---

## Updated 2-Day Implementation Plan (Including Features 3 & 7)

### **DAY 1: Foundation & Core Features** (7-8 hours)

#### **Phase 1: Database Setup & Basic Memory** (3.5-4 hours)
- ✅ Step 1.1: Create `user_health_profiles` table
- ✅ Step 1.2: Create health profile service
- ✅ Step 1.3: Keyword extraction + Symptom logging
- ✅ Step 1.4: Integrate with AI pharmacist
- ✅ Phase 1 Testing

#### **Phase 2: Pattern Detection & Permission** (3-4 hours)
- ✅ Step 2.1: Pattern detection logic
- ✅ Step 2.2: Permission prompt UI
- ✅ Step 2.3: Pattern saving
- ✅ Step 2.4: Pattern usage in AI
- ✅ Phase 2 Testing

---

### **DAY 2: Advanced Features & Visualization** (10-12 hours)

#### **Phase 3: Personal Details & Follow-up Questions** (3.5-4 hours)
- ✅ Step 3.1: Personal details extraction
- ✅ Step 3.2: Natural question flow + Follow-up questions
- ✅ Step 3.3: Save personal details
- ✅ Step 3.4: Use personal details in AI
- ✅ Phase 3 Testing

#### **Phase 4: Food Photo Analysis (Feature 3)** (2-3 hours) **[NEW]**
- ✅ Step 4.1: Image type detection (food vs medicine)
- ✅ Step 4.2: Food photo analysis function
- ✅ Step 4.3: Trigger matching logic
- ✅ Step 4.4: Warning generation
- ✅ Step 4.5: Safer alternatives suggestion
- ✅ Step 4.6: Integration with existing image route
- ✅ Phase 4 Testing

#### **Phase 5: Timeline Visualization (Feature 7)** (2-3 hours) **[NEW]**
- ✅ Step 5.1: Chart library selection & installation
- ✅ Step 5.2: Timeline data aggregation
- ✅ Step 5.3: Chart component creation
- ✅ Step 5.4: Integration with chat UI
- ✅ Step 5.5: Timeline request detection
- ✅ Step 5.6: Multi-device responsive design
- ✅ Phase 5 Testing

#### **Phase 6: Personalized Prompts & Health Summary** (2 hours)
- ✅ Step 6.1: Prompt generation logic
- ✅ Step 6.2: Integration with UI
- ✅ Step 6.3: Health timeline text summary
- ✅ Phase 6 Testing

#### **Phase 7: Final Testing & Bug Fixes** (2-3 hours)
- ✅ Step 7.1: End-to-end testing (all features)
- ✅ Step 7.2: Performance testing
- ✅ Step 7.3: Bug fixes
- ✅ Step 7.4: Documentation

---

## Feature 3: Food Photo Analysis - Detailed Implementation

### **Step 4.1: Image Type Detection**

**Function:**
```typescript
async function detectImageType(imageBase64: string): Promise<'food' | 'medicine' | 'unknown'> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  
  const prompt = `Analyze this image and determine if it contains:
  - Food/meal items (return "FOOD")
  - Medicine/packaging (return "MEDICINE")
  - Neither (return "UNKNOWN")
  
  Respond with ONLY one word: FOOD, MEDICINE, or UNKNOWN`;
  
  const response = await model.generateContent([prompt, {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    }
  }]);
  
  const result = response.response.text().trim().toUpperCase();
  
  if (result.includes('FOOD')) return 'food';
  if (result.includes('MEDICINE')) return 'medicine';
  return 'unknown';
}
```

**Integration:**
```typescript
// In /api/analyze-image/route.ts
const imageType = await detectImageType(imageBase64);

if (imageType === 'food') {
  // Route to food analysis
  return await analyzeFoodPhoto(imageBase64, userId, language);
} else {
  // Existing medicine analysis
  return await geminiAnalyzer.analyzeMedicineImageWithStatus(...);
}
```

---

### **Step 4.2: Food Photo Analysis Function**

**Function:**
```typescript
async function analyzeFoodPhoto(
  imageBase64: string,
  userId: string,
  language: string
): Promise<FoodAnalysisResult> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  
  // Load user health profile
  const healthProfile = await loadUserHealthProfile(userId);
  const triggers = healthProfile?.triggers || [];
  const patterns = healthProfile?.patterns || [];
  
  // Analyze food photo
  const foodAnalysisPrompt = `Analyze this food image and extract:
  1. Food name/type
  2. Main ingredients
  3. Potential triggers (spicy, acidic, allergens, etc.)
  
  Return JSON:
  {
    "foodName": "curry",
    "ingredients": ["chili peppers", "curry powder", "coconut milk"],
    "potentialTriggers": ["spicy", "dairy"]
  }`;
  
  const response = await model.generateContent([foodAnalysisPrompt, {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    }
  }]);
  
  const analysis = JSON.parse(response.response.text());
  
  // Check against user's triggers
  const matchedTriggers = checkTriggerMatches(analysis.ingredients, triggers, patterns);
  
  // Generate personalized response
  const personalizedResponse = generateFoodWarning(
    analysis,
    matchedTriggers,
    healthProfile,
    language
  );
  
  return {
    success: true,
    foodName: analysis.foodName,
    ingredients: analysis.ingredients,
    warnings: matchedTriggers.length > 0 ? personalizedResponse.warnings : null,
    alternatives: matchedTriggers.length > 0 ? personalizedResponse.alternatives : null,
    message: personalizedResponse.message
  };
}
```

---

### **Step 4.3: Trigger Matching Logic**

**Function:**
```typescript
function checkTriggerMatches(
  ingredients: string[],
  userTriggers: string[],
  patterns: any[]
): MatchedTrigger[] {
  const matched: MatchedTrigger[] = [];
  
  // Check ingredient → trigger matches
  for (const ingredient of ingredients) {
    const normalizedIngredient = ingredient.toLowerCase();
    
    // Check direct trigger matches
    for (const trigger of userTriggers) {
      const normalizedTrigger = trigger.toLowerCase();
      
      // Semantic matching
      if (isTriggerMatch(normalizedIngredient, normalizedTrigger)) {
        matched.push({
          ingredient,
          trigger,
          pattern: null,
          confidence: 0.9
        });
      }
    }
    
    // Check pattern matches
    for (const pattern of patterns) {
      if (pattern.trigger && isTriggerMatch(normalizedIngredient, pattern.trigger.toLowerCase())) {
        matched.push({
          ingredient,
          trigger: pattern.trigger,
          pattern: pattern,
          confidence: 0.85
        });
      }
    }
  }
  
  return matched;
}

function isTriggerMatch(ingredient: string, trigger: string): boolean {
  // Direct match
  if (ingredient.includes(trigger) || trigger.includes(ingredient)) {
    return true;
  }
  
  // Semantic matching dictionary
  const semanticMap: { [key: string]: string[] } = {
    'spicy': ['chili', 'pepper', 'curry', 'hot', 'spice'],
    'alcohol': ['beer', 'wine', 'liquor', 'alcoholic'],
    'dairy': ['milk', 'cheese', 'butter', 'cream'],
    'seafood': ['fish', 'shrimp', 'crab', 'seafood'],
    'acidic': ['citrus', 'lemon', 'vinegar', 'tomato']
  };
  
  // Check semantic matches
  for (const [key, synonyms] of Object.entries(semanticMap)) {
    if (trigger === key && synonyms.some(syn => ingredient.includes(syn))) {
      return true;
    }
    if (synonyms.includes(trigger) && ingredient.includes(key)) {
      return true;
    }
  }
  
  return false;
}
```

---

### **Step 4.4: Warning Generation**

**Function:**
```typescript
function generateFoodWarning(
  analysis: FoodAnalysis,
  matchedTriggers: MatchedTrigger[],
  healthProfile: HealthProfile,
  language: string
): PersonalizedWarning {
  if (matchedTriggers.length === 0) {
    return {
      message: `This looks like ${analysis.foodName}. Enjoy!`,
      warnings: null,
      alternatives: null
    };
  }
  
  // Generate personalized warning
  const triggerDescriptions = matchedTriggers.map(mt => {
    if (mt.pattern) {
      return `You mentioned ${mt.pattern.symptom} after ${mt.pattern.trigger} before. 
              This food contains ${mt.ingredient} which might trigger similar symptoms.`;
    } else {
      return `You mentioned ${mt.trigger} as a trigger before. 
              This food contains ${mt.ingredient} which might cause issues.`;
    }
  });
  
  const warningMessage = `⚠️ **Trigger Warning:**
  
${triggerDescriptions.join('\n\n')}

**Safer Alternatives:**
${generateAlternatives(analysis, matchedTriggers, language)}

Would you like me to suggest a modified version of this dish?`;
  
  return {
    message: warningMessage,
    warnings: triggerDescriptions,
    alternatives: generateAlternatives(analysis, matchedTriggers, language)
  };
}

function generateAlternatives(
  analysis: FoodAnalysis,
  matchedTriggers: MatchedTrigger[],
  language: string
): string[] {
  // Generate safer alternatives based on triggers
  // Example: If spicy trigger, suggest milder version
  const alternatives: string[] = [];
  
  for (const trigger of matchedTriggers) {
    if (trigger.trigger.toLowerCase().includes('spicy')) {
      alternatives.push(`Milder version: Use less chili, add turmeric and ginger instead`);
    }
    if (trigger.trigger.toLowerCase().includes('alcohol')) {
      alternatives.push(`Alcohol-free version: Use broth or non-alcoholic cooking wine`);
    }
    // Add more alternatives...
  }
  
  return alternatives;
}
```

---

### **Step 4.5: Integration with Existing Route**

**Updated `/api/analyze-image/route.ts`:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, language = 'English', allergy, userId } = body;
    
    // NEW: Detect image type first
    const imageType = await detectImageType(imageBase64);
    
    if (imageType === 'food') {
      // NEW: Food photo analysis flow
      const foodResult = await analyzeFoodPhoto(imageBase64, userId, language);
      
      // Save to chat history
      if (userId && foodResult.success) {
        await saveChatMessage({
          user_id: userId,
          message_type: 'user',
          message_text: 'Uploaded food photo for analysis',
          image_url: imageBase64,
          session_id: sessionId,
          // ...
        });
        
        await saveChatMessage({
          user_id: userId,
          message_type: 'ai',
          ai_response: foodResult.message,
          // ...
        });
      }
      
      return NextResponse.json({
        status: 'SUCCESS',
        data: {
          type: 'food',
          foodName: foodResult.foodName,
          ingredients: foodResult.ingredients,
          warnings: foodResult.warnings,
          alternatives: foodResult.alternatives,
          message: foodResult.message
        }
      });
    } else {
      // Existing medicine analysis flow
      const result = await geminiAnalyzer.analyzeMedicineImageWithStatus(...);
      // ... existing code
    }
  } catch (error) {
    // ...
  }
}
```

---

## Feature 7: Health Timeline Visualization - Detailed Implementation

### **Step 5.1: Chart Library Selection**

**Recommended: Recharts** (React-friendly, PWA-compatible)

**Why Recharts:**
- ✅ React-native integration
- ✅ Responsive design
- ✅ Lightweight (~200KB)
- ✅ Works in PWA
- ✅ Mobile-friendly
- ✅ No external dependencies

**Installation:**
```bash
npm install recharts
```

**Alternative: Chart.js** (if Recharts has issues)
- ✅ Very popular
- ✅ Good mobile support
- ✅ Slightly larger bundle

---

### **Step 5.2: Timeline Data Aggregation**

**Function:**
```typescript
async function generateTimelineData(userId: string): Promise<TimelineData> {
  const { supabase } = await import('@/lib/supabase');
  const healthProfile = await loadUserHealthProfile(userId);
  
  // Get chat history for timeline
  const { data: chatHistory } = await supabase
    .from('chat_history')
    .select('created_at, message_text, ai_response')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  // Aggregate symptom frequency by week/month
  const symptomFrequency = aggregateSymptomFrequency(chatHistory, healthProfile);
  
  // Aggregate trigger frequency
  const triggerFrequency = aggregateTriggerFrequency(healthProfile);
  
  // Extract patterns timeline
  const patternsTimeline = extractPatternsTimeline(healthProfile);
  
  return {
    symptomFrequency, // [{ week: 'Week 1', symptoms: {...} }, ...]
    triggerFrequency, // { 'spicy food': 5, 'alcohol': 2 }
    patternsTimeline, // [{ date: '2024-01-15', pattern: {...} }, ...]
    dateRange: {
      start: chatHistory[0]?.created_at,
      end: chatHistory[chatHistory.length - 1]?.created_at
    }
  };
}

function aggregateSymptomFrequency(
  chatHistory: any[],
  healthProfile: HealthProfile
): SymptomFrequencyData[] {
  // Group by week
  const weeklyData = new Map<string, { [symptom: string]: number }>();
  
  chatHistory.forEach(chat => {
    const week = getWeekKey(chat.created_at);
    if (!weeklyData.has(week)) {
      weeklyData.set(week, {});
    }
    
    const weekData = weeklyData.get(week)!;
    
    // Count symptoms mentioned in this chat
    healthProfile.symptoms?.forEach(symptom => {
      if (chat.message_text?.toLowerCase().includes(symptom.toLowerCase()) ||
          chat.ai_response?.toLowerCase().includes(symptom.toLowerCase())) {
        weekData[symptom] = (weekData[symptom] || 0) + 1;
      }
    });
  });
  
  // Convert to array format for chart
  return Array.from(weeklyData.entries()).map(([week, symptoms]) => ({
    week,
    ...symptoms
  }));
}
```

---

### **Step 5.3: Chart Component Creation**

**Component: `components/HealthTimelineChart.tsx`**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HealthTimelineChartProps {
  timelineData: TimelineData;
}

export function HealthTimelineChart({ timelineData }: HealthTimelineChartProps) {
  // Transform data for Recharts
  const chartData = timelineData.symptomFrequency.map(week => ({
    week: week.week,
    ...week.symptoms
  }));
  
  // Get unique symptoms for lines
  const symptoms = new Set<string>();
  chartData.forEach(data => {
    Object.keys(data).forEach(key => {
      if (key !== 'week') symptoms.add(key);
    });
  });
  
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];
  
  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          {Array.from(symptoms).map((symptom, index) => (
            <Line
              key={symptom}
              type="monotone"
              dataKey={symptom}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### **Step 5.4: Integration with Chat UI**

**Updated Chat Message Display:**

```typescript
// In app/page.tsx or message component
function MessageBubble({ message }: { message: ChatMessage }) {
  // Check if message contains timeline request
  if (message.messageType === 'timeline' && message.chartData) {
    return (
      <div className="ai-message">
        <div className="message-content">{message.content}</div>
        <HealthTimelineChart timelineData={message.chartData} />
      </div>
    );
  }
  
  // Regular message display
  return <div className="message">{message.content}</div>;
}
```

---

### **Step 5.5: Timeline Request Detection**

**Function:**
```typescript
// In ai-pharmacist-service.ts or health-profile-service.ts
function isTimelineRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const timelineKeywords = [
    'show timeline',
    'show me my health timeline',
    'health timeline',
    'my health summary',
    'show my health',
    'health chart',
    'symptom chart',
    'visualize my health'
  ];
  
  return timelineKeywords.some(keyword => lowerMessage.includes(keyword));
}

// In AI pharmacist service
if (isTimelineRequest(userMessage)) {
  // Generate timeline data
  const timelineData = await generateTimelineData(userId);
  
  // Return timeline response
  return {
    success: true,
    message: "Here's your health timeline:",
    messageType: 'timeline',
    chartData: timelineData
  };
}
```

---

### **Step 5.6: Mobile Responsive Design**

**Responsive Chart Sizing:**
```typescript
// Use ResponsiveContainer from Recharts
<ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
  <LineChart data={chartData}>
    {/* Chart config */}
  </LineChart>
</ResponsiveContainer>
```

**Mobile Optimizations:**
- ✅ Smaller chart height on mobile (200px vs 300px)
- ✅ Touch-friendly tooltips
- ✅ Horizontal scroll if needed
- ✅ Simplified legend on mobile

---

## Updated File Structure

### **New Files:**
```
lib/
  ├── food-analysis-service.ts          (NEW - Feature 3)
  ├── health-profile-service.ts         (EXISTING)
  └── timeline-service.ts               (NEW - Feature 7)

components/
  ├── HealthTimelineChart.tsx           (NEW - Feature 7)
  └── FoodAnalysisWarning.tsx          (NEW - Feature 3 - Optional)

app/api/
  └── analyze-image/route.ts           (UPDATE - Add food detection)
```

---

## Testing Checklist

### **Feature 3: Food Photo Analysis**
- [ ] Test: Upload food photo → Detects as food (not medicine)
- [ ] Test: Upload medicine photo → Detects as medicine (not food)
- [ ] Test: Food analysis extracts ingredients correctly
- [ ] Test: Trigger matching works (spicy food → gastric trigger)
- [ ] Test: Warning message appears correctly
- [ ] Test: Safer alternatives suggested
- [ ] Test: Works on mobile (camera function)
- [ ] Test: Works on desktop (file upload)
- [ ] Test: Multi-language support

### **Feature 7: Timeline Visualization**
- [ ] Test: User requests "show timeline" → Chart appears
- [ ] Test: Chart displays symptom frequency correctly
- [ ] Test: Chart displays trigger frequency correctly
- [ ] Test: Chart displays patterns correctly
- [ ] Test: Chart responsive on mobile
- [ ] Test: Chart responsive on desktop
- [ ] Test: Touch interactions work on mobile
- [ ] Test: Chart renders in chat UI
- [ ] Test: Performance (chart loads < 2 seconds)

---

## Time Allocation for Features 3 & 7

### **Feature 3: Food Photo Analysis** (2-3 hours)
- Step 4.1: Image type detection (30 min)
- Step 4.2: Food analysis function (45 min)
- Step 4.3: Trigger matching logic (30 min)
- Step 4.4: Warning generation (30 min)
- Step 4.5: Integration (30 min)
- Step 4.6: Testing (15 min)

### **Feature 7: Timeline Visualization** (2-3 hours)
- Step 5.1: Chart library setup (15 min)
- Step 5.2: Data aggregation (45 min)
- Step 5.3: Chart component (1 hour)
- Step 5.4: Chat integration (30 min)
- Step 5.5: Request detection (15 min)
- Step 5.6: Mobile responsive (30 min)
- Testing (15 min)

**Total Additional Time:** 4-6 hours

---

## Updated 2-Day Timeline

### **Day 1:** (7-8 hours)
- Phase 1: Database & Memory (3.5-4 hours)
- Phase 2: Pattern & Permission (3-4 hours)

### **Day 2:** (12-14 hours) **[EXTENDED]**
- Phase 3: Personal Details (3.5-4 hours)
- Phase 4: Food Photo Analysis (2-3 hours) **[NEW]**
- Phase 5: Timeline Visualization (2-3 hours) **[NEW]**
- Phase 6: Personalized Prompts (2 hours)
- Phase 7: Final Testing (2-3 hours)

**Total:** 19-22 hours over 2 days

---

## Recommendations

### **Option A: Full Implementation (All Features)**
- **Timeline:** 2 days (12-14 hours per day)
- **Coverage:** All 10 features + bonuses
- **Risk:** Higher - tight timeline

### **Option B: Phased Implementation**
- **Day 1:** Core features (Phase 1-3)
- **Day 2:** Features 3 & 7 + Testing
- **Timeline:** Can extend to 3 days if needed
- **Risk:** Lower - more realistic

### **Option C: MVP + Features 3 & 7**
- **Day 1:** Core features only
- **Day 2:** Features 3 & 7 + Testing
- **Timeline:** 2 days focused on features 3 & 7
- **Risk:** Medium

---

**Status:** 🔴 **UPDATED PLAN WITH FEATURES 3 & 7**

**Next Steps:**
1. Choose implementation option (A, B, or C)
2. Confirm timeline (2 days vs 3 days)
3. Start implementation with Feature 3 or 7
4. Test after each feature integration

