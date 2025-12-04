# Geographic Expansion & Performance Plan

## Current Architecture (DFW / North Texas Launch)

### Geographic Bounds
**Location:** `backend/functions/locations/suggest_addresses.py`

Currently hardcoded to North Texas region:
```python
# Lines 84-87
if 31.5 <= lat <= 34.0 and -98.5 <= lng <= -95.5:
    # North Texas: Gainesville to Waxahachie, Weatherford to Greenville
    # Approximately 150 miles north-south, 180 miles east-west
```

**Search Context:** "North Texas" (line 52)

### Geocoding Service
- **Current:** Nominatim (OpenStreetMap) - Free tier
- **Rate Limit:** 1 request per second (enforced by usage policy)
- **Timeout:** 5 seconds per request
- **Cost:** $0

### Performance Characteristics
- **Latency:** 500ms - 2s per request (no caching)
- **Throughput:** Max ~60 requests/minute (rate limited)
- **Availability:** 99%+ (community service)

---

## Scaling Challenges

### 1. **Geographic Limitations**
- Hardcoded bounds prevent easy expansion
- Single region context ("North Texas")
- No multi-region support

### 2. **Performance Bottlenecks**
- **No caching:** Every search hits external API
- **Rate limiting:** Nominatim 1 req/sec limit
- **Cold starts:** Lambda cold starts add 1-2s latency
- **Sequential processing:** Single-threaded geocoding

### 3. **Cost at Scale**
- Nominatim free tier not suitable for high traffic
- Need commercial API for SLA guarantees
- No cost controls or monitoring

---

## Multi-Region Expansion Strategy

### Phase 1: Configuration-Based Regions
**Goal:** Support multiple metros without code changes

#### Changes Required:

1. **Create Regions Configuration Table**
   ```python
   # DynamoDB: regions-config
   {
       "regionId": "north-texas",
       "name": "North Texas",
       "searchContext": "North Texas",
       "bounds": {
           "minLat": 31.5,
           "maxLat": 34.0,
           "minLng": -98.5,
           "maxLng": -95.5
       },
       "centerPoint": {"lat": 32.7767, "lng": -96.7970},
       "enabled": true
   }
   ```

2. **Update API to Accept Region Parameter**
   ```typescript
   POST /locations/suggest-addresses
   {
       "query": "123 Main St",
       "region": "north-texas"  // NEW: Optional, defaults to user's region
   }
   ```

3. **Refactor Lambda to Use Dynamic Bounds**
   ```python
   # Instead of hardcoded bounds
   region_config = get_region_config(region_id)
   if region_config["bounds"]["minLat"] <= lat <= region_config["bounds"]["maxLat"]:
       # Include suggestion
   ```

#### Example Regions to Add:
- **Houston Metro** (lat: 29.0-30.5, lng: -96.0 to -94.5)
- **Austin Metro** (lat: 29.8-30.8, lng: -98.5 to -97.0)
- **San Antonio** (lat: 29.0-29.8, lng: -99.0 to -98.0)
- **Oklahoma City** (lat: 35.0-35.8, lng: -98.0 to -97.0)

**Effort:** 2-3 days
**Benefit:** Easy expansion to new metros

---

### Phase 2: Intelligent Region Detection
**Goal:** Auto-detect user's region

#### Approaches:

1. **Browser Geolocation API**
   ```typescript
   navigator.geolocation.getCurrentPosition((position) => {
       const userRegion = detectRegion(position.coords);
       // Use region for searches
   });
   ```

2. **IP-based Geolocation**
   - Use CloudFront headers: `CloudFront-Viewer-Country-Region-Name`
   - Fallback to IP geolocation service

3. **User Preference Storage**
   - Store selected region in localStorage
   - Allow manual region switching

**Effort:** 1 week
**Benefit:** Better UX, no manual region selection

---

## Performance Optimization Plan

### Phase 1: Caching Layer (High Priority)
**Problem:** Every search hits geocoding API

#### Solution: Multi-Tier Caching

1. **DynamoDB Cache**
   ```python
   # Table: geocode-cache
   {
       "queryHash": "md5(query + region)",
       "suggestions": [...],
       "cachedAt": 1234567890,
       "ttl": 2592000  # 30 days
   }
   ```

2. **Lambda In-Memory Cache**
   ```python
   # For hot queries within same Lambda execution
   geocode_cache = {}  # Persists across warm invocations
   ```

#### Expected Impact:
- **Cache hit rate:** 60-80% (common addresses)
- **Latency reduction:** 500ms → 50ms for cached results
- **Cost savings:** 70% fewer geocoding API calls

**Effort:** 3-4 days
**Cost:** ~$5/month DynamoDB (estimate)

---

### Phase 2: Upgrade Geocoding Service (Production)
**Problem:** Nominatim rate limits and reliability

#### Options:

1. **AWS Location Service** (Recommended)
   - **Pros:** Native AWS integration, high rate limits, 99.9% SLA
   - **Rate Limit:** 10 req/sec (default), can increase
   - **Latency:** 50-150ms
   - **Cost:** $4 per 1,000 requests
   - **Setup:** Already supported in import script (line 57-61)

   ```python
   # Already implemented in scripts/import_locations.py
   self.location_client = boto3.client('location')
   response = self.location_client.search_place_index_for_text(
       IndexName='christmas-lights-geocoder',
       Text=search_address,
       MaxResults=5
   )
   ```

2. **Google Maps Geocoding API**
   - **Pros:** Excellent accuracy, rich data
   - **Rate Limit:** 50 req/sec
   - **Cost:** $5 per 1,000 requests (first 40K free/month)
   - **Setup:** Already supported in import script (line 52-56)

3. **Here Technologies**
   - **Pros:** Lower cost than Google
   - **Cost:** $1 per 1,000 requests
   - **Rate Limit:** 5 req/sec (free tier)

#### Recommendation: AWS Location Service
**Why:**
- Already in AWS ecosystem (Lambda, DynamoDB, etc.)
- No API keys to manage (uses IAM)
- Predictable billing
- Can scale to 100+ req/sec if needed

**Migration Effort:** 1-2 days (code already exists in import script)

---

### Phase 3: Performance Optimizations

#### 3a. Lambda Optimization
```python
# Increase memory for faster CPU
memory_size=1024  # Current: 512MB → Better CPU allocation

# Provisioned concurrency for zero cold starts
provisioned_concurrent_executions=2  # For consistent <100ms latency
```

**Cost Impact:** ~$15/month for 2 provisioned instances
**Benefit:** Eliminates cold start latency

#### 3b. Parallel Geocoding
```python
# For multiple suggestions, geocode in parallel
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def geocode_batch(queries):
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = await asyncio.gather(*[
            executor.submit(geocode, query) for query in queries
        ])
    return results
```

**Benefit:** 3-5x faster for batch operations

#### 3c. CDN Caching for Popular Searches
```python
# Add Cache-Control headers for common queries
headers = {
    "Cache-Control": "public, max-age=3600"  # 1 hour CDN cache
}
```

**Benefit:** Instant responses for popular addresses

---

## Cost Analysis

### Current (Nominatim - Free Tier)
- **Geocoding API:** $0/month
- **Lambda:** ~$2/month (estimate)
- **DynamoDB:** ~$5/month
- **Total:** ~$7/month

### With Optimizations (Production Ready)

| Component | Cost/Month | Notes |
|-----------|------------|-------|
| AWS Location Service | $40 | 10K requests @ $4/1K |
| Lambda (optimized) | $20 | Provisioned concurrency |
| DynamoDB (with cache) | $10 | Cache table + locations |
| CloudFront | $5 | CDN for frontend |
| **Total** | **$75** | Supports ~50K users/month |

### At Scale (100K users/month)

| Component | Cost/Month | Notes |
|-----------|------------|-------|
| AWS Location Service | $200 | 50K requests (40% cache hit) |
| Lambda | $50 | Auto-scaling |
| DynamoDB | $30 | Increased cache usage |
| CloudFront | $15 | Higher traffic |
| **Total** | **$295** | Fully scaled production |

---

## Implementation Roadmap

### Q1 2024: North Texas Launch (Current)
- [x] Basic geocoding with Nominatim
- [x] North Texas region support
- [x] Address autocomplete UI

### Q2 2024: Performance & Reliability
- [ ] **Week 1-2:** Implement DynamoDB caching layer
- [ ] **Week 3:** Migrate to AWS Location Service
- [ ] **Week 4:** Add CloudWatch monitoring and alerts

### Q3 2024: Multi-Region Expansion
- [ ] **Week 1-2:** Create regions configuration system
- [ ] **Week 3:** Add Houston, Austin, San Antonio
- [ ] **Week 4:** Implement region auto-detection

### Q4 2024: Scale Optimizations
- [ ] **Week 1:** Provisioned Lambda concurrency
- [ ] **Week 2:** Parallel geocoding for batch operations
- [ ] **Week 3:** CDN caching for hot queries
- [ ] **Week 4:** Load testing and optimization

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Geocoding Performance**
   - Average latency (target: <200ms p95)
   - Cache hit rate (target: >70%)
   - Error rate (target: <1%)

2. **API Usage**
   - Requests per minute
   - Rate limit warnings
   - Cost per 1K requests

3. **User Experience**
   - Time to first suggestion
   - Suggestion accuracy rate
   - User selection rate

### CloudWatch Alarms

```python
# Example alarm configuration
geocoding_latency_alarm = cloudwatch.Alarm(
    alarm_name="geocoding-high-latency",
    metric=geocoding_lambda.metric_duration(),
    threshold=2000,  # 2 seconds
    evaluation_periods=2,
    alarm_description="Geocoding requests taking too long"
)
```

---

## Migration Checklist

### To AWS Location Service

- [ ] Create Place Index in AWS Location Service console
- [ ] Update IAM role to grant `geo:SearchPlaceIndexForText` permission
- [ ] Update Lambda function to use boto3 location client
- [ ] Update environment variable: `GEOCODING_SERVICE=aws`
- [ ] Test with sample addresses
- [ ] Monitor costs for first week
- [ ] Cutover production traffic

### To Multi-Region Support

- [ ] Create `regions-config` DynamoDB table
- [ ] Seed initial regions (North Texas, Houston, Austin)
- [ ] Update API to accept `region` parameter
- [ ] Refactor Lambda to use dynamic bounds
- [ ] Update frontend to show region selector
- [ ] Add region detection logic
- [ ] Test each region independently
- [ ] Deploy and monitor

---

## Technical Debt & Future Enhancements

### Short Term (Next 3 months)
- Add request deduplication for identical concurrent searches
- Implement exponential backoff for geocoding retries
- Add comprehensive error logging with request IDs
- Create admin dashboard for cache management

### Medium Term (3-6 months)
- Machine learning for suggestion ranking
- Support for landmarks/POIs ("near Cowboys Stadium")
- Address validation and normalization
- Batch geocoding endpoint for admins

### Long Term (6-12 months)
- Real-time Christmas light status updates
- Community-driven address corrections
- Integration with navigation apps (Waze, Google Maps)
- Offline geocoding for mobile app

---

## Conclusion

The current architecture is well-positioned for expansion with relatively minor changes:

1. **Configuration over code:** Move geographic bounds to DynamoDB
2. **Caching first:** Implement DynamoDB cache before scaling
3. **AWS-native:** Migrate to AWS Location Service for production reliability
4. **Monitor everything:** Track metrics to optimize costs and performance

**Estimated total effort for full multi-region production readiness:** 6-8 weeks

**Key success metrics:**
- Support 5+ major metros
- <200ms p95 latency for address suggestions
- 99.9% uptime SLA
- <$300/month operating costs at 100K users
