import { anchoredScroll, anchoredScrollAxis } from './zoomAnchor';

const axis = { viewport: 1000, base: 1000, padding: 40 };

describe('anchoredScrollAxis', () => {
  it('keeps the sheet point under the anchor while growing from a centred stage', () => {
    // 0.5 -> 1: stage 500 centred at 250, anchor at the viewport centre (the sheet middle).
    const scroll = anchoredScrollAxis({ ...axis, scroll: 0, anchor: 500, oldZoom: 0.5, newZoom: 1 });
    // The sheet middle is now at 40 + 500 in content; to sit at 500 in view the scroll is 40.
    expect(scroll).toBe(40);
  });

  it('maps the anchored fraction through the new size', () => {
    // Anchor at 25% of the old stage (offset 250 + 125 = 375).
    const scroll = anchoredScrollAxis({ ...axis, scroll: 0, anchor: 375, oldZoom: 0.5, newZoom: 2 });
    // New stage 2000 starts at 40; 25% is 540; keep it at 375 in view.
    expect(scroll).toBe(165);
  });

  it('stays at zero while the new stage still fits the viewport', () => {
    expect(anchoredScrollAxis({ ...axis, scroll: 0, anchor: 500, oldZoom: 0.25, newZoom: 0.5 })).toBe(0);
  });

  it('returns to zero when zooming out until the sheet fits', () => {
    expect(anchoredScrollAxis({ ...axis, scroll: 540, anchor: 500, oldZoom: 2, newZoom: 0.5 })).toBe(0);
  });

  it('keeps an off-centre anchor fixed while zooming out of an overflowing stage', () => {
    // Old 2000 at offset 40, scroll 600, anchor 300: sheet fraction (600+300-40)/2000 = 0.43.
    const scroll = anchoredScrollAxis({ ...axis, scroll: 600, anchor: 300, oldZoom: 2, newZoom: 1.5 });
    // New 1500 at offset 40: 40 + 0.43*1500 - 300 = 385.
    expect(scroll).toBeCloseTo(385, 5);
  });

  it('clamps to the scrollable range', () => {
    // Anchor at the far edge of the stage cannot scroll past the content end.
    const scroll = anchoredScrollAxis({ ...axis, scroll: 0, anchor: 960, oldZoom: 1, newZoom: 3 });
    expect(scroll).toBeLessThanOrEqual(3000 + 80 - 1000);
    expect(scroll).toBeGreaterThan(0);
  });

  it('defaults the padding and tolerates a degenerate size', () => {
    expect(anchoredScrollAxis({ scroll: 0, viewport: 1000, anchor: 500, base: 1000, oldZoom: 0.5, newZoom: 1 })).toBe(
      40
    );
    expect(anchoredScrollAxis({ ...axis, scroll: 0, anchor: 0, oldZoom: 0, newZoom: 1 })).toBe(0);
  });
});

describe('anchoredScroll', () => {
  it('solves both axes independently', () => {
    const r = anchoredScroll({
      scroll: { x: 0, y: 0 },
      viewport: { width: 1000, height: 600 },
      anchor: { x: 500, y: 300 },
      base: { width: 1000, height: 600 },
      oldZoom: 0.5,
      newZoom: 1,
      padding: 40,
    });
    expect(r).toEqual({ x: 40, y: 40 });
  });
});
