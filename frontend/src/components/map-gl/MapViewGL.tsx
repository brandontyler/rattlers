import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Location } from '@/types';
import LocationPopup from '../map/LocationPopup';
import { AuthProvider } from '@/contexts/AuthContext';
import { AchievementProvider } from '@/contexts/AchievementContext';

// Basemap styles
const BASEMAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

// Custom marker component
const CustomMarker = ({ isTrending = false }: { isTrending?: boolean }) => {
  if (isTrending) {
    return (
      <div style={{ width: '40px', height: '52px', marginTop: '-52px', marginLeft: '-20px' }}>
        <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#shadow2)">
            <path d="M20 7C13.37 7 8 12.37 8 19c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#cc3f3f"/>
            <circle cx="20" cy="19" r="6" fill="#fafaf3"/>
            <circle cx="20" cy="19" r="3" fill="#eab308"/>
            <circle cx="32" cy="10" r="8" fill="#ef4444"/>
            <path d="M32 5c-1 2-2 3-2 5 0 1.5 1 3 2 3s2-1.5 2-3c0-2-1-3-2-5z" fill="#fbbf24"/>
            <path d="M32 7c-.5 1-1 1.5-1 2.5 0 .75.5 1.5 1 1.5s1-.75 1-1.5c0-1-.5-1.5-1-2.5z" fill="#fef3c7"/>
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width: '32px', height: '45px', marginTop: '-45px', marginLeft: '-16px' }}>
      <svg width="32" height="45" viewBox="0 0 32 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#cc3f3f"/>
          <circle cx="16" cy="12" r="6" fill="#fafaf3"/>
          <circle cx="16" cy="12" r="3" fill="#eab308"/>
        </g>
      </svg>
    </div>
  );
};

// Numbered marker for route stops
const NumberedMarker = ({ number }: { number: number }) => (
  <div style={{ width: '32px', height: '45px', marginTop: '-45px', marginLeft: '-16px' }}>
    <svg width="32" height="45" viewBox="0 0 32 45" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={`shadow-${number}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#shadow-${number})`}>
        <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#2563eb"/>
        <circle cx="16" cy="12" r="8" fill="#fff"/>
        <text x="16" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2563eb">{number}</text>
      </g>
    </svg>
  </div>
);

interface MapViewGLProps {
  locations?: Location[];
  center?: [number, number]; // [lng, lat] for MapLibre
  zoom?: number;
  height?: string;
  onLocationClick?: (location: Location) => void;
  trendingLocationIds?: string[];
  routeStops?: Location[];
  theme?: 'light' | 'dark' | 'auto';
}

export default function MapViewGL({
  locations = [],
  center = [-96.7970, 32.7767], // DFW default center (lng, lat)
  zoom = 10,
  height = '600px',
  onLocationClick,
  trendingLocationIds = [],
  routeStops = [],
  theme = 'auto',
}: MapViewGLProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom,
  });
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const trendingSet = new Set(trendingLocationIds);

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Determine active theme
  const activeTheme = theme === 'auto' ? systemTheme : theme;
  const mapStyle = BASEMAP_STYLES[activeTheme];

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, []);

  const handleNearMe = useCallback(() => {
    if (userLocation) {
      setViewState(prev => ({
        ...prev,
        longitude: userLocation[0],
        latitude: userLocation[1],
        zoom: 13,
      }));
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
            setUserLocation(coords);
            setViewState(prev => ({
              ...prev,
              longitude: coords[0],
              latitude: coords[1],
              zoom: 13,
            }));
          },
          () => {
            alert('Unable to get your location. Please enable location services.');
          }
        );
      }
    }
  }, [userLocation]);

  const handleMarkerClick = useCallback((location: Location) => {
    setSelectedLocation(location);
    if (onLocationClick) {
      onLocationClick(location);
    }
  }, [onLocationClick]);

  // Generate GeoJSON for route line
  const routeLineGeoJSON = routeStops.length >= 2 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: routeStops.map(stop => [stop.lng, stop.lat]),
    },
  } : null;

  // Generate GeoJSON for location markers (for clustering)
  const locationsGeoJSON = {
    type: 'FeatureCollection' as const,
    features: locations
      .filter(loc => !routeStops.some(stop => stop.id === loc.id))
      .map(location => ({
        type: 'Feature' as const,
        properties: {
          id: location.id,
          address: location.address,
          isTrending: trendingSet.has(location.id),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [location.lng, location.lat],
        },
      })),
  };

  return (
    <div className="relative">
      {/* Near Me Button */}
      <button
        onClick={handleNearMe}
        className="absolute top-4 right-4 z-10 bg-white px-4 py-2 rounded-lg shadow-soft hover:shadow-soft-lg transition-shadow flex items-center gap-2 text-forest-700 font-medium"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Near Me
      </button>

      {/* Map Container */}
      <div style={{ height }} className="rounded-xl overflow-hidden shadow-soft-lg">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
        >
          {/* Navigation Controls */}
          <NavigationControl position="bottom-right" />
          <FullscreenControl position="bottom-right" />

          {/* Route Line */}
          {routeLineGeoJSON && (
            <Source id="route" type="geojson" data={routeLineGeoJSON}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#cc3f3f',
                  'line-width': 3,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              longitude={userLocation[0]}
              latitude={userLocation[1]}
              anchor="center"
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                border: '3px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }} />
            </Marker>
          )}

          {/* Route Stop Markers (numbered) */}
          {routeStops.map((stop, index) => (
            <Marker
              key={`route-${stop.id}`}
              longitude={stop.lng}
              latitude={stop.lat}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(stop);
              }}
            >
              <NumberedMarker number={index + 1} />
            </Marker>
          ))}

          {/* Location Markers */}
          {locations.map((location) => {
            // Don't render regular marker if it's a route stop
            if (routeStops.some(stop => stop.id === location.id)) {
              return null;
            }

            const isTrending = trendingSet.has(location.id);

            return (
              <Marker
                key={location.id}
                longitude={location.lng}
                latitude={location.lat}
                anchor="bottom"
                onClick={(e: any) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(location);
                }}
              >
                <CustomMarker isTrending={isTrending} />
              </Marker>
            );
          })}

          {/* Popup for selected location */}
          {selectedLocation && (
            <Popup
              longitude={selectedLocation.lng}
              latitude={selectedLocation.lat}
              anchor="bottom"
              onClose={() => setSelectedLocation(null)}
              closeOnClick={false}
              maxWidth="300px"
              className="location-popup"
            >
              <AuthProvider>
                <AchievementProvider>
                  <LocationPopup location={selectedLocation} />
                </AchievementProvider>
              </AuthProvider>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
