import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { RouteMapLayer } from '@/components/route';
import type { Location } from '@/types';
import LocationPopup from './LocationPopup';
import { AuthProvider } from '@/contexts/AuthContext';

// Fix for default marker icons in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Custom burgundy marker icon
const customIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="45" viewBox="0 0 32 45" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#shadow)">
        <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#cc3f3f"/>
        <circle cx="16" cy="12" r="6" fill="#fafaf3"/>
        <circle cx="16" cy="12" r="3" fill="#eab308"/>
      </g>
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
    </svg>
  `),
  iconSize: [32, 45],
  iconAnchor: [16, 45],
  popupAnchor: [0, -45],
});

// Component to handle map center changes
function MapController({ center }: { center: LatLngTuple }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

// Marker cluster component
function MarkerCluster({ locations, onLocationClick }: { locations: Location[]; onLocationClick?: (location: Location) => void }) {
  const map = useMap();

  useEffect(() => {
    const L = window.L as typeof import('leaflet');
    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        return L.divIcon({
          html: `<div class="cluster-icon">${count}</div>`,
          className: 'custom-cluster',
          iconSize: [40, 40],
        });
      },
    });

    const roots: Array<ReturnType<typeof createRoot>> = [];

    locations.forEach((location) => {
      const marker = L.marker([location.lat, location.lng], { icon: customIcon });

      // Create popup content container
      const popupContent = document.createElement('div');

      // Create a React root and render LocationPopup
      const root = createRoot(popupContent);
      roots.push(root);
      root.render(
        <AuthProvider>
          <LocationPopup location={location} />
        </AuthProvider>
      );

      const popup = L.popup({
        maxWidth: 300,
        minWidth: 240, // Reduced for mobile compatibility
        className: 'location-popup',
        autoPan: false,
        closeOnClick: false,
      }).setContent(popupContent);

      marker.bindPopup(popup);
      
      // Manually pan map after popup opens to avoid close-on-pan issue
      marker.on('popupopen', () => {
        setTimeout(() => {
          const px = map.project(popup.getLatLng()!);
          px.y -= popup.getElement()!.clientHeight / 2;
          map.panTo(map.unproject(px), { animate: true });
        }, 50);
      });
      
      if (onLocationClick) {
        marker.on('click', () => onLocationClick(location));
      }
      
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);

    return () => {
      // Cleanup React roots before removing layer
      roots.forEach((root) => root.unmount());
      map.removeLayer(cluster);
    };
  }, [map, locations, onLocationClick]);

  return null;
}

interface MapViewProps {
  locations?: Location[];
  center?: LatLngTuple;
  zoom?: number;
  height?: string;
  onLocationClick?: (location: Location) => void;
}

export default function MapView({
  locations = [],
  center = [32.7767, -96.7970], // DFW default center
  zoom = 10,
  height = '600px',
  onLocationClick,
}: MapViewProps) {
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>(center);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: LatLngTuple = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(coords);
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, []);

  const handleNearMe = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: LatLngTuple = [
              position.coords.latitude,
              position.coords.longitude,
            ];
            setUserLocation(coords);
            setMapCenter(coords);
          },
          () => {
            alert('Unable to get your location. Please enable location services.');
          }
        );
      }
    }
  };

  return (
    <div className="relative">
      {/* Near Me Button - repositioned to bottom-left on mobile to avoid popup conflicts */}
      <button
        onClick={handleNearMe}
        className="absolute bottom-4 left-4 md:bottom-auto md:left-auto md:top-4 md:right-4 z-[1000] bg-white px-3 md:px-4 py-2 rounded-lg shadow-soft hover:shadow-soft-lg transition-shadow flex items-center gap-1.5 md:gap-2 text-forest-700 font-medium text-sm md:text-base"
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
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController center={mapCenter} />

          {/* Map tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User location marker */}
          {userLocation && (
            <Marker position={userLocation} icon={DefaultIcon}>
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-forest-700">You are here</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Clustered location markers */}
          <MarkerCluster locations={locations} onLocationClick={onLocationClick} />

          {/* Route visualization layer */}
          <RouteMapLayer />
        </MapContainer>
      </div>
    </div>
  );
}
