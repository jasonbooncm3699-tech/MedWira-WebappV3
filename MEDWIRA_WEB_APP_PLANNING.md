# MedWira Web App Development Planning Summary

## Project Overview
**Project Name**: MedWira (formerly Seamed AI)  
**Domain**: medwira.com  
**Purpose**: AI-powered medicine identification and chat assistant with comprehensive safety information

## Final Architecture Decisions

### Technology Stack
- **MCP Server**: Python (existing + enhancement integration)
- **Web App**: Next.js (existing - keep current code)
- **Database**: Supabase (PostgreSQL) - migrate from existing
- **Cache**: Upstash (Redis)
- **AI Model**: Gemini 1.5 Flash (cost optimization - 47x cheaper than Pro)
- **Hosting**: Vercel (web app) + Railway (services)

### Data Flow
1. **Python MCP** scrapes NPRA → **Supabase** (raw data)
2. **Python MCP** enhances with Gemini → **Supabase** (enhanced data)
3. **Next.js Web App** queries → **Upstash Redis** → **Supabase** (27k Malaysia medicines)

## Key Requirements

### Data Volume & Performance
- **Initial Dataset**: 27k Malaysia medicines (NPRA)
- **Future Expansion**: 100k+ medicines across SEA countries
- **Response Time**: < 1 minute for medicine analysis
- **Concurrent Users**: 1000 active users for MVP
- **Update Frequency**: Monthly data updates

### AI Enhancement Requirements
- **All Safety Information**: Interactions, contraindications, precautions, side effects
- **Comprehensive Analysis**: Match sample output format with detailed medical information
- **Cost Optimization**: Use Gemini 1.5 Flash (~$25 for 27k medicines vs ~$850 with Pro)
- **Quality Assurance**: Automated validation + manual review + AI double-check

### Sample Output Format
The web app should display enhanced medicine analysis in this format:
```
**Packaging Detected:** [description]
**Medicine Name:** [name with generic]
**Purpose:** [medical indication]
**Dosage Instructions:** [detailed instructions for adults/children]
**Side Effects:** [common/rare/overdose]
**Allergy Warning:** [allergy information]
**Drug Interactions:** [with drugs/food/alcohol]
**Safety Notes:** [children/pregnancy/other warnings]
**Cross-Border Info:** [availability information]
**Storage:** [storage instructions]
**Disclaimer:** [medical disclaimer]
```

## Development Phases

### Phase 1A: MCP Server Enhancement (Week 1-2)
- Update to Gemini 1.5 Flash
- Add Supabase integration
- Implement batch processing for 27k medicines
- Add monitoring dashboard
- Error handling (skip failed, flag for review)

### Phase 1B: Web App Integration (Week 3-4)
- Set up Supabase connection in Next.js app
- Add Redis caching layer
- Update API endpoints to use enhanced data
- Implement search functionality
- Update UI to display enhanced medicine data

### Phase 2: Multi-Country Expansion (Week 5-6)
- Integrate MCP server with enhancement service
- Multi-country data processing
- Unified dataset creation

## Web App Integration Requirements

### Database Integration
- **Method**: Through Supabase (not direct MCP server calls)
- **Caching**: Redis for frequently accessed medicines
- **Search**: Optimized for sub-minute response times
- **Backup**: Weekly CSV downloads for manual backup

### API Structure
- **Search Medicine**: `/api/search-medicine` (existing)
- **Analyze Image**: `/api/analyze-image` (existing)
- **Chat**: `/api/chat` (existing)
- **New**: Enhanced medicine data endpoints

### Error Handling
- **AI Failures**: Skip failed enhancements, flag for manual review
- **Database Issues**: Graceful fallback to cached data
- **API Rate Limiting**: 100 requests/minute per user

## Cost Estimates

### AI Enhancement Costs
- **Gemini 1.5 Flash**: ~$25 for 27k medicines (initial)
- **Monthly Updates**: ~$5-10 (delta updates)
- **Total Monthly**: ~$5-20 for MVP

### Infrastructure Costs
- **Vercel**: Free (web app)
- **Railway**: $5-20 (enhancement service)
- **Supabase**: Free tier (database)
- **Upstash**: Free tier (Redis)
- **Total**: $5-20/month for MVP

## Current Web App Status
- **Framework**: Next.js 15.5.3 with Turbopack
- **Running**: http://localhost:3000
- **Features**: Image upload, camera, chat interface, multi-language support
- **AI Integration**: Google Generative AI already integrated
- **PWA**: Service worker, manifest, mobile capabilities

## Next Steps for Web App Development

### When MCP Server is Ready:
1. **Database Migration**: Set up Supabase connection
2. **API Updates**: Modify existing endpoints to use enhanced data
3. **Caching Layer**: Implement Redis caching
4. **Search Enhancement**: Update search to use comprehensive medicine data
5. **UI Updates**: Display enhanced medicine analysis in sample format
6. **Performance Optimization**: Ensure sub-minute response times
7. **Monitoring**: Add logging for API usage and performance

### Key Files to Update:
- `app/api/search-medicine/route.ts` - Use enhanced data
- `app/api/analyze-image/route.ts` - Integrate with enhanced database
- `app/api/chat/route.ts` - Use comprehensive medicine data
- Database connection configuration
- Redis caching implementation

## Important Notes
- **Branding**: Keep current app as-is, focus on data enhancement service first
- **Database**: Migrate existing database to Supabase
- **Processing**: Batch process all 27k medicines at once for cost/time estimation
- **Quality**: Implement both automated validation and manual review
- **Backup**: Weekly CSV downloads for data backup
- **Monitoring**: Full dashboard for tracking enhancement progress and costs

## Contact Information
- **Domain**: medwira.com
- **Current App**: http://localhost:3000
- **MCP Server**: /Users/user/Medwira MCP server/

---

*This document serves as a reference for web app development after MCP server enhancement is complete.*

