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

### Current Performance Characteristics

**Frontend:**
- ✅ Debouncing: 300ms (already implemented in AddressAutocomplete.tsx:76)
- ❌ No request deduplication (multiple identical concurrent requests)
- ❌ No client-side caching (every keystroke after debounce hits API)
- ❌ No memoization of suggestion components
- ❌ No prefetching of common searches

**Backend:**
- ❌ No caching layer (every request geocodes)
- ❌ No CDN caching headers
- ❌ Lambda cold starts add 1-2s latency
- ❌ Single-threaded geocoding (1 req at a time)
- ✅ Nominatim rate limiting respected (1 req/sec)

**Network:**
- ❌ No response compression
- ❌ No request batching
- ❌ No edge caching (CloudFront)

---

### Phase 1: Frontend Performance Optimizations

#### 1a. React Query for Smart Caching (Recommended)

**Why React Query?**
- Built-in caching, deduplication, and background refetching
- Automatic stale-while-revalidate pattern
- Request deduplication (prevents duplicate API calls)
- Zero configuration needed for basic use

**Implementation:**
```typescript
// src/hooks/useAddressSuggestions.ts
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

export function useAddressSuggestions(query: string, region?: string) {
  return useQuery({
    queryKey: ['address-suggestions', query, region],
    queryFn: () => apiService.suggestAddresses({ query, region }),
    enabled: query.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

// Usage in AddressAutocomplete.tsx:
const { data, isLoading, error } = useAddressSuggestions(inputValue, region);
```

**Benefits:**
- ✅ **Request deduplication:** Multiple identical searches share single request
- ✅ **Automatic caching:** Same search twice = instant result
- ✅ **Background refetch:** Keeps cache fresh automatically
- ✅ **Error retry:** Built-in exponential backoff

**Installation:**
```bash
npm install @tanstack/react-query
```

**Effort:** 2-3 hours
**Cache hit improvement:** 40-60% (users often backspace and retype)

---

#### 1b. LocalStorage for Popular Searches

**Implementation:**
```typescript
// src/utils/searchCache.ts
interface CachedSearch {
  query: string;
  suggestions: AddressSuggestion[];
  timestamp: number;
  hitCount: number;
}

class SearchCache {
  private storageKey = 'address-search-cache';
  private maxEntries = 50;
  private ttl = 7 * 24 * 60 * 60 * 1000; // 7 days

  get(query: string, region: string): AddressSuggestion[] | null {
    const cache = this.getCache();
    const key = `${query}:${region}`;
    const entry = cache[key];

    if (!entry || Date.now() - entry.timestamp > this.ttl) {
      return null;
    }

    // Increment hit count for popularity tracking
    entry.hitCount++;
    this.setCache(cache);

    return entry.suggestions;
  }

  set(query: string, region: string, suggestions: AddressSuggestion[]) {
    const cache = this.getCache();
    const key = `${query}:${region}`;

    cache[key] = {
      query,
      suggestions,
      timestamp: Date.now(),
      hitCount: cache[key]?.hitCount || 0,
    };

    // Evict least popular entries if over limit
    const entries = Object.entries(cache);
    if (entries.length > this.maxEntries) {
      entries.sort((a, b) => a[1].hitCount - b[1].hitCount);
      entries.slice(0, entries.length - this.maxEntries).forEach(([key]) => {
        delete cache[key];
      });
    }

    this.setCache(cache);
  }

  private getCache(): Record<string, CachedSearch> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch {
      return {};
    }
  }

  private setCache(cache: Record<string, CachedSearch>) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cache));
    } catch (e) {
      // Storage full, clear old entries
      this.clear();
    }
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }
}

export const searchCache = new SearchCache();
```

**Usage in AddressAutocomplete:**
```typescript
useEffect(() => {
  // Check localStorage first
  const cached = searchCache.get(inputValue, region.regionId);
  if (cached) {
    setSuggestions(cached);
    setShowSuggestions(true);
    return;
  }

  // Then hit API...
  debounceTimerRef.current = setTimeout(async () => {
    const response = await apiService.suggestAddresses({ query: inputValue });
    searchCache.set(inputValue, region.regionId, response.data.suggestions);
  }, 300);
}, [inputValue]);
```

**Benefits:**
- ✅ Instant results for repeat searches
- ✅ Persists across sessions
- ✅ Automatic LRU eviction
- ✅ Works offline for cached queries

**Effort:** 3-4 hours
**Cache hit improvement:** 20-30% additional

---

#### 1c. Component Memoization

**Current Issue:** Suggestion list re-renders on every state change

**Solution:**
```typescript
// Memoize individual suggestion items
const SuggestionItem = React.memo(({
  suggestion,
  isHighlighted,
  onClick
}: SuggestionItemProps) => (
  <button
    type="button"
    onClick={() => onClick(suggestion)}
    className={`suggestion-item ${isHighlighted ? 'highlighted' : ''}`}
  >
    <MapIcon />
    <div>
      <div className="address">{suggestion.displayName}</div>
      <div className="coords">
        {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
      </div>
    </div>
  </button>
));

// Use in AddressAutocomplete:
{suggestions.map((suggestion, index) => (
  <SuggestionItem
    key={`${suggestion.lat}-${suggestion.lng}`}
    suggestion={suggestion}
    isHighlighted={index === highlightedIndex}
    onClick={handleSelectSuggestion}
  />
))}
```

**Benefits:**
- ✅ Prevents re-rendering of unchanged suggestions
- ✅ Smoother keyboard navigation

**Effort:** 1 hour

---

#### 1d. Prefetching Popular Searches

**Implementation:**
```typescript
// src/utils/prefetch.ts
const POPULAR_SEARCHES = [
  '123 Main St',
  'Downtown Dallas',
  'Plano, TX',
  'Fort Worth, TX',
];

export function prefetchPopularSearches(region: string) {
  POPULAR_SEARCHES.forEach((query) => {
    // Prefetch in background
    queryClient.prefetchQuery({
      queryKey: ['address-suggestions', query, region],
      queryFn: () => apiService.suggestAddresses({ query, region }),
    });
  });
}

// Call on app mount or region change:
useEffect(() => {
  if (region && navigator.connection?.effectiveType !== 'slow-2g') {
    prefetchPopularSearches(region.regionId);
  }
}, [region]);
```

**Benefits:**
- ✅ Instant results for common searches
- ✅ Respects user's network conditions

**Effort:** 2 hours

---

### Phase 2: Backend Caching Strategy

#### 2a. DynamoDB Cache Table (Primary)

**Table Design:**
```python
# Table: geocode-cache
{
    "PK": "query#123 Main St, Dallas, TX#north-texas",  # Hash key
    "SK": "metadata",  # Sort key
    "suggestions": [
        {"address": "...", "lat": 32.7767, "lng": -96.797, "displayName": "..."},
        # ... up to 5 suggestions
    ],
    "cachedAt": 1234567890,
    "hitCount": 42,  # Track popularity
    "ttl": 2592000,  # 30 days (DynamoDB TTL)
}
```

**Lambda Implementation:**
```python
import hashlib
import json
from typing import Dict, Any, List, Optional

class GeocodeCache:
    def __init__(self, table_name: str):
        self.table = boto3.resource('dynamodb').Table(table_name)
        self.ttl_days = 30

    def get_cache_key(self, query: str, region: str) -> str:
        """Generate cache key."""
        normalized = query.lower().strip()
        return f"query#{normalized}#{region}"

    def get(self, query: str, region: str) -> Optional[List[Dict]]:
        """Get cached suggestions."""
        try:
            response = self.table.get_item(
                Key={
                    'PK': self.get_cache_key(query, region),
                    'SK': 'metadata'
                }
            )

            if 'Item' in response:
                # Increment hit count (async, don't wait)
                self.increment_hit_count(query, region)
                return response['Item']['suggestions']

            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    def set(self, query: str, region: str, suggestions: List[Dict]):
        """Cache suggestions."""
        try:
            import time
            ttl = int(time.time()) + (self.ttl_days * 24 * 60 * 60)

            self.table.put_item(
                Item={
                    'PK': self.get_cache_key(query, region),
                    'SK': 'metadata',
                    'suggestions': suggestions,
                    'cachedAt': int(time.time()),
                    'hitCount': 0,
                    'ttl': ttl,  # DynamoDB auto-deletes after 30 days
                }
            )
        except Exception as e:
            print(f"Cache set error: {e}")
            # Don't fail request if cache write fails

    def increment_hit_count(self, query: str, region: str):
        """Increment cache hit counter (fire-and-forget)."""
        try:
            self.table.update_item(
                Key={
                    'PK': self.get_cache_key(query, region),
                    'SK': 'metadata'
                },
                UpdateExpression='ADD hitCount :inc',
                ExpressionAttributeValues={':inc': 1}
            )
        except:
            pass  # Ignore errors for hit counting

# Usage in Lambda:
cache = GeocodeCache(os.environ['GEOCODE_CACHE_TABLE'])

def handler(event, context):
    query = body.get('query')
    region = body.get('region', 'north-texas')

    # Check cache first
    cached = cache.get(query, region)
    if cached:
        return success_response(data={'suggestions': cached, 'query': query})

    # Cache miss - geocode
    suggestions = geocode_addresses(query, region)

    # Cache for next time
    cache.set(query, region, suggestions)

    return success_response(data={'suggestions': suggestions, 'query': query})
```

**Benefits:**
- ✅ 60-80% cache hit rate for common addresses
- ✅ 500ms → 30ms latency for cached results
- ✅ 70% cost reduction on geocoding API calls
- ✅ Automatic expiration with DynamoDB TTL
- ✅ Popularity tracking for optimization

**Infrastructure (CDK):**
```python
# infrastructure/stacks/main_stack.py
self.geocode_cache_table = dynamodb.Table(
    self,
    "GeocodeCacheTable",
    table_name=f"christmas-lights-geocode-cache-{self.env_name}",
    partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
    sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
    billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
    time_to_live_attribute="ttl",  # Enable TTL
    removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
)

# Grant cache table access
self.geocode_cache_table.grant_read_write_data(self.suggest_addresses_fn)
```

**Cost Estimate:**
- 10K requests/month with 70% cache hit = 3K DynamoDB reads
- Cost: ~$0.38/month (read) + ~$1.25/month (write) = **~$1.60/month**
- Saves: 7K geocoding calls × $0.004 = **$28/month**
- **Net savings: $26.40/month**

**Effort:** 1 day

---

#### 2b. Lambda In-Memory Cache (Secondary)

**Problem:** DynamoDB cache still adds ~30ms latency

**Solution:** In-memory cache for hot queries within Lambda execution context

```python
# Global scope (persists across warm invocations)
MEMORY_CACHE = {}
MEMORY_CACHE_SIZE = 100
MEMORY_CACHE_TTL = 300  # 5 minutes

def get_memory_cache(query: str, region: str) -> Optional[List[Dict]]:
    """Check in-memory cache."""
    import time
    key = f"{query}:{region}"

    if key in MEMORY_CACHE:
        cached_at, suggestions = MEMORY_CACHE[key]
        if time.time() - cached_at < MEMORY_CACHE_TTL:
            return suggestions
        else:
            del MEMORY_CACHE[key]

    return None

def set_memory_cache(query: str, region: str, suggestions: List[Dict]):
    """Set in-memory cache with LRU eviction."""
    import time
    key = f"{query}:{region}"

    # Evict oldest if at capacity
    if len(MEMORY_CACHE) >= MEMORY_CACHE_SIZE:
        oldest_key = min(MEMORY_CACHE.keys(), key=lambda k: MEMORY_CACHE[k][0])
        del MEMORY_CACHE[oldest_key]

    MEMORY_CACHE[key] = (time.time(), suggestions)

# Usage:
def handler(event, context):
    # L1: Check memory cache (< 1ms)
    cached = get_memory_cache(query, region)
    if cached:
        return success_response(data={'suggestions': cached})

    # L2: Check DynamoDB cache (~30ms)
    cached = dynamo_cache.get(query, region)
    if cached:
        set_memory_cache(query, region, cached)  # Warm memory cache
        return success_response(data={'suggestions': cached})

    # L3: Geocode (~500-2000ms)
    suggestions = geocode_addresses(query, region)
    set_memory_cache(query, region, suggestions)
    dynamo_cache.set(query, region, suggestions)

    return success_response(data={'suggestions': suggestions})
```

**Benefits:**
- ✅ < 1ms latency for hot queries
- ✅ No additional cost (uses existing Lambda memory)
- ✅ Automatic across warm invocations

**Expected Hit Rate:** 10-15% (very hot queries only)

**Effort:** 2 hours

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

### Phase 3: Network & CDN Optimizations

#### 3a. CloudFront Edge Caching

**Problem:** Every API request goes to Lambda, even for identical queries

**Solution:** Cache responses at CloudFront edge locations

```python
# backend/functions/locations/suggest_addresses.py
def handler(event, context):
    # ... existing geocoding logic ...

    # Determine cache headers based on query popularity
    cache_duration = get_cache_duration(query, region)

    return {
        'statusCode': 200,
        'headers': {
            **_get_cors_headers(),
            'Cache-Control': f'public, max-age={cache_duration}, s-maxage={cache_duration}',
            'Vary': 'Accept-Encoding',  # Vary by compression
        },
        'body': json.dumps(response_body)
    }

def get_cache_duration(query: str, region: str) -> int:
    """Dynamic cache duration based on query type."""
    # Check if this is a popular search
    hit_count = get_hit_count_from_dynamo(query, region)

    if hit_count > 100:
        return 3600  # 1 hour for very popular searches
    elif hit_count > 10:
        return 600   # 10 minutes for popular searches
    else:
        return 300   # 5 minutes for new searches
```

**CloudFront Configuration (CDK):**
```python
# infrastructure/stacks/main_stack.py
self.api_cache_policy = cloudfront.CachePolicy(
    self,
    "ApiCachePolicy",
    cache_policy_name=f"christmas-lights-api-cache-{self.env_name}",
    default_ttl=Duration.minutes(5),
    max_ttl=Duration.hours(1),
    min_ttl=Duration.seconds(0),
    header_behavior=cloudfront.CacheHeaderBehavior.allow_list('Authorization'),
    query_string_behavior=cloudfront.CacheQueryStringBehavior.all(),
    cookie_behavior=cloudfront.CacheCookieBehavior.none(),
    enable_accept_encoding_gzip=True,
    enable_accept_encoding_brotli=True,
)
```

**Benefits:**
- ✅ Instant responses for cached queries (< 50ms)
- ✅ Reduced Lambda invocations by 40-60%
- ✅ Lower costs ($0.085 per 10K requests vs $0.20 Lambda)
- ✅ Global edge caching (faster for distributed users)

**Effort:** 4 hours

---

#### 3b. Response Compression

**Current:** Responses average ~2KB uncompressed

**Solution:** Enable Brotli/Gzip compression

```python
# API Gateway automatically compresses if:
# 1. Response > 1KB
# 2. Content-Type is compressible
# 3. Accept-Encoding header present

# Ensure proper Content-Type:
headers = {
    'Content-Type': 'application/json; charset=utf-8',
    # ... other headers
}
```

**Expected compression:**
- Uncompressed: ~2KB per response
- Gzip: ~600 bytes (70% reduction)
- Brotli: ~500 bytes (75% reduction)

**Benefits:**
- ✅ 70%+ bandwidth reduction
- ✅ Faster transfer times (especially mobile)
- ✅ Lower CloudFront costs

**Effort:** Already enabled, just verify

---

#### 3c. HTTP/2 Server Push (Future Enhancement)

**Concept:** Proactively push popular search results

```typescript
// When user visits Submit page, preload popular searches
const link = document.createElement('link');
link.rel = 'prefetch';
link.href = '/api/v1/locations/suggest-addresses?query=Dallas';
link.as = 'fetch';
document.head.appendChild(link);
```

**Benefits:**
- ✅ Instant results for predicted searches
- ✅ Better UX for first-time users

**Effort:** 2-3 hours

---

### Phase 4: Lambda Performance Tuning

#### 4a. Memory & CPU Optimization

**Current:** 512MB memory

**Testing Strategy:**
```bash
# Test different memory allocations
for memory in 512 1024 1536 2048; do
  aws lambda update-function-configuration \
    --function-name suggest-addresses \
    --memory-size $memory

  # Run 100 cold start tests
  # Run 100 warm tests
  # Measure p50, p95, p99 latency
done
```

**Expected Results:**
- 512MB: 1.2s cold, 450ms warm
- 1024MB: 800ms cold, 200ms warm (2x CPU)
- 1536MB: 600ms cold, 150ms warm
- 2048MB: 500ms cold, 120ms warm

**Recommendation:** **1024MB**
- Cost: ~$3.34 per 1M requests (vs $1.67 for 512MB)
- Latency: 50% faster
- ROI: Worth it for user experience

**CDK Update:**
```python
self.suggest_addresses_fn = lambda_.Function(
    # ...
    memory_size=1024,  # Doubled from 512MB
    timeout=Duration.seconds(8),  # Reduced from 10s
)
```

**Effort:** 2 hours (testing + deployment)

---

#### 4b. Provisioned Concurrency (Optional)

**Problem:** Cold starts add 1-2s latency for first request

**Solution:** Keep Lambda warm

```python
# infrastructure/stacks/main_stack.py
self.suggest_addresses_fn.add_alias(
    "live",
    provisioned_concurrent_executions=2  # Keep 2 instances warm
)
```

**Cost Analysis:**
- Provisioned capacity: $0.0000041667 per GB-second
- 2 instances × 1GB × 2,592,000 seconds/month = **$21.60/month**
- Eliminates ~30% of cold starts (during low traffic periods)

**When to use:**
- Traffic > 100 requests/hour consistently
- User experience is critical
- Budget allows $20+/month for this feature

**Recommendation:** **Wait until traffic justifies** (Q3 2024)

---

#### 4c. Async Fire-and-Forget for Cache Writes

**Current Problem:** Waiting for DynamoDB write adds latency

**Solution:** Write to cache asynchronously

```python
import threading

def async_cache_write(cache, query, region, suggestions):
    """Write to cache without blocking response."""
    thread = threading.Thread(
        target=lambda: cache.set(query, region, suggestions)
    )
    thread.daemon = True
    thread.start()

def handler(event, context):
    # ... geocode ...

    # Write to cache asynchronously (don't wait)
    async_cache_write(dynamo_cache, query, region, suggestions)

    # Return immediately
    return success_response(data={'suggestions': suggestions})
```

**Benefits:**
- ✅ 20-30ms latency reduction (no DynamoDB write wait)
- ✅ Same caching benefits
- ✅ Fire-and-forget pattern

**Trade-off:** Cache write might fail silently (acceptable for cache)

**Effort:** 1 hour

---

### Phase 5: Monitoring & Performance Tracking

#### 5a. CloudWatch Custom Metrics

```python
# backend/functions/locations/suggest_addresses.py
import time
from aws_embedded_metrics import metric_scope

@metric_scope
def handler(event, context, metrics):
    start_time = time.time()
    cache_hit = False

    # Check cache
    cached = cache.get(query, region)
    if cached:
        cache_hit = True
        suggestions = cached
    else:
        suggestions = geocode(query, region)

    # Emit metrics
    latency = (time.time() - start_time) * 1000
    metrics.put_metric("Latency", latency, "Milliseconds")
    metrics.put_metric("CacheHit", 1 if cache_hit else 0, "Count")
    metrics.put_metric("SuggestionCount", len(suggestions), "Count")

    metrics.set_property("Region", region)
    metrics.set_property("QueryLength", len(query))

    return success_response(data={'suggestions': suggestions})
```

**Dashboard Metrics:**
1. **Performance**
   - Average/p95/p99 latency
   - Cold start rate
   - Cache hit rate by region

2. **Usage**
   - Requests per minute
   - Unique queries
   - Top searched addresses

3. **Errors**
   - Geocoding failures
   - Cache errors
   - Rate limit hits

**Effort:** 4 hours

---

#### 5b. Real User Monitoring (RUM)

**Frontend:**
```typescript
// src/utils/monitoring.ts
export function trackSearchPerformance(query: string, metrics: {
  startTime: number;
  endTime: number;
  cacheHit: boolean;
  resultsCount: number;
}) {
  const duration = metrics.endTime - metrics.startTime;

  // Send to analytics
  if (window.gtag) {
    window.gtag('event', 'address_search', {
      query_length: query.length,
      duration_ms: duration,
      cache_hit: metrics.cacheHit,
      results_count: metrics.resultsCount,
    });
  }

  // Log slow searches
  if (duration > 1000) {
    console.warn('Slow search detected:', {
      query,
      duration,
      cacheHit: metrics.cacheHit,
    });
  }
}
```

**Key Metrics to Track:**
- Time to first suggestion
- Total search time (debounce + network + render)
- User's network type (4G, 3G, etc.)
- Selection rate (% of searches that result in selection)

**Effort:** 3 hours

---

#### 5c. Performance Budgets & Alerts

```typescript
// performance-budget.json
{
  "address_suggestions_api": {
    "p95_latency_ms": 500,
    "p99_latency_ms": 1000,
    "cache_hit_rate": 0.60,
    "error_rate": 0.01
  },
  "frontend_search": {
    "time_to_first_result_ms": 800,
    "total_search_time_ms": 1200
  }
}
```

**CloudWatch Alarms:**
```python
# infrastructure/stacks/main_stack.py
cloudwatch.Alarm(
    self,
    "HighLatencyAlarm",
    metric=self.suggest_addresses_fn.metric_duration(
        statistic="p95"
    ),
    threshold=500,  # 500ms
    evaluation_periods=2,
    alarm_description="Address suggestion latency > 500ms (p95)",
)

cloudwatch.Alarm(
    self,
    "LowCacheHitRate",
    metric=cloudwatch.Metric(
        namespace="AddressSuggestions",
        metric_name="CacheHitRate",
        statistic="Average",
    ),
    threshold=0.50,  # < 50% cache hit
    comparison_operator=cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    evaluation_periods=3,
    alarm_description="Cache hit rate dropped below 50%",
)
```

**Effort:** 4 hours

---

## Performance Optimization Summary

### Complete Caching Strategy (Multi-Layer)

The recommended approach combines **5 caching layers** for maximum performance:

```
User types "123 Main St"
    ↓
[1] LocalStorage Check (< 1ms)
    ├─ HIT → Return cached suggestions
    └─ MISS ↓
[2] React Query Check (< 1ms)
    ├─ HIT → Return cached suggestions
    └─ MISS ↓
[3] Debounce (300ms wait)
    ↓
[4] CloudFront Edge Cache (< 50ms)
    ├─ HIT → Return from edge location
    └─ MISS ↓
[5] Lambda In-Memory Cache (< 1ms)
    ├─ HIT → Return from Lambda memory
    └─ MISS ↓
[6] DynamoDB Cache (~30ms)
    ├─ HIT → Cache in memory, return
    └─ MISS ↓
[7] Geocoding API (500-2000ms)
    ├─ Cache in DynamoDB (async)
    ├─ Cache in Lambda memory
    └─ Return results
```

### Expected Performance by Phase

| Metric | Current | Phase 1 | Phase 2 | Phase 3-5 | Target |
|--------|---------|---------|---------|-----------|--------|
| **Latency (p50)** | 800ms | 250ms | 150ms | 100ms | < 200ms |
| **Latency (p95)** | 1800ms | 600ms | 350ms | 250ms | < 500ms |
| **Latency (p99)** | 2500ms | 1200ms | 800ms | 500ms | < 1000ms |
| **Cache Hit Rate** | 0% | 50% | 75% | 85% | > 70% |
| **Cold Starts** | 30% | 30% | 30% | 5% | < 10% |
| **Cost per 1K** | $0.20 | $0.12 | $0.08 | $0.06 | < $0.10 |

### Implementation Priority

**Immediate (Week 1):**
1. ✅ **React Query** - 2-3 hours, 40% cache hit improvement
2. ✅ **DynamoDB cache** - 1 day, 60% cache hit improvement
3. ✅ **Lambda memory cache** - 2 hours, 15% additional cache hit

**Near-term (Weeks 2-3):**
4. ✅ **CloudFront caching** - 4 hours, 40% request reduction
5. ✅ **Lambda 1024MB** - 2 hours, 50% latency improvement
6. ✅ **Async cache writes** - 1 hour, 25ms latency reduction

**Mid-term (Month 2):**
7. ⏸️ **LocalStorage cache** - 4 hours, 25% additional cache hit
8. ⏸️ **Component memoization** - 1 hour, smoother UX
9. ⏸️ **CloudWatch metrics** - 4 hours, visibility

**Future (Q3 2024):**
10. ⏸️ **Provisioned concurrency** - When traffic > 100 req/hour
11. ⏸️ **Prefetching** - After analyzing popular searches
12. ⏸️ **AWS Location Service** - When Nominatim rate limits hit

### Performance Best Practices Applied

**Frontend:**
- ✅ Debouncing (300ms) - Already implemented
- ✅ Request deduplication - Via React Query
- ✅ Client-side caching - LocalStorage + React Query
- ✅ Memoization - Prevent unnecessary re-renders
- ✅ Prefetching - Warm cache for popular searches
- ✅ Network-aware - Respect connection type

**Backend:**
- ✅ Multi-tier caching - Memory → DynamoDB → CDN
- ✅ Async operations - Fire-and-forget cache writes
- ✅ Proper sizing - 1024MB Lambda for optimal cost/performance
- ✅ Compression - Brotli/Gzip enabled
- ✅ CDN caching - CloudFront edge locations
- ✅ TTL management - Automatic cache expiration

**Monitoring:**
- ✅ Custom metrics - Latency, cache hits, errors
- ✅ Real user monitoring - Frontend performance tracking
- ✅ Performance budgets - Clear targets
- ✅ Alerting - Proactive notification of issues

### ROI Analysis

**Investment:** ~3-4 weeks engineering time

**Returns:**
- **User Experience:** 800ms → 100ms average search time (87% faster)
- **Cost Savings:** $0.20 → $0.06 per 1K requests (70% reduction)
- **Scalability:** 10x throughput capacity with same infrastructure
- **Reliability:** 99.5% → 99.9% uptime via caching fallbacks

**At 100K searches/month:**
- Before: $20/month, poor UX (800ms)
- After: $6/month, excellent UX (100ms)
- **Savings: $168/year + better user retention**

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
