import { act, renderHook } from '@testing-library/react';
import { PX_PER_MM, useStudioZoom } from './useStudioZoom';
import { anchoredScroll } from './zoomAnchor';

const W_MM = 200;
const H_MM = 100;
const BASE_W = W_MM * PX_PER_MM;

/** A workbench stand-in with a real size, so the hook has something to anchor in. */
function mount(width = 800, height = 600) {
  const hook = renderHook(() => useStudioZoom(W_MM, H_MM));
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
  act(() => {
    hook.result.current.workRef.current = el;
  });
  return { ...hook, el };
}

describe('useStudioZoom', () => {
  it('starts fitted and steps through the zoom stops, one way and the other', () => {
    const { result } = mount();
    act(() => result.current.stepZoom(1));
    const up = result.current.zoom;
    act(() => result.current.stepZoom(1));
    expect(result.current.zoom).toBeGreaterThan(up);
    act(() => result.current.stepZoom(-1));
    expect(result.current.zoom).toBe(up);
    expect(result.current.canZoomIn).toBe(true);
  });

  it('clamps at the ends', () => {
    const { result } = mount();
    act(() => result.current.zoomTo(100));
    expect(result.current.zoom).toBe(3);
    expect(result.current.canZoomIn).toBe(false);
    act(() => result.current.zoomTo(0));
    expect(result.current.zoom).toBe(0.1);
    expect(result.current.canZoomOut).toBe(false);
  });

  it('keeps the centre of the visible area when zooming from a fitted view', () => {
    const { result, el } = mount();
    act(() => result.current.zoomTo(0.5));
    el.scrollLeft = 0;
    // Re-run layout at 0.5 -> 1: the centre of the sheet stays at the viewport centre.
    act(() => result.current.zoomTo(1));
    expect(el.scrollLeft).toBeCloseTo(40 + BASE_W / 2 - 400, 3);
  });

  it('anchors on an explicit point instead of the centre', () => {
    const { result, el } = mount(500, 600);
    act(() => result.current.zoomTo(0.5));
    el.scrollLeft = 0;
    // Anchor at x=300; the old stage (size ~378) sits at offset ~211.
    const oldSize = BASE_W * 0.5;
    const offset = Math.max(40, (500 - oldSize) / 2);
    const fraction = (300 - offset) / oldSize;
    act(() => result.current.zoomTo(1, { x: 300, y: 300 }));
    expect(el.scrollLeft).toBeCloseTo(40 + fraction * BASE_W - 300, 3);
  });

  it('resets the scroll when the sheet is fitted again', () => {
    const { result, el } = mount();
    act(() => result.current.zoomTo(2));
    el.scrollLeft = 200;
    el.scrollTop = 50;
    act(() => result.current.zoomToFit());
    expect(el.scrollLeft).toBe(0);
    expect(el.scrollTop).toBe(0);
  });
});

describe('useStudioZoom wheel zoom', () => {
  function wheel(el: HTMLElement, init: WheelEventInit) {
    const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(e);
    return e;
  }

  it('zooms on Ctrl+wheel at the pointer and cancels the browser zoom', () => {
    const { result, el, rerender } = mount();
    rerender();
    el.getBoundingClientRect = () => ({ left: 10, top: 20 }) as DOMRect;
    const before = result.current.zoom;
    let e!: WheelEvent;
    act(() => {
      e = wheel(el, { ctrlKey: true, deltaY: -100, clientX: 110, clientY: 220 });
    });
    expect(e.defaultPrevented).toBe(true);
    expect(result.current.zoom).toBeCloseTo(before * 1.1, 5);
    // Anchored at the pointer (100, 200 from the workbench origin), not the centre.
    const expected = anchoredScroll({
      scroll: { x: 0, y: 0 },
      viewport: { width: 800, height: 600 },
      anchor: { x: 100, y: 200 },
      base: { width: BASE_W, height: H_MM * PX_PER_MM },
      oldZoom: before,
      newZoom: result.current.zoom,
    });
    expect(el.scrollLeft).toBe(expected.x);
    expect(el.scrollTop).toBe(expected.y);
  });

  it('compounds several events from the latest zoom and clamps', () => {
    const { result, el, rerender } = mount();
    rerender();
    const before = result.current.zoom;
    act(() => {
      wheel(el, { ctrlKey: true, deltaY: -100 });
      wheel(el, { ctrlKey: true, deltaY: -100 });
    });
    expect(result.current.zoom).toBeCloseTo(before * 1.21, 5);
    act(() => {
      for (let i = 0; i < 40; i++) wheel(el, { ctrlKey: true, deltaY: -300 });
    });
    expect(result.current.zoom).toBe(3);
  });

  it('ignores a wheel without Ctrl so the workbench keeps scrolling', () => {
    const { result, el, rerender } = mount();
    rerender();
    const before = result.current.zoom;
    let e!: WheelEvent;
    act(() => {
      e = wheel(el, { deltaY: -100 });
    });
    expect(e.defaultPrevented).toBe(false);
    expect(result.current.zoom).toBe(before);
  });
});
