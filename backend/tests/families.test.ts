import { describe, it, expect } from 'vitest';
import { coordsForRegion, isPubliclyVisibleFamily } from '../src/modules/families/families.service';

describe('Families Helpers & Geographic Jitter', () => {
  it('should generate coords with max +-0.006 jitter for known regions', () => {
    // Heliópolis base is [-23.612, -46.593]
    const baseLat = -23.612;
    const baseLng = -46.593;

    for (let i = 0; i < 100; i++) {
      const [lat, lng] = coordsForRegion('Heliópolis');
      const diffLat = lat - baseLat;
      const diffLng = lng - baseLng;

      expect(diffLat).toBeGreaterThanOrEqual(-0.006);
      expect(diffLat).toBeLessThanOrEqual(0.006);
      expect(diffLng).toBeGreaterThanOrEqual(-0.006);
      expect(diffLng).toBeLessThanOrEqual(0.006);
    }
  });

  it('should generate coords with max +-0.01 jitter centered on São Paulo for unknown regions', () => {
    // Fallback base is [-23.5505, -46.6333]
    const fallbackLat = -23.5505;
    const fallbackLng = -46.6333;

    for (let i = 0; i < 100; i++) {
      const [lat, lng] = coordsForRegion('Unknown Region Name');
      const diffLat = lat - fallbackLat;
      const diffLng = lng - fallbackLng;

      expect(diffLat).toBeGreaterThanOrEqual(-0.01);
      expect(diffLat).toBeLessThanOrEqual(0.01);
      expect(diffLng).toBeGreaterThanOrEqual(-0.01);
      expect(diffLng).toBeLessThanOrEqual(0.01);
    }
  });

  it('should return true for approved family visibility', () => {
    const visible = isPubliclyVisibleFamily({ status: 'approved' });
    expect(visible).toBe(true);
  });

  it('should return false for pending family visibility', () => {
    const visible = isPubliclyVisibleFamily({ status: 'pending' });
    expect(visible).toBe(false);
  });
});
