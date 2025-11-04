# AI Enhancement v3 - MedWira Smart Memory System

## Vision
Make MedWira AI "more human" by understanding users through conversation history. Become the first question users ask before seeing a doctor or pharmacy.

## Positioning Statement
**Why MedWira over ChatGPT/Claude/Gemini?**
- ✅ **Remembers**: Builds health profile through conversations
- ✅ **Learns**: Progressive understanding of user patterns
- ✅ **Personalized**: Context-aware responses based on history
- ✅ **24/7 Available**: First contact for health questions
- ✅ **No Forms**: Natural conversation, no questionnaires

---

## Feature Summary - 10 Workable Features

### 1. Conversational Memory System
**What it does:**
- Extracts health keywords from every conversation
- Builds user health profile automatically
- Uses context in future conversations
- No form filling required

**Example:**
```
User (Chat 1): "What medicine for gastric pain?"
AI: [Provides answer]

User (Chat 2, 2 weeks later): "Having stomach pain again"
AI: "I remember you mentioned gastric pain before. Is this the same trigger? 
This helps me give better advice."
```

### 2. Pattern Recognition (Smart Inference)
**What it does:**
- Identifies connections between symptoms and triggers
- Learns cause-effect relationships naturally
- Asks permission to save patterns

**Example:**
```
User: "Having ankle pain after drinking beer"
AI: [Provides answer about pain management]
THEN...
AI: "That pattern - alcohol + ankle pain - could indicate gout. 
Would you like me to remember this connection for future recommendations?"

[User clicks: Yes]

Next time:
User: "What medicine for ankle pain?"
AI: "I remember alcohol triggered this before. This might be gout-related. 
Here's what helps..."
```

### 3. Food Photo Analysis with Trigger Warnings
**What it does:**
- Analyzes food photos for ingredients
- Cross-references with user's health profile
- Warns about potential triggers proactively
- Suggests safer alternatives

**Example:**
```
User: [Uploads curry photo]
AI: "This contains chili peppers. You mentioned gastric pain after 
spicy food before. This might trigger discomfort. Want me to suggest 
a gentler version?"

User: "Okay"
AI: "Try turmeric ginger curry instead. Same flavor, gentler on stomach."
```

### 3.5. Allergy Photo Analysis with Intelligent Requests (NEW)
**What it does:**
- AI proactively asks for allergy photos when user mentions allergies
- Analyzes allergy photos (rashes, swelling, skin conditions)
- Cross-references with user's health profile (known allergies, medications)
- Provides personalized allergy advice and safety warnings

**Example 1 - Proactive Request:**
```
User: "I have a rash on my arm"
AI: "A rash can have several causes. To give you the most accurate 
diagnosis and treatment recommendations, could you upload a photo of 
the affected area? This will help me better assess the severity."

User: [Uploads photo]
AI: "Based on the photo and your known allergies to [X], this appears 
to be [type]. Given your current medications [Y], here's what to do..."
```

**Example 2 - Direct Upload:**
```
User: [Uploads allergy photo directly]
AI: "I can see this appears to be an allergic reaction. Based on your 
health profile (known allergies to [X]), this might be caused by... 
Here's my personalized recommendation..."
```

### 4. Natural Follow-up Questions
**What it does:**
- Asks relevant questions during conversation
- Gathers context naturally (not form-like)
- Provides better personalized advice

**Example:**
```
User: "Having stomach pain"
AI: "To give you the best advice, I need to understand:
1. When did it start?
2. What did you eat today?
3. Pain level 1-10?"

[User answers all]
AI: "Based on your answers and history, likely gastritis. 
Here's what helps..."
```

### 5. Health Timeline (User-Requested)
**What it does:**
- Shows health trends when user asks
- Visualizes pattern data from chat history
- Helps identify recurring issues

**Example:**
```
User: "Show me my health summary"
AI: "Based on your chats this month:
• Gastric pain: 3 times (triggers: spicy food, late dinner)
• Ankle pain: 2 times (triggers: alcohol, seafood)
• Pattern: gastric pain usually after 8pm meals"
```

### 6. Permission & Consent (During Conversation)
**What it does:**
- Asks permission before saving patterns
- Transparency in data usage
- User controls what's remembered

**Example:**
```
User: "Ankle pain after drinking"
AI: [Provides answer]
THEN...
AI: "I've noticed ankle pain after alcohol twice. Want me to save this 
pattern to give better advice next time?"
[Yes | No Thanks | Maybe Later]

User clicks "Yes"
AI: "Saved! This will help me give personalized recommendations."
```

### 7. Health Timeline Visualization
**What it does:**
- Visual graph/timeline when user requests
- Shows symptom frequency
- Identifies trigger patterns

**Example:**
```
User: "Show timeline"
AI: [Displays graph]
"Your health patterns:
• Gastric issues peaked Week 2 (3 mentions)
• Ankle pain Week 3-4 (alcohol-related)
• Trigger frequency: spicy food (5x), alcohol (2x)"
```

### 8. Symptom Logging
**What it does:**
- User can explicitly log symptoms
- AI tracks and cross-references
- Creates organized health log

**Example:**
```
User: "Logging symptoms: gastric pain, ankle pain, headaches"
AI: "I've saved your symptoms. When you mention them, I'll provide 
contextualized advice."
```

### 9. Smart Contextual Reminders
**What it does:**
- Suggests related topics during conversation
- Appears as helpful buttons (not proactive)
- User chooses to explore

**Example:**
```
User: "What medicine for stomach?"
AI: [Provides answer]
THEN...
AI: "I noticed you asked about trigger foods earlier. Want suggestions 
for stomach-friendly foods?"
[Button appears - user chooses to explore]
```

### 10. Database Integration with Context
**What it does:**
- Uses NPRA database
- Checks interactions with user's profile
- Provides personalized safety information

**Example:**
```
User: "Can I take Medicine X with my current meds?"
AI: "Checking your medication history... You're taking [Med A]. 
Medicine X interacts with Med A. Here's safer alternative: [Med B]..."
```

---

## Features REMOVED (Impossible)
❌ AI initiating conversations (push notifications)
❌ Proactive health check-ins
❌ Out-of-app messaging
❌ Any AI-initiated communication

**Reason:** In a PWA chat interface, AI can ONLY respond. It cannot start conversations.

---

---

## Brainstorming Decisions (User Input)

### 1. Permission System
✅ **Decision:** Add from day 1
- Build permission system from the start
- Don't wait to add it later

### 2. Keyword Extraction Method
✅ **Decision:** Use Gemini for extraction
- More accurate than simple keyword matching
- Better context understanding
- Normalizes: "stomach" = "gastric" = "abdomen"

### 3. Photo Upload Location
✅ **Decision:** Use existing camera function
- User can take photo using camera button
- No new UI needed
- Same flow as medicine photo

### 4. Profile Visibility
✅ **Decision:** No profile view/edit UI
- User just chats naturally
- AI handles everything in background
- Invisible magic - user doesn't see database

### 5. Permission Prompt Timing
⏳ **Pending Advice:**
- User suggested: After 3 chats
- Need technical recommendation

**Curious's Advice on Timing:**
I recommend: Ask permission **immediately on first mention of a pattern**

**Rationale:**
- 3 chats too late - user already mentioned symptom 3x, AI hasn't learned
- Better to ask: "You mentioned ankle pain + alcohol. Want me to remember this?"
- More natural, like human would ask in real conversation
- First mention = best moment (user thinking about it)

**Timing Strategy:**
```
Chat 1: "Ankle pain after beer"
AI: [Answer] + "This pattern could be gout. Want me to remember this?"

Chat 2: [AI uses saved pattern]
User: "Ankle pain again"
AI: "I remember you mentioned alcohol triggers this..."
```

**Alternative:** If 3-chat rule preferred:
- Track 3 mentions of same symptom
- Then ask: "I noticed ankle pain 3 times. Want me to track patterns?"

### 6. Gemini Extraction Approach
**Strategy:** Use Gemini with structured output
```typescript
Prompt: "Extract health keywords from: '{message}'
Return JSON: {
  keywords: string[],
  symptoms: string[],
  conditions: string[],
  medications: string[],
  triggers: string[]
}"
```

**Why Gemini over simple matching:**
- Handles typos: "gout" vs "goute"
- Understands context: "stomach ache" = gastric
- Multi-language ready
- Improves over time

---

## Implementation Priority (Updated)

### Phase 1: Core Memory System ✅
1. Create `user_health_profiles` table
2. Build `health-context-extractor.ts` using Gemini
3. Update AI pharmacist to use profile from day 1
4. Add permission prompt system from day 1
5. Test: 1 chat → extract → ask permission → next chat uses memory

### Phase 2: Smart Features
6. Pattern detection (trigger: symptom)
7. Cross-reference food photos with triggers
8. Test: Full flow with 3-5 chats

### Phase 3: Advanced Features
9. Timeline visualization (if user asks)
10. Follow-up questions during conversation
11. Complete user journey testing

---

## Technical Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Permission timing | First mention | Natural, immediate feedback |
| Extraction method | Gemini AI | Accuracy > speed |
| Profile visibility | Hidden | Natural UX, invisible magic |
| Photo location | Existing camera | No new UI needed |
| Permission from start | Yes | Build right way from day 1 |

---

## Cost Considerations

### Gemini API Usage
- **Current:** 1 call per chat (medicine analysis)
- **New:** 2 calls per chat (medicine + extraction)
- **Cost Impact:** ~2x API costs
- **Mitigation:** Can batch extraction with main analysis in single call

### Database Storage
- Each user profile: ~1-5KB
- 10,000 users: ~50MB
- Negligible storage cost

---

## Success Metrics

### Phase 1 Success (Basic Memory)
- ✅ Keyword extraction accuracy > 90%
- ✅ Permission prompt shows after 1st pattern mention
- ✅ Next chat uses saved pattern
- ✅ User feels "AI remembers me"

### Phase 2 Success (Smart Features)
- ✅ 3 patterns saved per user (on average)
- ✅ Food trigger warnings work
- ✅ AI provides contextual answers

### Phase 3 Success (Advanced)
- ✅ Users ask for timeline (>20%)
- ✅ Pattern accuracy >80%
- ✅ User retention improves by 30%

---

## Implementation Status
🔴 **BEFORE IMPLEMENTING** - Brainstorming phase complete
⏳ Ready for implementation discussion

