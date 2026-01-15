# mapcn Integration Plan

**Created:** January 15, 2026
**Status:** Planning Phase
**Branch:** `claude/christmas-lights-mapping-7u0KR`

## Executive Summary

This document outlines the plan to migrate from Leaflet to **mapcn** - a modern map component library built on MapLibre GL with shadcn/ui integration. This migration will modernize our mapping infrastructure, improve performance, and provide a better developer experience.

## What is mapcn?

**mapcn** is an open-source mapping library created by Anmol Saini that provides:
- Built on **MapLibre GL** (WebGL-based, significantly faster than Leaflet's Canvas renderer)
- **Zero-config setup** with one command installation
- **shadcn/ui integration** for consistent, modern UI components
- **Theme-aware** maps (automatic light/dark mode switching)
- **CARTO Basemaps** by default (free for non-commercial use)
- **Composable components** for markers, popups, routes, and controls
- **MIT License** with 4.5k GitHub stars

**Resources:**
- Website: https://www.mapcn.dev/docs
- GitHub: https://github.com/AnmolSaini16/mapcn
- Installation: `npx shadcn@latest add https://mapcn.vercel.app/maps/map.json`

## Current State vs. mapcn

### Current Stack (Leaflet)
```
- Leaflet 1.9.4 + React Leaflet 4.2.1
- OpenStreetMap tiles
- leaflet.markercluster for clustering
- Custom marker icons (SVG-based)
- Manual popup rendering with React roots
- Canvas rendering
- ~200KB bundle size (leaflet + react-leaflet)
```

### Proposed Stack (mapcn)
```
- MapLibre GL + mapcn components
- CARTO Basemaps (theme-aware)
- Built-in clustering support
- Composable marker components
- Native React component popups
- WebGL rendering
- Expected ~150-180KB bundle size
```

## Benefits of Migration

### 1. **Performance Improvements**
- **WebGL rendering** vs Canvas - smoother panning, zooming, rotation
- **Vector tiles** vs Raster tiles - faster load times, sharper on retina displays
- **Better clustering** - native MapLibre clustering is faster than leaflet.markercluster
- **Hardware acceleration** - leverages GPU for rendering

### 2. **Developer Experience**
- **Modern React patterns** - no manual React root creation for popups
- **TypeScript-first** - better type safety and IntelliSense
- **shadcn/ui integration** - consistent with modern design systems
- **Composable components** - cleaner, more maintainable code
- **Zero config** - sensible defaults, less boilerplate

### 3. **Visual & UX Enhancements**
- **Theme support** - automatic light/dark mode switching
- **Smoother animations** - WebGL enables fluid transitions
- **Better mobile experience** - touch gestures, pinch-to-zoom
- **Modern basemaps** - CARTO's beautiful, clean designs
- **3D capabilities** - future potential for 3D building extrusion

### 4. **Maintenance & Scalability**
- **Active development** - mapcn is actively maintained (47 commits, growing community)
- **Modern dependencies** - MapLibre GL is the future (Mapbox fork after license change)
- **Smaller bundle** - MapLibre is lighter than Leaflet + plugins
- **Better documentation** - comprehensive docs at mapcn.dev

## Migration Strategy

### Phase 1: Proof of Concept (Week 1)
**Goal:** Validate mapcn works with our use case

- [ ] Install mapcn and dependencies
- [ ] Create basic map component with DFW center
- [ ] Implement single location marker with popup
- [ ] Test clustering with 147 locations
- [ ] Verify custom marker icons work
- [ ] Test route polyline rendering
- [ ] Measure bundle size impact
- [ ] Performance benchmarking (render time, FPS)

**Success Criteria:**
- Map renders 147 locations smoothly
- Custom burgundy markers display correctly
- Popups show LocationPopup component
- Clustering works at various zoom levels
- Route polylines render accurately
- Bundle size ≤ current size

### Phase 2: Feature Parity (Week 2)
**Goal:** Replicate all existing Leaflet features

- [ ] **Markers:**
  - Custom burgundy marker icon
  - Hot/trending marker with flame badge
  - User location marker (blue dot)
  - Numbered route markers (1-20)

- [ ] **Popups:**
  - LocationPopup component integration
  - Mobile-responsive sizing (250px mobile, 300px desktop)
  - Auto-pan on popup open
  - Close on outside click

- [ ] **Clustering:**
  - Cluster groups with count badges
  - Spiderfy on max zoom
  - Custom cluster styling (burgundy theme)

- [ ] **Route Visualization:**
  - Polyline with route path
  - Numbered markers for stops
  - Route panel integration

- [ ] **Controls:**
  - "Near Me" button (geolocation)
  - Zoom controls
  - Fullscreen button
  - Mobile-responsive layout

**Success Criteria:**
- All current features work identically
- No visual regressions
- Mobile experience is equal or better
- Tests pass (update test suite)

### Phase 3: Enhanced Features (Week 3)
**Goal:** Leverage mapcn's unique capabilities

- [ ] **Theme Support:**
  - Implement light/dark mode toggle
  - CARTO Basemap light/dark variants
  - Update markers for dark mode visibility

- [ ] **Performance Optimizations:**
  - Enable vector tile caching
  - Implement viewport-based rendering
  - Lazy load marker data

- [ ] **UX Enhancements:**
  - Smooth zoom animations
  - Rotate gesture support (mobile)
  - Better touch interactions
  - Compass control for orientation

- [ ] **Visual Polish:**
  - Shadcn/ui styled controls
  - Animated marker transitions
  - Hover effects on clusters
  - Route path animations

**Success Criteria:**
- Dark mode works seamlessly
- 60 FPS on all interactions
- Mobile gestures feel native
- Visual consistency with shadcn/ui

### Phase 4: Testing & Deployment (Week 4)
**Goal:** Production-ready deployment

- [ ] **Testing:**
  - Update component tests for mapcn
  - E2E tests for map interactions
  - Performance regression tests
  - Mobile device testing (iOS/Android)
  - Accessibility testing (keyboard navigation)

- [ ] **Documentation:**
  - Update README.md tech stack
  - Document mapcn component API
  - Add migration notes to CLAUDE.md
  - Update ARCHITECTURE.md

- [ ] **Deployment:**
  - Feature flag for gradual rollout
  - Monitor error rates
  - Performance metrics
  - User feedback collection

- [ ] **Cleanup:**
  - Remove Leaflet dependencies
  - Delete old MapView.tsx
  - Clean up unused imports
  - Update bundle analysis

**Success Criteria:**
- All tests pass (frontend + integration)
- Documentation is complete
- No increase in error rates
- Performance meets or exceeds benchmarks
- Positive user feedback

## Technical Implementation Details

### Component Structure

**Before (Leaflet):**
```tsx
<MapView
  locations={locations}
  center={[32.7767, -96.7970]}
  zoom={10}
  onLocationClick={handleClick}
  trendingLocationIds={trending}
/>
```

**After (mapcn):**
```tsx
<Map defaultCenter={[-96.7970, 32.7767]} defaultZoom={10}>
  {locations.map(location => (
    <Marker
      key={location.id}
      lngLat={[location.lng, location.lat]}
      icon={location.isTrending ? hotIcon : customIcon}
      onClick={() => handleClick(location)}
    >
      <Popup>
        <LocationPopup location={location} />
      </Popup>
    </Marker>
  ))}

  <RouteLayer path={routePath} />
  <Controls position="top-right">
    <NearMeButton />
    <ZoomControl />
    <FullscreenControl />
  </Controls>
</Map>
```

### Marker Icon Migration

**Current (Leaflet - SVG Data URI):**
```typescript
const customIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg>...</svg>`),
  iconSize: [32, 45],
  iconAnchor: [16, 45],
});
```

**New (mapcn - Component-based):**
```tsx
const CustomMarker = () => (
  <svg width="32" height="45" viewBox="0 0 32 45">
    <path d="M16 0C9.37 0 4 5.37 4 12..." fill="#cc3f3f"/>
    <circle cx="16" cy="12" r="6" fill="#fafaf3"/>
  </svg>
);

<Marker icon={<CustomMarker />} />
```

### Clustering Implementation

**Current (leaflet.markercluster):**
```typescript
const cluster = L.markerClusterGroup({
  maxClusterRadius: 50,
  iconCreateFunction: (c) => {
    return L.divIcon({
      html: `<div class="cluster-icon">${c.getChildCount()}</div>`,
      className: 'custom-cluster',
    });
  },
});
```

**New (mapcn built-in):**
```tsx
<Map cluster clusterRadius={50}>
  {locations.map(loc => (
    <Marker key={loc.id} lngLat={[loc.lng, loc.lat]} />
  ))}
</Map>
```

### Route Visualization

**Current (Leaflet Polyline):**
```typescript
const RouteMapLayer = () => {
  const map = useMap();
  useEffect(() => {
    if (routeStops.length >= 2) {
      const polyline = L.polyline(coordinates, {
        color: '#cc3f3f',
        weight: 3,
      }).addTo(map);
      return () => map.removeLayer(polyline);
    }
  }, [map, routeStops]);
};
```

**New (mapcn Layer):**
```tsx
<Layer
  id="route"
  type="line"
  source={{
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates,
      },
    },
  }}
  paint={{
    'line-color': '#cc3f3f',
    'line-width': 3,
  }}
/>
```

## Dependencies & Bundle Impact

### Install
```bash
# Install mapcn
npx shadcn@latest add https://mapcn.vercel.app/maps/map.json

# Additional dependencies (auto-installed)
npm install maplibre-gl
```

### Remove
```bash
npm uninstall leaflet react-leaflet leaflet.markercluster @types/leaflet @types/leaflet.markercluster
```

### Bundle Size Comparison

**Current:**
```
vendor-map.js: 155KB (45KB gzip)
- leaflet: ~140KB
- react-leaflet: ~15KB
- leaflet.markercluster: ~20KB
Total: ~175KB minified
```

**Projected:**
```
vendor-map.js: ~160KB (48KB gzip)
- maplibre-gl: ~140KB
- mapcn components: ~20KB
Total: ~160KB minified
```

**Net Change:** -15KB minified (~-3KB gzip)

## Trade-offs & Considerations

### Pros ✅
- **Better performance** - WebGL is significantly faster
- **Modern DX** - Better TypeScript, cleaner API
- **Theme support** - Built-in light/dark mode
- **Future-proof** - MapLibre is actively developed
- **Smaller bundle** - Removes leaflet.markercluster plugin
- **Better mobile** - Native touch gesture support

### Cons ⚠️
- **Learning curve** - Team needs to learn MapLibre concepts
- **Migration effort** - ~2-3 weeks of development time
- **Commercial license** - CARTO basemaps require license for commercial use
  - **Mitigation:** Use OpenStreetMap tiles or other providers
- **Testing overhead** - All map tests need rewriting
- **Risk of regressions** - Complex component with many features
- **WebGL dependency** - Older browsers without WebGL support
  - **Mitigation:** MapLibre has Canvas fallback

### Basemap Licensing Consideration

**CARTO Basemaps:**
- Free for **non-commercial use** under CARTO's grant program
- Requires **Enterprise license** for commercial applications
- This project is currently non-commercial (community-driven)

**Alternative Providers:**
```typescript
// OpenStreetMap (Free, open source)
<Map tileUrl="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

// Stamen Terrain (Free)
<Map tileUrl="https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg" />

// Mapbox (Paid, but generous free tier)
<Map
  tileUrl="mapbox://styles/mapbox/streets-v12"
  accessToken={process.env.MAPBOX_TOKEN}
/>
```

**Recommendation:** Start with CARTO (free), switch to OpenStreetMap if commercialization is considered.

## Testing Strategy

### Unit Tests
- [ ] Map component renders with default props
- [ ] Markers render at correct coordinates
- [ ] Popups open/close correctly
- [ ] Clustering activates at correct zoom levels
- [ ] Route polylines render with correct coordinates
- [ ] Controls (Near Me, Zoom) trigger correct actions

### Integration Tests
- [ ] LocationPopup component integrates with mapcn Popup
- [ ] Route planner updates map polylines
- [ ] Favorites filter updates visible markers
- [ ] Search/filter updates marker visibility
- [ ] Trending locations show hot marker icon

### Visual Regression Tests
- [ ] Screenshot comparison for map appearance
- [ ] Marker icon rendering matches design
- [ ] Popup styling is consistent
- [ ] Mobile layout matches current design

### Performance Tests
- [ ] Map renders 147 locations in < 500ms
- [ ] Smooth panning at 60 FPS
- [ ] Clustering performance with 500+ markers
- [ ] Route rendering with 20 stops < 100ms

## Success Metrics

### Performance KPIs
- **Initial map load:** < 1 second (currently ~1.5s)
- **Marker rendering:** < 500ms for 147 locations
- **Frame rate:** Consistent 60 FPS during interactions
- **Bundle size:** No increase (ideally -10% reduction)

### Quality KPIs
- **Test coverage:** Maintain 100% of current coverage
- **Zero regressions:** All existing features work identically
- **Accessibility:** WCAG 2.1 AA compliance maintained
- **Mobile score:** Lighthouse performance ≥ 90

### User Experience KPIs
- **Error rate:** No increase in map-related errors
- **User feedback:** Positive sentiment on visual improvements
- **Engagement:** No drop in map interaction metrics

## Risk Mitigation

### High Risk: Feature Parity
**Risk:** Missing Leaflet features in mapcn
**Mitigation:**
- Complete POC phase validates all critical features
- Fallback plan to stay on Leaflet if blockers found
- Community engagement (mapcn Discord) for feature requests

### Medium Risk: Performance Regression
**Risk:** WebGL overhead on low-end devices
**Mitigation:**
- Performance testing on various devices
- MapLibre Canvas fallback for unsupported browsers
- Progressive enhancement strategy

### Medium Risk: Migration Bugs
**Risk:** Subtle bugs introduced during migration
**Mitigation:**
- Comprehensive test coverage before migration
- Feature flag for gradual rollout
- Monitoring and quick rollback plan

### Low Risk: Licensing Issues
**Risk:** CARTO basemap license confusion
**Mitigation:**
- Clear documentation of licensing terms
- OpenStreetMap tiles as fallback
- Legal review if monetization considered

## Implementation Checklist

### Phase 1: Setup
- [ ] Create feature branch `feat/mapcn-integration`
- [ ] Install mapcn and dependencies
- [ ] Create new `MapViewMapcn.tsx` component (parallel to existing)
- [ ] Feature flag: `VITE_ENABLE_MAPCN=true`

### Phase 2: Core Features
- [ ] Basic map with DFW center
- [ ] Location markers (custom burgundy icon)
- [ ] Location popups (LocationPopup integration)
- [ ] Marker clustering
- [ ] User location marker
- [ ] "Near Me" button

### Phase 3: Advanced Features
- [ ] Route visualization (polylines)
- [ ] Numbered route markers
- [ ] Trending markers (hot icon)
- [ ] Map controls (zoom, fullscreen)
- [ ] Mobile responsiveness

### Phase 4: Polish
- [ ] Theme support (light/dark)
- [ ] Smooth animations
- [ ] Performance optimizations
- [ ] Accessibility improvements

### Phase 5: Testing & Deployment
- [ ] Unit tests for all components
- [ ] Integration tests
- [ ] Visual regression tests
- [ ] Performance benchmarks
- [ ] Documentation updates
- [ ] Deploy behind feature flag
- [ ] Monitor metrics
- [ ] Full rollout

## Timeline

**Total Estimated Time:** 3-4 weeks

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: POC | 3-5 days | Working prototype with basic features |
| Phase 2: Feature Parity | 5-7 days | All Leaflet features replicated |
| Phase 3: Enhancements | 3-5 days | Theme support, performance tuning |
| Phase 4: Testing & Deploy | 3-5 days | Production-ready, documented |

**Milestones:**
- **Day 5:** POC demo to stakeholders
- **Day 12:** Feature-complete beta
- **Day 17:** Testing complete, documentation ready
- **Day 21:** Production deployment

## Next Steps

1. **Review this plan** with the team
2. **Get approval** to proceed with Phase 1 POC
3. **Create feature branch** `feat/mapcn-integration`
4. **Install mapcn** and validate basic functionality
5. **Build POC** with 10-20 locations
6. **Decision point:** Continue or stay with Leaflet

## Resources & References

- **mapcn Docs:** https://www.mapcn.dev/docs
- **GitHub Repo:** https://github.com/AnmolSaini16/mapcn
- **MapLibre GL Docs:** https://maplibre.org/maplibre-gl-js/docs/
- **CARTO Basemaps:** https://carto.com/basemaps/
- **shadcn/ui:** https://ui.shadcn.com/
- **Migration Discussion:** (Link to team discussion thread)

---

**Questions or concerns?** Comment on this document or reach out in the team channel.

**Author:** Claude Code
**Last Updated:** January 15, 2026
