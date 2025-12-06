# Growth Strategy: Building the Christmas Lights Database

**Created:** December 6, 2025
**Vision:** Help dads take their families on amazing Christmas light tours with the best displays near them.

---

## The Challenge

To provide value to users (families looking for displays), we need a comprehensive database of Christmas light displays. There are two complementary approaches:

1. **Community-Driven**: Reward active users for submitting quality displays
2. **AI-Powered Automation**: Use AWS services to automatically discover displays from the web

Both strategies work together - automation provides scale, community provides quality and freshness.

---

## Strategy 1: Community-Driven Growth

### Core Principle
Make users feel like valued contributors to a fun seasonal community, not just data entry workers.

### 1.1 Gamification System

#### Contributor Badges
Award badges that display on user profiles and submissions:

| Badge | Criteria | Icon Idea |
|-------|----------|-----------|
| **First Light** | Submit first approved location | Single candle |
| **Scout** | 5 approved submissions | Binoculars |
| **Enthusiast** | 15 approved submissions | Star |
| **Expert** | 50 approved submissions | Crown |
| **Legend** | 100+ approved submissions | Trophy |
| **Early Bird** | Submit before Nov 15 | Sunrise |
| **Night Owl** | Submit after Dec 20 | Moon |
| **Photo Pro** | 10 submissions with 3+ photos | Camera |
| **Spectacular Finder** | Find a "spectacular" rated display | Fireworks |

#### Seasonal Leaderboard
- Top contributors for current season (Nov 1 - Jan 15)
- Categories: Most submissions, Most "spectacular" finds, Best photos
- Reset annually - everyone starts fresh

#### Points System (Optional)
```
Submit approved location:     +10 points
Include 3 quality photos:     +5 points
Find "spectacular" display:   +10 points
First to submit in a city:    +20 points
Location gets 50+ likes:      +15 points
```

### 1.2 Recognition Features

#### Public Recognition
- "Submitted by [Username]" on location cards
- Contributor spotlight on homepage during season
- Annual "Top Contributors" blog post / social media shoutout

#### Profile Enhancements
- Public profiles showing badges and stats
- "Favorite Finder" designation for users others follow
- Share profile link on social media

### 1.3 Community Features

#### Social Engagement
- Comment on locations (moderated)
- "Helpful" votes on submissions
- Follow other contributors
- Share tour routes with friends

#### Family-Friendly Competition
- "Family Challenge": Families compete to find the most displays
- Neighborhood challenges: Which neighborhood submits the most?
- City vs. City: DFW vs. Houston friendly rivalry

### 1.4 Notification & Engagement Loops

#### Email Notifications
- "Your submission was approved!" (with share buttons)
- "Someone liked a display you found!"
- Weekly digest: "New displays near you"
- "You're 2 away from your next badge!"

#### Push Notifications (Future Mobile App)
- New spectacular display near you
- Friend shared a tour route
- Your submission hit 100 likes

### 1.5 Incentive Ideas (Future)

#### Non-Monetary Rewards
- Featured contributor status
- Early access to new features
- Input on feature development
- Recognition in app credits

#### Partnership Opportunities
- Partner with local businesses for discounts
- "Top Contributor" gets free hot cocoa at partner cafe
- Raffle entries for gift cards (one entry per approved submission)

---

## Strategy 2: AI-Powered Automated Discovery

### Core Principle
Use AWS services and AI agents to continuously discover Christmas light displays from public sources.

### 2.1 Data Sources

#### Primary Sources (Structured)
| Source | Data Available | Approach |
|--------|----------------|----------|
| **Google Maps** | "Christmas lights" searches | Places API or reviews scraping |
| **Nextdoor** | Neighborhood recommendations | Monitor public posts (if API available) |
| **Local News** | "Best displays" articles | Web scraping + NLP |
| **City Tourism Sites** | Official display lists | Web scraping |
| **HOA Newsletters** | Contest winners | Email parsing (with permission) |

#### Secondary Sources (Unstructured)
| Source | Approach |
|--------|----------|
| **Facebook Groups** | "Christmas Lights [City]" groups - monitor posts |
| **Facebook Events** | Drive-through displays, neighborhood events |
| **Instagram** | Geotag searches for #christmaslights + location |
| **Reddit** | r/dallas, r/houston "christmas lights" threads |
| **YouTube** | "Christmas lights tour [city] 2024" videos |
| **Local Blogs** | Mom blogs, neighborhood blogs |

### 2.2 AWS Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     DISCOVERY PIPELINE                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐    │
│  │ EventBridge │────>│   Lambda    │────>│    SQS Queue    │    │
│  │  (Scheduler)│     │ (Coordinator)│     │ (Discovery Jobs)│    │
│  └─────────────┘     └─────────────┘     └────────┬────────┘    │
│                                                    │             │
│                                                    v             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    DISCOVERY WORKERS                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │    │
│  │  │ Facebook │  │  Google  │  │ News/Blog│  │ Reddit  │  │    │
│  │  │ Scraper  │  │  Places  │  │ Scraper  │  │   API   │  │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │    │
│  └───────┼─────────────┼─────────────┼─────────────┼───────┘    │
│          │             │             │             │             │
│          v             v             v             v             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    RAW DISCOVERIES                       │    │
│  │              (S3 Bucket / DynamoDB Table)               │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│                               v                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   AI PROCESSING                          │    │
│  │  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │    │
│  │  │ Bedrock Claude│  │  Geocoding   │  │ De-duplication│  │    │
│  │  │ (Extract Info)│  │ (Nominatim)  │  │   (Fuzzy)     │  │    │
│  │  └───────────────┘  └──────────────┘  └──────────────┘  │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│                               v                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 CANDIDATE LOCATIONS                      │    │
│  │           (DynamoDB - suggestions table)                │    │
│  │        status: "auto-discovered" | "pending-review"     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 AWS Services to Use

| Service | Purpose | Notes |
|---------|---------|-------|
| **EventBridge** | Schedule daily/weekly discovery jobs | Cron: `0 6 * 11,12 ? *` (6am daily Nov-Dec) |
| **Lambda** | Run discovery workers | 15min timeout, 1GB memory |
| **SQS** | Queue discovery jobs | FIFO for deduplication |
| **S3** | Store raw scraped content | Lifecycle: delete after 30 days |
| **DynamoDB** | Store discoveries + candidates | GSI on source, status |
| **Bedrock (Claude)** | Extract structured data from text | Parse addresses, descriptions |
| **Step Functions** | Orchestrate multi-step workflows | Discovery → Process → Validate |
| **SNS** | Alert admins of high-confidence finds | Push to Slack/email |
| **Comprehend** | Sentiment analysis on reviews | Optional - quality signals |

### 2.4 AI Agent Workflows

#### Workflow 1: News Article Discovery
```
1. Google search: "best christmas lights displays [city] 2024"
2. Scrape top 10 results
3. Bedrock Claude: Extract all addresses mentioned
4. Geocode addresses
5. Check for duplicates in DB
6. Create candidate suggestions with source URL
```

#### Workflow 2: Facebook Group Monitor
```
1. Monitor public posts in "DFW Christmas Lights" groups
2. Filter posts with addresses or "visit this display"
3. Bedrock Claude: Extract address, description, photos
4. Geocode and validate (is this a real address?)
5. Queue for admin review if high confidence
```

#### Workflow 3: Google Reviews Mining
```
1. Search Google Maps for "christmas lights" in region
2. Pull places with recent reviews mentioning displays
3. Extract address, photos, review snippets
4. Score by review sentiment + photo quality
5. Create candidate with confidence score
```

### 2.5 Data Processing with Bedrock

#### Prompt for Address Extraction
```
You are extracting Christmas light display addresses from text.

Text: "{scraped_content}"

Extract:
1. Full street address (number, street, city, state, zip if available)
2. Description of the display
3. Any dates/hours mentioned
4. Confidence score (high/medium/low)

Return JSON array of discoveries.
```

#### Prompt for Quality Assessment
```
Based on this description/photo, rate this Christmas display:
- minimal: A few lights, basic effort
- moderate: Good display, effort visible
- impressive: Stands out, lots of decorations
- spectacular: Must-see, exceptional display

Also identify: animated, music sync, inflatables, walk-through
```

### 2.6 De-duplication Strategy

```python
def is_duplicate(new_location, existing_locations):
    """
    Check if this location already exists
    """
    for existing in existing_locations:
        # Exact address match
        if normalize_address(new.address) == normalize_address(existing.address):
            return True

        # Geographic proximity (within 50 meters)
        if haversine(new.lat, new.lng, existing.lat, existing.lng) < 0.05:
            # Fuzzy name match
            if fuzz.ratio(new.name, existing.name) > 80:
                return True

    return False
```

### 2.7 Admin Review Queue

Automated discoveries flow into a special admin queue:

```
┌────────────────────────────────────────────────────┐
│ AUTO-DISCOVERED LOCATIONS (Pending Review)        │
├────────────────────────────────────────────────────┤
│ [HIGH CONFIDENCE]                                  │
│ 📍 1234 Oak Lane, Plano TX                        │
│ Source: Dallas Morning News article               │
│ "Featured in 'Top 10 DFW Displays 2024'"         │
│ Confidence: 95%                                    │
│ [✓ Approve] [✗ Reject] [📝 Edit & Approve]        │
├────────────────────────────────────────────────────┤
│ [MEDIUM CONFIDENCE]                                │
│ 📍 5678 Maple Dr, Richardson TX                   │
│ Source: Facebook Group Post                        │
│ "Check out this amazing display on Maple!"        │
│ Confidence: 72% (address inferred)                │
│ [✓ Approve] [✗ Reject] [📝 Edit & Approve]        │
└────────────────────────────────────────────────────┘
```

### 2.8 Cost Estimates (Monthly)

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Lambda | 1000 invocations, 5min avg | ~$5 |
| Bedrock Claude | 50K input + 10K output tokens | ~$10 |
| DynamoDB | 1GB storage, light R/W | ~$2 |
| S3 | 5GB scraped content | ~$0.50 |
| EventBridge | 100 scheduled events | ~$0.01 |
| **Total** | | **~$20/month** |

---

## Implementation Phases

### Phase A: Community Features (2-3 weeks)
1. Add contributor badges system
2. Public profiles with stats
3. "Submitted by" attribution on locations
4. Email notifications (approval, likes)
5. Simple leaderboard (top 10 contributors)

### Phase B: Basic Automation (3-4 weeks)
1. News article scraper (Lambda + Bedrock)
2. Address extraction and geocoding
3. De-duplication logic
4. Admin queue for auto-discoveries
5. Confidence scoring

### Phase C: Social Media Discovery (4-6 weeks)
1. Facebook public page/group monitoring
2. Instagram geotag discovery (if feasible)
3. Reddit API integration
4. Photo download and analysis
5. Source attribution tracking

### Phase D: Advanced Features (Future)
1. Real-time discovery during season
2. User-reported duplicates/corrections
3. Historical tracking (is display active this year?)
4. Predictive quality scoring
5. Neighborhood heatmaps

---

## Success Metrics

### Community Health
- Active contributors (submitted in last 30 days)
- Submissions per contributor
- Return rate (submitters who come back)
- Badges earned

### Automation Effectiveness
- Discoveries per source
- Approval rate of auto-discoveries
- Duplicate detection accuracy
- Time from discovery to approval

### Overall Growth
- Total locations in database
- New locations per season
- Coverage by neighborhood/zip
- User satisfaction (would recommend)

---

## Technical Notes

### DynamoDB Schema Updates

```javascript
// New fields for suggestions table
{
  source: "user" | "auto-facebook" | "auto-news" | "auto-google",
  sourceUrl: "https://...",  // Original source
  confidence: 0.85,          // AI confidence score
  autoDiscoveredAt: "2024-11-15T...",
  contributorId: "user-123", // For user submissions
  badges: ["first-light", "photo-pro"],  // Earned badges
}

// New table: contributor-badges
{
  userId: "user-123",
  badge: "scout",
  earnedAt: "2024-12-01T...",
  season: "2024"
}

// New table: leaderboard (or GSI on users)
{
  season: "2024",
  userId: "user-123",
  approvedCount: 15,
  spectacularCount: 3,
  totalLikes: 234,
  rank: 5
}
```

### Lambda Functions to Add

```
backend/functions/
├── discovery/
│   ├── news_scraper.py        # Scrape news articles
│   ├── facebook_monitor.py     # Monitor FB groups
│   ├── process_discovery.py    # AI extraction
│   └── deduplicate.py          # Check for duplicates
├── gamification/
│   ├── award_badge.py          # Check & award badges
│   ├── update_leaderboard.py   # Recalculate rankings
│   └── get_leaderboard.py      # Fetch top contributors
└── notifications/
    ├── send_approval_email.py
    └── send_weekly_digest.py
```

---

## Open Questions

1. **Facebook API Access**: Do we need official API access or can we use public data?
2. **Photo Rights**: Can we use photos from scraped sources? (Probably not - flag for manual photo upload)
3. **Rate Limiting**: How aggressive can we scrape without getting blocked?
4. **Seasonal Timing**: When to start/stop automation each year?
5. **Privacy**: How do we handle when homeowners want to opt out?

---

## Next Steps

1. **Immediate**: Implement basic badge system for community engagement
2. **Short-term**: Build news article scraper as proof of concept
3. **Medium-term**: Expand to social media sources
4. **Long-term**: Real-time discovery and predictive features

---

*This document should be updated as we learn more about what works and what doesn't.*
