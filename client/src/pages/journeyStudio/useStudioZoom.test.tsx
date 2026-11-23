import { act, renderHook } from '@testing-library/react';
import { PX_PER_MM, useStudioZoom } from './useStudioZoom';

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
