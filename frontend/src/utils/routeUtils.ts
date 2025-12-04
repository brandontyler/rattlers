import type { Location } from '@/types';

/**
 * Calculate the Haversine distance between two points in miles.
 * This gives the "as the crow flies" distance.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate driving distance from straight-line distance.
 * Roads aren't straight, so we apply a road factor.
 */
export function estimateDrivingDistance(straightLineDistance: number): number {
  const ROAD_FACTOR = 1.4; // Roads are typically ~40% longer than straight lines
  return straightLineDistance * ROAD_FACTOR;
}

/**
 * Estimate driving time in minutes for Christmas light viewing.
 * Uses slower speed for residential areas and light viewing.
 */
export function estimateDrivingTime(drivingDistanceMiles: number): number {
  const AVG_SPEED_MPH = 25; // Slow for residential areas
  const timeHours = drivingDistanceMiles / AVG_SPEED_MPH;
  return Math.round(timeHours * 60);
}

/**
 * Calculate the total route distance and time.
 */
export function calculateRouteStats(stops: Location[]): {
  totalDistance: number;
  totalTime: number;
} {
  if (stops.length < 2) {
    return { totalDistance: 0, totalTime: 0 };
  }

  let totalDistance = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i];
    const next = stops[i + 1];
    const straightLine = haversineDistance(
      current.lat,
      current.lng,
      next.lat,
      next.lng
    );
    totalDistance += estimateDrivingDistance(straightLine);
  }

  // Add ~3 minutes viewing time per stop
  const viewingTime = stops.length * 3;
  const drivingTime = estimateDrivingTime(totalDistance);

  return {
    totalDistance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
    totalTime: drivingTime + viewingTime,
  };
}

/**
 * Optimize route using Nearest Neighbor algorithm.
 * Starts from the first stop and always goes to the nearest unvisited stop.
 * Simple but effective for small numbers of stops.
 */
export function optimizeRoute(stops: Location[]): Location[] {
  if (stops.length <= 2) {
    return [...stops];
  }

  const optimized: Location[] = [];
  const unvisited = [...stops];

  // Start with the first stop (user's first choice)
  optimized.push(unvisited.shift()!);

  while (unvisited.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    // Find the nearest unvisited stop
    for (let i = 0; i < unvisited.length; i++) {
      const distance = haversineDistance(
        current.lat,
        current.lng,
        unvisited[i].lat,
        unvisited[i].lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Move nearest stop to optimized list
    optimized.push(unvisited.splice(nearestIndex, 1)[0]);
  }

  return optimized;
}

/**
 * Format duration in minutes to a readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Format distance in miles to a readable string.
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return '< 0.1 mi';
  }
  return `${miles.toFixed(1)} mi`;
}
