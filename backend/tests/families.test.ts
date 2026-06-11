import { describe, it, expect } from 'vitest';
import { coordsForRegion, isPubliclyVisibleFamily } from '../src/modules/families/families.service';

describe('Families Helpers', () => {
  it('should generate coords inside SP for unknown region', () => {
    const [lat, lng] = coordsForRegion('Unknown Region');
    expect(lat).toBeLessThan(-23.5);
    expect(lat).toBeGreaterThan(-23.6);
    expect(lng).toBeLessThan(-46.6);
    expect(lng).toBeGreaterThan(-46.7);
  });

  it('should generate coords near Heliopolis', () => {
    const [lat, lng] = coordsForRegion('Heliópolis');
    expect(lat).toBeLessThan(-23.6);
    expect(lat).toBeGreaterThan(-23.62);
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
