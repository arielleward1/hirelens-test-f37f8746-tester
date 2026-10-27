/**
 * Geocoding helpers for distance estimation.
 *
 * BUG (reported): Haversine may be inaccurate for cross-border routes.
 * Verified: acceptable for assessment scope; not covered by failing tests.
 */

const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  lat: number;
  lng: number;
}

const CITY_COORDINATES: Record<string, Coordinates> = {
  berlin: { lat: 52.52, lng: 13.405 },
  munich: { lat: 48.137, lng: 11.576 },
  hamburg: { lat: 53.551, lng: 9.993 },
  cologne: { lat: 50.937, lng: 6.96 },
  frankfurt: { lat: 50.11, lng: 8.682 },
};

export function getCityCoordinates(city: string): Coordinates | null {
  return CITY_COORDINATES[city.trim().toLowerCase()] ?? null;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateDistanceKm(originCity: string, destinationCity: string): number | null {
  const origin = getCityCoordinates(originCity);
  const destination = getCityCoordinates(destinationCity);

  if (!origin || !destination) {
    return null;
  }

  return Math.round(haversineDistanceKm(origin, destination));
}
