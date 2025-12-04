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

## Frontend Geographic Dependencies

### Hardcoded Text References (Need Regionalization)

**Component Locations with "DFW" / "Dallas-Fort Worth":**

1. **Layout.tsx** (App title and footer)
   - Line ~20: `"DFW Christmas Lights"` (header title)
   - Line ~40: `"DFW Christmas Lights"` (mobile menu)
   - Line ~180: `"across the Dallas-Fort Worth area"` (footer)
   - Line ~260: `"Made with ❤️ for the DFW community"` (footer copyright)

2. **HomePage.tsx** (Hero section and stats)
   - Line 51: `"Christmas Lights in DFW"` (main headline)
   - Line 55: `"across the Dallas-Fort Worth area"` (subheading)

3. **SubmitLocationPage.tsx**
   - Line 162: `"Start typing an address in the DFW area..."` (placeholder)

4. **SignupPage.tsx**
   - Success message mentions "Christmas lights in DFW"

**Impact:** All user-facing text assumes DFW market

### Hardcoded Map Configuration

**MapView.tsx** (Line 69):
```typescript
center = [32.7767, -96.7970], // DFW default center
zoom = 10,
```

**Current Behavior:**
- Always centers on Dallas (32.7767°N, 96.7970°W)
- No logic to detect or switch regions
- "Near Me" button works anywhere (uses browser geolocation)

**Issue:** Houston user sees Dallas map by default

### AddressAutocomplete Component

**Location:** `frontend/src/components/ui/AddressAutocomplete.tsx`

**Current Implementation:**
```typescript
// Line 79: No region parameter passed
const response = await apiService.suggestAddresses({ query: inputValue });
```

**API Service** (`frontend/src/services/api.ts:92-94`):
```typescript
async suggestAddresses(request: AddressSuggestionsRequest): Promise<AddressSuggestionsResponse> {
  const { data } = await this.api.post<AddressSuggestionsResponse>('/locations/suggest-addresses', request);
  return data;
}
```

**Current Request Shape:**
```typescript
interface AddressSuggestionsRequest {
  query: string;  // No region field
}
```

**Good News:** Component is **region-agnostic**
- Displays whatever suggestions the backend returns
- No hardcoded filtering or logic
- Easy to extend with region parameter

### Missing Region Selection UI

**What's Needed:**
- ❌ No region picker/dropdown
- ❌ No region auto-detection display
- ❌ No localStorage for saved region preference
- ❌ No URL routing (e.g., `/dfw`, `/houston`)

**Current User Flow:**
1. User lands on site → sees "DFW" everywhere
2. Houston user must manually search Houston addresses
3. Backend filters results, but UX is confusing

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

4. **Frontend: Create Region Context Provider**
   ```typescript
   // src/contexts/RegionContext.tsx
   interface RegionConfig {
     regionId: string;
     name: string;
     displayName: string;
     centerPoint: { lat: number; lng: number };
     defaultZoom: number;
   }

   const RegionContext = createContext<{
     region: RegionConfig;
     setRegion: (regionId: string) => void;
     availableRegions: RegionConfig[];
   }>(/* ... */);
   ```

5. **Frontend: Update Types to Include Region**
   ```typescript
   // src/types/index.ts
   interface AddressSuggestionsRequest {
     query: string;
     region?: string;  // NEW: Optional region parameter
   }
   ```

6. **Frontend: Update AddressAutocomplete Component**
   ```typescript
   // src/components/ui/AddressAutocomplete.tsx (line 79)
   const { region } = useRegion();
   const response = await apiService.suggestAddresses({
     query: inputValue,
     region: region.regionId  // NEW: Pass current region
   });
   ```

7. **Frontend: Regionalize Text Content**
   ```typescript
   // src/config/regions.ts
   export const REGION_CONTENT = {
     'north-texas': {
       title: 'DFW Christmas Lights',
       heroText: 'Christmas Lights in DFW',
       description: 'across the Dallas-Fort Worth area'
     },
     'houston': {
       title: 'Houston Christmas Lights',
       heroText: 'Christmas Lights in Houston',
       description: 'across the Greater Houston area'
     }
   };

   // Usage in components:
   const { region } = useRegion();
   const content = REGION_CONTENT[region.regionId];
   ```

8. **Frontend: Update MapView with Dynamic Center**
   ```typescript
   // src/components/map/MapView.tsx (line 69)
   const { region } = useRegion();
   const center = region ? [region.centerPoint.lat, region.centerPoint.lng] : [32.7767, -96.7970];
   ```

9. **Frontend: Add Region Selector Component**
   ```typescript
   // src/components/ui/RegionSelector.tsx
   function RegionSelector() {
     const { region, setRegion, availableRegions } = useRegion();
     return (
       <Select value={region.regionId} onChange={setRegion}>
         {availableRegions.map(r => (
           <option key={r.regionId} value={r.regionId}>{r.name}</option>
         ))}
       </Select>
     );
   }
   ```

#### Example Regions to Add:
- **Houston Metro** (lat: 29.0-30.5, lng: -96.0 to -94.5)
- **Austin Metro** (lat: 29.8-30.8, lng: -98.5 to -97.0)
- **San Antonio** (lat: 29.0-29.8, lng: -99.0 to -98.0)
- **Oklahoma City** (lat: 35.0-35.8, lng: -98.0 to -97.0)

#### Frontend Files Requiring Changes:

| File | Change Required | Complexity |
|------|----------------|------------|
| `src/contexts/RegionContext.tsx` | **NEW**: Create region context | Medium |
| `src/config/regions.ts` | **NEW**: Region content config | Low |
| `src/types/index.ts` | Add `region?` to AddressSuggestionsRequest | Low |
| `src/services/api.ts` | Pass region to backend | Low |
| `src/components/ui/AddressAutocomplete.tsx` | Use region from context | Low |
| `src/components/ui/RegionSelector.tsx` | **NEW**: Dropdown selector | Low |
| `src/components/map/MapView.tsx` | Use dynamic center from region | Low |
| `src/components/Layout.tsx` | Replace "DFW" with `{content.title}` | Low |
| `src/pages/HomePage.tsx` | Replace hardcoded text | Low |
| `src/pages/SubmitLocationPage.tsx` | Replace placeholder text | Low |
| `src/pages/SignupPage.tsx` | Replace success message | Low |

**Effort:**
- Backend: 1-2 days (DynamoDB table, Lambda changes, API update)
- Frontend: 2-3 days (Context, components, text replacement)
- **Total: 3-5 days**

**Benefit:** Easy expansion to new metros without code changes

---

### Phase 2: Intelligent Region Detection
**Goal:** Auto-detect user's region

#### Approach 1: Browser Geolocation API (Recommended First)

**Implementation:**
```typescript
// src/hooks/useRegionDetection.ts
export function useRegionDetection() {
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage first
    const saved = localStorage.getItem('selectedRegion');
    if (saved) {
      setDetectedRegion(saved);
      return;
    }

    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const region = findRegionByCoordinates(
            position.coords.latitude,
            position.coords.longitude
          );
          setDetectedRegion(region?.regionId || 'north-texas');
          localStorage.setItem('selectedRegion', region?.regionId || 'north-texas');
        },
        () => {
          // Default to North Texas if denied
          setDetectedRegion('north-texas');
        }
      );
    }
  }, []);

  return detectedRegion;
}
```

**Benefits:**
- Most accurate (actual user location)
- Already implemented in MapView.tsx (lines 78-93)
- User controls permission

**Drawbacks:**
- Requires user permission
- Doesn't work if user denies

---

#### Approach 2: IP-based Geolocation

**Implementation:**
```typescript
// Use CloudFront viewer headers
// Lambda@Edge or backend can pass region in response headers
headers['X-Detected-Region'] = detectRegionFromIP(viewerIP);

// Frontend reads header:
const detectedRegion = response.headers['x-detected-region'];
```

**Alternative: Third-party service**
```typescript
// Using ipapi.co (free tier: 1000 req/day)
const response = await fetch('https://ipapi.co/json/');
const data = await response.json();
// data.city, data.region, data.latitude, data.longitude
const region = mapCityToRegion(data.city);
```

**Benefits:**
- No permission required
- Works immediately on page load
- Good fallback if geolocation denied

**Drawbacks:**
- Less accurate (VPN, corporate networks)
- Additional service dependency
- Privacy concerns

---

#### Approach 3: Smart Defaults + Manual Override

**Recommended Implementation:**
```typescript
// src/contexts/RegionContext.tsx
export function RegionProvider({ children }) {
  const [region, setRegion] = useState<RegionConfig | null>(null);

  useEffect(() => {
    const initializeRegion = async () => {
      // Priority 1: User's saved preference
      const saved = localStorage.getItem('selectedRegion');
      if (saved) {
        setRegion(REGIONS[saved]);
        return;
      }

      // Priority 2: Browser geolocation
      const geoRegion = await tryGeolocation();
      if (geoRegion) {
        setRegion(geoRegion);
        return;
      }

      // Priority 3: IP-based detection
      const ipRegion = await tryIPDetection();
      if (ipRegion) {
        setRegion(ipRegion);
        return;
      }

      // Priority 4: Default to North Texas
      setRegion(REGIONS['north-texas']);
    };

    initializeRegion();
  }, []);

  const handleRegionChange = (regionId: string) => {
    setRegion(REGIONS[regionId]);
    localStorage.setItem('selectedRegion', regionId);
  };

  return (
    <RegionContext.Provider value={{ region, setRegion: handleRegionChange }}>
      {children}
    </RegionContext.Provider>
  );
}
```

**UI Enhancement - Region Banner:**
```typescript
// Show banner on first visit
{detectedRegion && !localStorage.getItem('regionConfirmed') && (
  <div className="bg-gold-100 border-b border-gold-300 p-3 text-center">
    <p>
      We detected you're in <strong>{region.name}</strong>.
      <button onClick={() => setShowRegionPicker(true)}>
        Change region
      </button>
    </p>
  </div>
)}
```

---

**Effort:** 1 week
- Day 1-2: Geolocation hook and region detection logic
- Day 3-4: IP fallback and localStorage persistence
- Day 5: Region selector UI and confirmation banner

**Benefit:** 95%+ users see correct region automatically

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
