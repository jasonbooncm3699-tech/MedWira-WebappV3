# Personalized Prompt Suggestions - Implementation Plan

## Overview

**Current State:** The app uses **generic, hardcoded prompt suggestions** that rotate but are the same for all users.

**Goal:** Implement **AI-decided, personalized prompt suggestions** that are dynamically generated based on each user's:
- Health profile (conditions, symptoms, medications, patterns)
- Chat history
- Personal details (age, sex, known conditions)
- Recent conversations

---

## Why This Enhancement is Needed

### Current Problem
```
Generic Prompt: "Can I take paracetamol with coffee?"
```
- Same for everyone
- Not relevant to user's specific health situation
- Doesn't help users discover what they need to know

### After Enhancement
```
Personalized Prompt (for user with gastric issues):
  "Is it safe to take painkillers if I have gastric problems?"

Personalized Prompt (for user with high BP + on medication):
  "Can I take [medicine] with my blood pressure medication?"

Personalized Prompt (for user with gout pattern):
  "What foods should I avoid to prevent gout flare-ups?"
```

---

## How the Logic Works

### Step 1: Data Collection Phase
When a user interacts with the AI, we collect:
1. **Health Profile Data** (from `user_health_profiles` table):
   - Known conditions: `['high blood pressure', 'gastric issues', 'gout']`
   - Symptoms: `['gastric pain', 'headache']`
   - Medications: `['paracetamol', 'omeprazole']`
   - Triggers: `['spicy food', 'alcohol']`
   - Patterns: `[{symptom: 'gastric pain', trigger: 'spicy food', frequency: 3}]`
   - Personal details: `{age: 45, sex: 'male'}`

2. **Chat History** (from `chat_history` table):
   - Recent questions asked
   - Topics discussed
   - Medicines inquired about

### Step 2: Prompt Generation Logic

**Option A: Gemini-Generated (Recommended for Complex Personalization)**
```typescript
// lib/prompt-suggestion-service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HealthProfileService } from './health-profile-service';
import { chatHistoryManager } from './chat-history-manager';

export interface PersonalizedPrompt {
  prompt: string;
  relevance: number; // 0-1 confidence score
  category: 'condition' | 'medication' | 'pattern' | 'prevention' | 'general';
}

/**
 * Generate personalized prompt suggestions using Gemini AI
 * Analyzes user's health profile and generates relevant questions
 */
export async function generatePersonalizedPrompts(
  userId: string,
  language: string = 'English',
  limit: number = 5
): Promise<PersonalizedPrompt[]> {
  try {
    // 1. Load user's health profile
    const healthProfile = await HealthProfileService.loadUserHealthProfile(userId);
    
    if (!healthProfile) {
      // No profile yet - return generic prompts
      return getGenericPrompts(language, limit);
    }

    // 2. Load recent chat history (last 10 conversations)
    const recentChats = await chatHistoryManager.getUserChatHistory(userId, { limit: 10 });
    const recentTopics = extractTopicsFromChats(recentChats);

    // 3. Prepare context for Gemini
    const profileContext = formatHealthProfileForPromptGeneration(healthProfile);
    const chatContext = formatChatHistoryForPromptGeneration(recentChats);

    // 4. Use Gemini to generate personalized prompts
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.7, // Slight creativity for variety
        maxOutputTokens: 1024,
      },
    });

    const prompt = `You are a helpful AI assistant that generates personalized health-related question suggestions.

USER HEALTH PROFILE:
${profileContext}

RECENT CHAT TOPICS:
${chatContext}

INSTRUCTIONS:
1. Generate ${limit} personalized question suggestions that are:
   - Relevant to this user's specific health conditions and history
   - Helpful and actionable (questions they might actually want to ask)
   - Natural language questions (not too formal)
   - Different from topics they've already discussed recently
   - Appropriate for their age and sex if relevant

2. Focus on:
   - Questions about their known conditions (${healthProfile.known_conditions?.join(', ') || 'none'})
   - Questions about their medications (${healthProfile.medications?.join(', ') || 'none'})
   - Questions about their patterns (${healthProfile.patterns?.map(p => `${p.symptom} after ${p.trigger}`).join(', ') || 'none'})
   - Prevention questions (what to avoid, how to prevent symptoms)
   - Medication safety questions (interactions, side effects)

3. Avoid:
   - Questions they've already asked (check recent topics)
   - Generic questions that apply to everyone
   - Questions that are too personal or invasive

4. Return ONLY a valid JSON array:
[
  {
    "prompt": "Question text here",
    "relevance": 0.9,
    "category": "condition"
  },
  ...
]

Return JSON:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    let jsonText = responseText.trim();
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const prompts: PersonalizedPrompt[] = JSON.parse(jsonText);

    // Validate and filter prompts
    return prompts
      .filter(p => p.prompt && p.prompt.length > 10 && p.prompt.length < 200)
      .filter(p => p.relevance >= 0.5) // Only high-relevance prompts
      .slice(0, limit)
      .map(p => ({
        prompt: p.prompt.trim(),
        relevance: Math.max(0, Math.min(1, p.relevance)),
        category: p.category || 'general'
      }));

  } catch (error) {
    console.error('❌ Error generating personalized prompts:', error);
    // Fallback to generic prompts
    return getGenericPrompts(language, limit);
  }
}

/**
 * Helper: Format health profile for prompt generation
 */
function formatHealthProfileForPromptGeneration(profile: any): string {
  const parts: string[] = [];
  
  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.sex) parts.push(`Sex: ${profile.sex}`);
  if (profile.known_conditions && profile.known_conditions.length > 0) {
    parts.push(`Known Conditions: ${profile.known_conditions.join(', ')}`);
  }
  if (profile.symptoms && profile.symptoms.length > 0) {
    parts.push(`Recent Symptoms: ${profile.symptoms.slice(-5).join(', ')}`);
  }
  if (profile.medications && profile.medications.length > 0) {
    parts.push(`Medications: ${profile.medications.join(', ')}`);
  }
  if (profile.triggers && profile.triggers.length > 0) {
    parts.push(`Triggers: ${profile.triggers.join(', ')}`);
  }
  if (profile.patterns && profile.patterns.length > 0) {
    const patternStrings = profile.patterns.map((p: any) => 
      `${p.symptom} after ${p.trigger} (${p.frequency}x)`
    );
    parts.push(`Patterns: ${patternStrings.join('; ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No health profile data yet.';
}

/**
 * Helper: Format chat history for prompt generation
 */
function formatChatHistoryForPromptGeneration(chats: any[]): string {
  if (!chats || chats.length === 0) {
    return 'No recent chat history.';
  }

  const topics = chats
    .slice(0, 10) // Last 10 conversations
    .map(chat => chat.user_message || chat.message)
    .filter(msg => msg && msg.length > 0)
    .slice(0, 5); // Top 5 recent questions

  return topics.length > 0 
    ? `Recent questions:\n${topics.map((t, i) => `${i + 1}. ${t.substring(0, 100)}`).join('\n')}`
    : 'No recent questions.';
}

/**
 * Helper: Extract topics from chat history
 */
function extractTopicsFromChats(chats: any[]): string[] {
  return chats
    .map(chat => chat.user_message || chat.message)
    .filter(msg => msg && msg.length > 0)
    .slice(0, 10);
}

/**
 * Fallback: Generic prompts if personalization fails
 */
function getGenericPrompts(language: string, limit: number): PersonalizedPrompt[] {
  const genericPrompts: { [key: string]: string[] } = {
    'English': [
      'Can I take paracetamol with coffee?',
      'What happens if I take medicine after drinking alcohol?',
      'Can I eat durian with my medicine?',
      'What medicine should I avoid before surgery?',
      'Are there any side effects I should watch for?'
    ],
    'Chinese': [
      '我可以和咖啡一起服用扑热息痛吗？',
      '喝酒后服药会怎样？',
      '我可以和榴莲一起吃药吗？',
      '手术前应该避免什么药物？',
      '我应该注意哪些副作用？'
    ],
    'Malay': [
      'Bolehkah saya ambil paracetamol dengan kopi?',
      'Apa yang berlaku jika saya ambil ubat selepas minum alkohol?',
      'Bolehkah saya makan durian dengan ubat saya?',
      'Ubat apa yang patut saya elakkan sebelum pembedahan?',
      'Adakah kesan sampingan yang perlu saya perhatikan?'
    ],
    'Indonesian': [
      'Bisakah saya minum parasetamol dengan kopi?',
      'Apa yang terjadi jika saya minum obat setelah minum alkohol?',
      'Bisakah saya makan durian dengan obat saya?',
      'Obat apa yang harus saya hindari sebelum operasi?',
      'Apakah ada efek samping yang harus saya perhatikan?'
    ]
  };

  const prompts = genericPrompts[language] || genericPrompts['English'];
  return prompts.slice(0, limit).map(prompt => ({
    prompt,
    relevance: 0.5,
    category: 'general' as const
  }));
}
```

**Option B: Template-Based (Faster, Less Personalization)**
```typescript
/**
 * Generate personalized prompts using templates
 * Faster but less sophisticated than Gemini generation
 */
export function generatePersonalizedPromptsFromTemplates(
  healthProfile: any,
  language: string = 'English',
  limit: number = 5
): PersonalizedPrompt[] {
  const prompts: PersonalizedPrompt[] = [];
  const templates: { [key: string]: { [condition: string]: string[] } } = {
    'English': {
      'high blood pressure': [
        'Can I take this medicine with my blood pressure medication?',
        'What foods should I avoid with high blood pressure?',
        'Are there any medicine interactions I should know about?'
      ],
      'gastric issues': [
        'Is this medicine safe for my stomach?',
        'Can I take painkillers if I have gastric problems?',
        'What foods should I avoid with gastric issues?'
      ],
      'gout': [
        'What foods trigger gout flare-ups?',
        'Can I take this medicine if I have gout?',
        'How can I prevent gout attacks?'
      ],
      'diabetes': [
        'Can I take this medicine if I have diabetes?',
        'Will this medicine affect my blood sugar?',
        'What should I watch for with diabetes medications?'
      ]
    }
    // Add more languages...
  };

  // Generate prompts based on conditions
  if (healthProfile.known_conditions) {
    for (const condition of healthProfile.known_conditions) {
      const conditionPrompts = templates[language]?.[condition];
      if (conditionPrompts) {
        prompts.push(...conditionPrompts.map(p => ({
          prompt: p,
          relevance: 0.8,
          category: 'condition' as const
        })));
      }
    }
  }

  // Generate prompts based on patterns
  if (healthProfile.patterns && healthProfile.patterns.length > 0) {
    healthProfile.patterns.forEach((pattern: any) => {
      prompts.push({
        prompt: `How can I prevent ${pattern.symptom} after ${pattern.trigger}?`,
        relevance: 0.9,
        category: 'pattern' as const
      });
    });
  }

  // Return top prompts by relevance
  return prompts
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}
```

---

## Implementation Steps

### Phase 1: Create Prompt Suggestion Service (1 hour)

1. **Create `lib/prompt-suggestion-service.ts`**
   - Implement `generatePersonalizedPrompts()` function
   - Add Gemini-based generation logic
   - Add template-based fallback
   - Add caching mechanism (cache prompts for 5-10 minutes)

2. **Create API Endpoint: `app/api/prompt-suggestions/route.ts`**
   ```typescript
   // GET /api/prompt-suggestions?userId=xxx&language=English
   export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url);
     const userId = searchParams.get('userId');
     const language = searchParams.get('language') || 'English';

     if (!userId) {
       return NextResponse.json({ error: 'User ID required' }, { status: 400 });
     }

     const prompts = await generatePersonalizedPrompts(userId, language, 5);
     return NextResponse.json({ prompts });
   }
   ```

### Phase 2: Frontend Integration (1 hour)

1. **Update `app/page.tsx`**
   - Replace hardcoded `getPromptSuggestions()` with API call
   - Add loading state for prompt generation
   - Cache prompts in component state (refresh every 5-10 minutes)
   - Show "Generating personalized suggestions..." while loading

2. **Update UI Display**
   - Show personalized prompts instead of generic ones
   - Add visual indicator (e.g., "💡 Personalized for you")
   - Allow users to dismiss prompts they don't want

### Phase 3: Caching & Performance (30 min)

1. **Add Prompt Caching**
   - Cache prompts in Redis/Upstash (if available)
   - Or cache in component state + localStorage
   - Cache key: `prompts:${userId}:${language}`
   - Cache duration: 5-10 minutes

2. **Optimize Generation**
   - Generate prompts in background (don't block UI)
   - Pre-generate on login or after significant health profile updates
   - Limit generation frequency (max once per 5 minutes per user)

### Phase 4: Testing & Refinement (30 min)

1. **Test Cases**
   - User with no health profile → generic prompts
   - User with gastric issues → gastric-related prompts
   - User with high BP + medications → interaction prompts
   - User with patterns → prevention prompts
   - Multi-language support

2. **Track Metrics**
   - Which prompts users click
   - Which prompts are most useful
   - User feedback on relevance

---

## Example Flow

### Scenario: User with Gastric Issues

**Step 1: User Profile**
```json
{
  "known_conditions": ["gastric issues"],
  "symptoms": ["gastric pain", "bloating"],
  "medications": ["omeprazole"],
  "patterns": [
    {"symptom": "gastric pain", "trigger": "spicy food", "frequency": 3}
  ],
  "age": 35,
  "sex": "male"
}
```

**Step 2: Gemini Generates Prompts**
```json
[
  {
    "prompt": "Can I take painkillers if I have gastric problems?",
    "relevance": 0.95,
    "category": "condition"
  },
  {
    "prompt": "What foods should I avoid to prevent gastric pain?",
    "relevance": 0.9,
    "category": "prevention"
  },
  {
    "prompt": "Can I take omeprazole with other medicines?",
    "relevance": 0.85,
    "category": "medication"
  },
  {
    "prompt": "How long should I wait after eating spicy food before taking medicine?",
    "relevance": 0.8,
    "category": "pattern"
  }
]
```

**Step 3: Frontend Displays**
```
💡 Personalized for you:
┌─────────────────────────────────────────────┐
│ Can I take painkillers if I have gastric   │
│ problems?                                   │
└─────────────────────────────────────────────┘
```

**Step 4: User Clicks Prompt**
- Prompt is inserted into input field
- User can edit or send directly
- AI responds with personalized advice

---

## Performance Considerations

### API Cost
- **Gemini API Call:** ~$0.001 per generation (5 prompts)
- **Frequency:** Once per 5-10 minutes per user
- **Cost per 1000 users:** ~$0.10 per day (very low)

### Response Time
- **Gemini Generation:** 1-2 seconds
- **With Caching:** < 50ms (instant)
- **Background Generation:** No user wait time

### Optimization Strategies
1. **Cache prompts** for 5-10 minutes
2. **Pre-generate** on login or profile update
3. **Background generation** (don't block UI)
4. **Fallback to templates** if Gemini fails
5. **Limit generation frequency** (max once per 5 min)

---

## Success Metrics

### Relevance
- ✅ Prompts are relevant to user's health profile
- ✅ Prompts are different from what they've already asked
- ✅ Prompts are helpful and actionable

### User Engagement
- ✅ Users click personalized prompts more than generic ones
- ✅ Users find prompts helpful (feedback)
- ✅ Prompts lead to meaningful conversations

### Performance
- ✅ Prompt generation < 2 seconds
- ✅ Cached prompts load instantly
- ✅ No UI blocking during generation

---

## Next Steps

1. **Implement Phase 1** (Prompt Suggestion Service)
2. **Implement Phase 2** (Frontend Integration)
3. **Test with real users**
4. **Refine based on feedback**
5. **Add analytics tracking**

---

## Estimated Timeline

- **Phase 1:** 1 hour
- **Phase 2:** 1 hour
- **Phase 3:** 30 minutes
- **Phase 4:** 30 minutes
- **Total:** 3 hours

---

## Dependencies

- ✅ `user_health_profiles` table (already implemented)
- ✅ `chat_history` table (already exists)
- ✅ Gemini API access (already configured)
- ✅ Health Profile Service (already implemented)
- ✅ Chat History Manager (already exists)

**All dependencies are ready!** We can proceed with implementation immediately.

