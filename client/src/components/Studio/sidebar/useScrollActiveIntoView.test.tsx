import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isWithin, useScrollActiveIntoView } from './useScrollActiveIntoView';

function rect(top: number, bottom: number): DOMRect {
  return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) };
}

function List({ active, count = 3 }: { active: number; count?: number }) {
  const ref = useScrollActiveIntoView<HTMLDivElement>(active);
  return (
    <div ref={ref} data-testid="box">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} className={`st-thumb ${i === active ? 'is-active' : ''}`} />
      ))}
    </div>
  );
}

const scrollIntoView = vi.fn();

function setup(visible: boolean) {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('st-thumb')) return visible ? rect(10, 50) : rect(500, 540);
    return rect(0, 100);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete Element.prototype.scrollIntoView;
});

describe('isWithin', () => {
  it('compares vertical extents', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue(rect(10, 20));
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue(rect(0, 100));
    expect(isWithin(a, b)).toBe(true);
    expect(isWithin(b, a)).toBe(false);
  });
});

describe('useScrollActiveIntoView', () => {
  it('scrolls instantly on mount when the active thumb is off screen', () => {
    setup(false);
    render(<List active={1} />);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' });
  });

  it('does nothing on mount when the active thumb is visible', () => {
    setup(true);
    render(<List active={1} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('eases to the new page when the active index changes', () => {
    setup(true);
    const { rerender } = render(<List active={0} />);
    rerender(<List active={2} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
  });

  it('does not scroll on a re-render with the same active index', () => {
    setup(false);
    const { rerender } = render(<List active={0} />);
    scrollIntoView.mockClear();
    rerender(<List active={0} count={4} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('jumps instead of easing under reduced motion', () => {
    setup(true);
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }));
    const { rerender } = render(<List active={0} />);
    rerender(<List active={1} />);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' });
    vi.unstubAllGlobals();
  });

  it('is a no-op where scrollIntoView does not exist', () => {
    setup(false);
    delete Element.prototype.scrollIntoView;
    expect(() => render(<List active={1} />)).not.toThrow();
  });
});
