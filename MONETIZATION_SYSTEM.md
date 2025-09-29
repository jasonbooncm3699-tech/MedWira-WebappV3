# MedWira AI - Monetization System Documentation

## 🎯 FINAL PRICING STRUCTURE

### 💰 TOKEN ECONOMY OVERVIEW

**📊 PROPOSED VALUE PROPOSITION:**
- **High Profit Margins:** 85-92.5% across all tiers
- **Market Competitiveness:** Positioned between free and premium medical apps
- **Clear Value Progression:** Incentivizes upgrades
- **Viral Growth Potential:** Referral rewards both users

---

## 🆓 FREE TIER SYSTEM

### New User Onboarding
- **Welcome Tokens:** 30 free tokens for new signups
- **Purpose:** Allow users to experience core functionality
- **Usage:** 30 medicine scans typically covers 1-2 weeks of testing

### Referral Program
- **Referring User Reward:** +30 tokens for each successful referral
- **New User Bonus:** +30 tokens for signing up via referral link
- **Total Distribution:** 60 tokens per referral (30 + 30)
- **Growth Impact:** Creates viral loop for organic user acquisition

---

## 💳 SUBSCRIPTION PACKAGES

### 🥉 Starter Pack - RM19.90
- **Tokens Provided:** 50 tokens
- **Cost Per Token:** RM0.398
- **Profit Margin:** 92.5% (RM0.368 profit/token)
- **Target Audience:** Price-sensitive users needing occasional scans
- **Use Case:** 50 scans ≈ 2-3 months of typical usage

### 🥈 Standard Pack - RM49.90  
- **Tokens Provided:** 200 tokens
- **Cost Per Token:** RM0.250 (37% discount vs Starter)
- **Profit Margin:** 88% (RM0.220 profit/token)
- **Target Audience:** Regular users with moderate scanning needs
- **Use Case:** 200 scans ≈ 6-8 months of typical usage

### 🥇 Premium Pack - RM99.90
- **Tokens Provided:** 500 tokens
- **Cost Per Token:** RM0.200 (50% discount vs Starter)
- **Profit Margin:** 85% (RM0.170 profit/token)
- **Target Audience:** Heavy users needing extensive scanning
- **Use Case:** 500 scans ≈ 12-18 months of typical usage

---

## 💡 OPERATIONAL COST BREAKDOWN

### Per-Token Costs (RM)
- **Gemini 1.5 Pro API:** ~RM0.030
- **Supabase Storage:** ~RM0.0001
- **Vercel Serverless:** ~RM0.00005
- **Payment Processing:** ~RM0.010 (Stripe 2.9% + fees)
- **Total Operational Cost:** ~RM0.040

### Infrastructure Costs (Monthly)
- **Vercel:** Free tier
- **Supabase:** Free tier (0-500MB)
- **Stripe:** $0 (only transaction fees)
- **Total Monthly:** RM0-20 for MVP

---

## 🎯 REVENUE PROJECTIONS

### Conservative Estimates (100 paying users/month)
- **Average Revenue:** RM35-45 per user
- **Monthly Revenue:** RM3,500-4,501
- **Monthly Costs:** RM1,000-2,000
- **Net Profit:** RM2,500-2,501 (71-56% margin)

### Growth Targets (Year 1)
- **Month 6:** 500 paying users (~RM15,000/month)
- **Month 12:** 1,000 paying users (~RM30,000/month)
- **Break-even:** 20-30 paying users/month

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase C: Token System Implementation
1. **Database Updates**
   - Add referral_code field to users table
   - Create token_transactions table
   - Add token_balance tracking
   
2. **Payment Integration**
   - Stripe payment processing
   - Subscription management
   - Token allocation system
   
3. **Referral System**
   - Referral code generation
   - Referral tracking and rewards
   - Referral dashboard UI
   
4. **Token Management**
   - Real-time balance updates
   - Transaction history
   - Purchase flow optimization

### Phase D: Advanced Features
1. **Tier-Specific Features**
   - Premium: Advanced analysis options
   - Pro: API access for developers
   - Enterprise: Bulk scanning capabilities

2. **Analytics & Optimization**
   - User behavior tracking
   - Conversion funnel analysis
   - A/B testing for pricing

---

## 📋 MARKET ANALYSIS SUMMARY

### Competitive Positioning
- **Apple App Store:** Medicine apps typically RM10-50/month
- **Telemedicine:** Consultation fees RM30-150 per session  
- **AI Services:** ChatGPT Plus ~RM70/month unlimited
- **MedWira Position:** Feature-focused middle tier

### Value Proposition
- **Cost Effective:** Lower than doctor consultations
- **Convenient:** 24/7 instant analysis
- **Comprehensive:** Detailed safety information
- **Regional:** SEA-specific medicine database

---

## ✅ CONCLUSION

The monetization system is **profitable, competitive, and scalable**:
- ✅ **High Profit Margins:** 85-92.5% across tiers
- ✅ **Smart Psychology:** Volume discounts encourage upgrades
- ✅ **Viral Growth:** Referral system drives organic acquisition
- ✅ **Market Ready:** Competitive pricing for SEA market

**Status:** Ready for implementation in Phase C
