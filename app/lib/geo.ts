import type { Region, Coordinates } from '@/app/types';

/**
 * BIKA v2 — Geographic helpers.
 *
 * Approximate administrative centroids for Eswatini's four regions (WGS84).
 * Used as fallback coordinates when an incident has no GPS pin.
 */

export const REGION_CENTROIDS: Record<Region, Coordinates> = {
  Hhohho: { lat: -26.05, lng: 31.15 },
  Manzini: { lat: -26.45, lng: 31.2 },
  Shiselweni: { lat: -26.95, lng: 31.2 },
  Lubombo: { lat: -26.35, lng: 31.8 },
};

export function resolveMapCoordinates(
  region: Region | string | undefined,
  coordinates?: Coordinates | null
): Coordinates | null {
  if (
    coordinates &&
    typeof coordinates.lat === 'number' &&
    typeof coordinates.lng === 'number' &&
    !Number.isNaN(coordinates.lat) &&
    !Number.isNaN(coordinates.lng)
  ) {
    return { lat: coordinates.lat, lng: coordinates.lng };
  }
  if (region && region in REGION_CENTROIDS) {
    return REGION_CENTROIDS[region as Region];
  }
  return null;
}

export function isEswatiniCoordinate(coords: Coordinates): boolean {
  // Bounding box: approximately -27.4 to -25.6 lat, 30.7 to 32.2 lng
  return (
    coords.lat >= -27.4 &&
    coords.lat <= -25.6 &&
    coords.lng >= 30.7 &&
    coords.lng <= 32.2
  );
}
