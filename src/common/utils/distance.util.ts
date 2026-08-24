/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display.
 * e.g., "0.3 miles", "1.2 miles"
 */
export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} miles`;
}

/**
 * Get RAG busyness indicator color based on percentage.
 * Green: 0-33% (quiet, easy entry)
 * Amber: 34-66% (getting busy, some wait possible)
 * Red: 67-100% (packed, may restrict entry)
 */
export function getBusynessColor(percentage: number): string {
  if (percentage <= 33) return 'green';
  if (percentage <= 66) return 'amber';
  return 'red';
}

/**
 * Estimate walking time based on distance in miles.
 * Average walking speed: ~3 mph → 20 min per mile.
 */
export function estimateWalkingTime(miles: number): string {
  const minutes = Math.round(miles * 20);
  if (minutes < 1) return '1 min';
  return `${minutes} min`;
}

/**
 * Generate navigation deep links for a venue's coordinates.
 */
export function getNavigationLinks(lat: number, lng: number): {
  googleMaps: string;
  appleMaps: string;
  waze: string;
  webFallback: string;
} {
  return {
    googleMaps: `comgooglemaps://?daddr=${lat},${lng}`,
    appleMaps: `maps://?daddr=${lat},${lng}`,
    waze: `waze://?ll=${lat},${lng}&navigate=yes`,
    webFallback: `https://maps.google.com/maps?daddr=${lat},${lng}`,
  };
}

/**
 * Generate social proof message based on busyness level.
 * Simulates "X others are here" counts.
 */
export function generateSocialProof(busynessPercentage: number): {
  count: number;
  names: string[];
  message: string;
} {
  const mockNames = ['Sarah', 'Mike', 'Emma', 'Alex', 'James', 'Olivia', 'Daniel', 'Sophie'];
  let count: number;

  if (busynessPercentage <= 33) {
    count = 2 + Math.floor(Math.random() * 4); // 2-5
  } else if (busynessPercentage <= 66) {
    count = 10 + Math.floor(Math.random() * 16); // 10-25
  } else {
    count = 30 + Math.floor(Math.random() * 51); // 30-80
  }

  const displayNames = mockNames.slice(0, 2);
  const othersCount = count - displayNames.length;

  return {
    count,
    names: displayNames,
    message: `${displayNames.join(', ')} & ${othersCount} others are here`,
  };
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
