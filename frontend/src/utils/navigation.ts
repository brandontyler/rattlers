import type { Location } from '@/types';

/**
 * Supported navigation apps
 */
export type NavigationApp = 'google' | 'apple' | 'waze';

export interface NavigationAppInfo {
  id: NavigationApp;
  name: string;
  icon: string; // emoji for simplicity
  supportsMultiStop: boolean;
  maxWaypoints: number | null; // null = no waypoints support
}

/**
 * Information about each navigation app's capabilities
 */
export const NAVIGATION_APPS: Record<NavigationApp, NavigationAppInfo> = {
  google: {
    id: 'google',
    name: 'Google Maps',
    icon: '🗺️',
    supportsMultiStop: true,
    maxWaypoints: 25,
  },
  apple: {
    id: 'apple',
    name: 'Apple Maps',
    icon: '🍎',
    supportsMultiStop: false,
    maxWaypoints: null, // URL scheme doesn't support waypoints
  },
  waze: {
    id: 'waze',
    name: 'Waze',
    icon: '👻',
    supportsMultiStop: false,
    maxWaypoints: null, // Deep links don't support waypoints
  },
};

/**
 * Generate a Google Maps URL for multi-stop navigation.
 * Google Maps supports up to 25 waypoints via URL.
 */
export function getGoogleMapsUrl(stops: Location[]): string {
  if (stops.length === 0) return '';

  if (stops.length === 1) {
    // Single stop - simple destination URL
    const stop = stops[0];
    return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`;
  }

  // Multi-stop: first stop is origin, last is destination, middle are waypoints
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);

  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${origin.lat},${origin.lng}`;
  url += `&destination=${destination.lat},${destination.lng}`;

  if (waypoints.length > 0) {
    // Google Maps uses | to separate waypoints
    const waypointStr = waypoints.map((s) => `${s.lat},${s.lng}`).join('|');
    url += `&waypoints=${waypointStr}`;
  }

  url += '&travelmode=driving';

  return url;
}

/**
 * Generate an Apple Maps URL.
 * Note: Apple Maps URL scheme only supports start (saddr) and destination (daddr).
 * It does NOT support multiple waypoints via URL.
 *
 * For multi-stop routes, we navigate to the first/current stop.
 * Users will need to navigate stop-by-stop.
 */
export function getAppleMapsUrl(
  destination: Location,
  origin?: { lat: number; lng: number }
): string {
  // Apple Maps uses maps.apple.com which opens the Maps app on iOS
  // or Apple Maps on macOS, falling back to web on other platforms
  let url = `https://maps.apple.com/?`;

  // Destination is required
  url += `daddr=${destination.lat},${destination.lng}`;

  // Optional origin (user's current location will be used if not specified)
  if (origin) {
    url += `&saddr=${origin.lat},${origin.lng}`;
  }

  // Set driving mode
  url += '&dirflg=d';

  return url;
}

/**
 * Generate a Waze deep link URL.
 * Note: Waze deep links only support navigating to a single destination.
 * They do NOT support multiple waypoints.
 *
 * For multi-stop routes, we navigate to the first/current stop.
 * Users will need to navigate stop-by-stop.
 */
export function getWazeUrl(destination: Location): string {
  // Waze deep link format: https://waze.com/ul?ll=lat,lng&navigate=yes
  return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
}

/**
 * Generate a navigation URL for the specified app.
 * For apps that don't support multi-stop, returns URL to the specified stop index.
 */
export function getNavigationUrl(
  app: NavigationApp,
  stops: Location[],
  stopIndex: number = 0
): string {
  if (stops.length === 0) return '';

  switch (app) {
    case 'google':
      // Google Maps supports full multi-stop
      return getGoogleMapsUrl(stops);

    case 'apple':
      // Apple Maps: navigate to specific stop
      const appleDestination = stops[stopIndex] || stops[0];
      const appleOrigin = stopIndex > 0 ? stops[stopIndex - 1] : undefined;
      return getAppleMapsUrl(appleDestination, appleOrigin);

    case 'waze':
      // Waze: navigate to specific stop
      const wazeDestination = stops[stopIndex] || stops[0];
      return getWazeUrl(wazeDestination);

    default:
      return getGoogleMapsUrl(stops);
  }
}

/**
 * Generate URLs for navigating to each stop individually.
 * Useful for Apple Maps and Waze which don't support multi-stop.
 */
export function getStopByStopUrls(
  app: NavigationApp,
  stops: Location[]
): { stop: Location; url: string; index: number }[] {
  return stops.map((stop, index) => ({
    stop,
    url: getNavigationUrl(app, stops, index),
    index,
  }));
}

/**
 * Get the preferred navigation app from localStorage
 */
export function getPreferredNavigationApp(): NavigationApp {
  if (typeof window === 'undefined') return 'google';
  const saved = localStorage.getItem('preferredNavigationApp');
  if (saved && saved in NAVIGATION_APPS) {
    return saved as NavigationApp;
  }
  return 'google';
}

/**
 * Save the preferred navigation app to localStorage
 */
export function setPreferredNavigationApp(app: NavigationApp): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferredNavigationApp', app);
  }
}

/**
 * Open navigation in the specified app.
 * For multi-stop capable apps, opens the full route.
 * For single-destination apps, opens navigation to the first stop with a helpful message.
 */
export function openNavigation(
  app: NavigationApp,
  stops: Location[],
  stopIndex: number = 0
): void {
  const url = getNavigationUrl(app, stops, stopIndex);
  if (url) {
    window.open(url, '_blank');
  }
}
