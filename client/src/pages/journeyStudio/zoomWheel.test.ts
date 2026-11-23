import { wheelZoomFactor } from './zoomWheel';

describe('wheelZoomFactor', () => {
  it('turns a mouse notch into a 10% step, in and out', () => {
    expect(wheelZoomFactor(-100)).toBeCloseTo(1.1, 5);
    expect(wheelZoomFactor(100)).toBeCloseTo(1 / 1.1, 5);
  });

  it('is smooth for the small deltas of a pinch and neutral at zero', () => {
    expect(wheelZoomFactor(0)).toBe(1);
    const f = wheelZoomFactor(-2);
    expect(f).toBeGreaterThan(1);
    expect(f).toBeLessThan(1.01);
  });

  it('normalises lines and pages to pixels', () => {
    expect(wheelZoomFactor(-3, 1)).toBeCloseTo(wheelZoomFactor(-99), 5);
    expect(wheelZoomFactor(-1, 2)).toBeCloseTo(wheelZoomFactor(-300), 5);
  });

  it('caps one event at about three notches', () => {
    expect(wheelZoomFactor(-5000)).toBe(wheelZoomFactor(-300));
    expect(wheelZoomFactor(5000)).toBe(wheelZoomFactor(300));
  });
});
