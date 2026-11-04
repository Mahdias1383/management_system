import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveSplashSpec,
  getAppleSplashLinksCatalog,
  getManifestIconCatalog,
} from '../pwaSplashGenerator';

describe('pwaSplashGenerator — Adaptive Splash Screen & High-Res Icon Engine', () => {
  it('computes accurate physical dimensions, portrait orientation, and 15% safe-zone margin', () => {
    const spec = computeAdaptiveSplashSpec({
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      theme: 'dark',
      lang: 'fa',
    });

    expect(spec.physicalWidth).toBe(1170);
    expect(spec.physicalHeight).toBe(2532);
    expect(spec.orientation).toBe('portrait');
    expect(spec.safeZoneMarginRatio).toBeGreaterThanOrEqual(0.15);
    expect(spec.safeZoneRadius).toBeLessThanOrEqual(Math.round(spec.emblemSize * 0.35));
    expect(spec.palette.themeColorMeta).toBe('#0f172a');
    expect(spec.copy.subtitle).toContain('سامانه هوشمند');
  });

  it('adapts geometry for landscape viewports and light theme in English', () => {
    const spec = computeAdaptiveSplashSpec({
      viewportWidth: 844,
      viewportHeight: 390,
      devicePixelRatio: 3,
      theme: 'light',
      lang: 'en',
    });

    expect(spec.physicalWidth).toBe(2532);
    expect(spec.physicalHeight).toBe(1170);
    expect(spec.orientation).toBe('landscape');
    expect(spec.palette.themeColorMeta).toBe('#f8fafc');
    expect(spec.copy.subtitle).toContain('Intelligent Railway Operations');
  });

  it('clamps invalid or extreme viewport and DPR inputs safely', () => {
    const spec = computeAdaptiveSplashSpec({
      viewportWidth: -100,
      viewportHeight: 0,
      devicePixelRatio: 99,
      theme: 'dark',
      lang: 'fa',
    });

    expect(spec.devicePixelRatio).toBe(4);
    expect(spec.physicalWidth).toBeGreaterThanOrEqual(320);
    expect(spec.physicalHeight).toBeGreaterThanOrEqual(320);
  });

  it('provides a complete high-resolution icon catalog with separate any, maskable, and monochrome purposes', () => {
    const icons = getManifestIconCatalog();
    const sizes = icons.map((i) => i.sizes);

    expect(sizes).toContain('72x72');
    expect(sizes).toContain('96x96');
    expect(sizes).toContain('128x128');
    expect(sizes).toContain('144x144');
    expect(sizes).toContain('152x152');
    expect(sizes).toContain('180x180');
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('384x384');
    expect(sizes).toContain('512x512');
    expect(sizes).toContain('1024x1024');

    const maskableIcons = icons.filter((i) => i.purpose === 'maskable');
    expect(maskableIcons.length).toBeGreaterThanOrEqual(4);
    // Ensure no icon combines "any maskable" in a single entry
    for (const icon of icons) {
      expect(['any', 'maskable', 'monochrome']).toContain(icon.purpose);
    }
  });

  it('provides adaptive apple-touch-startup-image descriptors for portrait, landscape, tablet, dark, and light modes', () => {
    const links = getAppleSplashLinksCatalog();
    expect(links.length).toBeGreaterThanOrEqual(7);
    expect(links.some((l) => l.orientation === 'portrait' && l.theme === 'dark')).toBe(true);
    expect(links.some((l) => l.orientation === 'portrait' && l.theme === 'light')).toBe(true);
    expect(links.some((l) => l.orientation === 'landscape')).toBe(true);
  });
});
