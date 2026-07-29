// src/features/mapping/PolygonDrawer.js
import * as turf from '@turf/turf';

/**
 * Validate a polygon for EUDR compliance
 * @param {Array<[number, number]>} coords - GeoJSON coordinates [[lng, lat], ...]
 * @returns {Object} { isValid, errors }
 */
export function validatePolygon(coords) {
  const errors = [];

  if (coords.length < 3) {
    errors.push('Polygon must have at least 3 vertices.');
  }

  try {
    const polygon = turf.polygon([coords]);
    const kinks = turf.kinks(polygon);
    if (kinks.features.length > 0) {
      errors.push(`Polygon self-intersects at ${kinks.features.length} points.`);
    }
  } catch (err) {
    errors.push('Invalid GeoJSON structure.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate area in hectares using Turf.js
 * @param {Array<[number, number]>} coords - GeoJSON coordinates
 * @returns {number} Area in hectares
 */
export function calculateArea(coords) {
  try {
    const polygon = turf.polygon([coords]);
    const areaSqMeters = turf.area(polygon);
    return parseFloat((areaSqMeters / 10000).toFixed(4));
  } catch (err) {
    console.error('Area calculation error:', err);
    return 0;
  }
}

/**
 * Check EUDR area rules
 * @param {number} areaHa - Area in hectares
 * @returns {Object} { status, requiresFullPolygon, message }
 */
export function checkEUDRArea(areaHa) {
  if (areaHa >= 4.0) {
    return {
      status: 'REQUIRES_POLYGON',
      requiresFullPolygon: true,
      message: '≥ 4 ha → Full polygon boundary required (you have this).',
    };
  } else {
    return {
      status: 'POINT_ACCEPTED',
      requiresFullPolygon: false,
      message: '< 4 ha → Single GPS point acceptable (polygon also fine).',
    };
  }
}

/**
 * Full EUDR compliance check (area + geometry validation)
 * @param {Array<[number, number]>} coords - GeoJSON coordinates
 * @param {string} geometryType - 'Point' or 'Polygon'
 * @returns {Object} { compliant, errors, areaHa, requiresFullPolygon }
 */
export function fullEUDRCheck(coords, geometryType = 'Polygon') {
  const validation = validatePolygon(coords);
  if (!validation.isValid) {
    return {
      compliant: false,
      errors: validation.errors,
      areaHa: 0,
      requiresFullPolygon: false,
    };
  }

  const areaHa = calculateArea(coords);
  const eudr = checkEUDRArea(areaHa);

  if (eudr.requiresFullPolygon && geometryType !== 'Polygon') {
    return {
      compliant: false,
      errors: ['EUDR Violation: ≥ 4 ha requires Polygon geometry.'],
      areaHa,
      requiresFullPolygon: true,
    };
  }

  return {
    compliant: true,
    errors: [],
    areaHa,
    requiresFullPolygon: eudr.requiresFullPolygon,
    eudrStatus: eudr.status,
  };
}
