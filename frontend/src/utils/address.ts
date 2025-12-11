/**
 * Extract just the street address from a full formatted address.
 * "314 Magnolia St, Denton, TX 76201, USA" → "314 Magnolia St"
 */
export function getShortAddress(fullAddress: string): string {
  if (!fullAddress) return '';
  // Split by comma and take the first part (street address)
  const parts = fullAddress.split(',');
  return parts[0].trim();
}

/**
 * Generate a Google Maps directions URL using the address.
 * Uses address for better display instead of just coordinates.
 */
export function getDirectionsUrl(address: string, lat?: number, lng?: number): string {
  // Prefer address-based URL for better display
  if (address) {
    const encoded = encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  }
  // Fallback to coordinates if no address
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return '';
}
