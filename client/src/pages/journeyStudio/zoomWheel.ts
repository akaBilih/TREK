import { useEffect, useRef, type RefObject } from 'react';
import type { ZoomAnchorPoint } from './useStudioZoom';

/** Pixels a "line" or a "page" of wheel delta stands for (WheelEvent.deltaMode 1 and 2). */
const LINE_PX = 33;
const PAGE_PX = 800;
/** A mouse notch (about 100 px of delta) changes the zoom by 10%. */
const NOTCH_PX = 100;
const NOTCH_STEP = 1.1;
const ZOOM_PER_PX = Math.log(NOTCH_STEP) / NOTCH_PX;
/** One event never moves the zoom by more than about 3 notches (fast flicks, odd drivers). */
const MAX_DELTA_PX = 300;

/**
 * The factor one wheel event applies to the zoom. Scrolling up (negative delta) and a
 * pinch-out zoom in. Continuous, so a trackpad pinch's small deltas move the zoom smoothly
 * while a mouse notch is a comfortable step.
 */
export function wheelZoomFactor(deltaY: number, deltaMode = 0): number {
  const unit = deltaMode === 1 ? LINE_PX : deltaMode === 2 ? PAGE_PX : 1;
  const px = Math.max(-MAX_DELTA_PX, Math.min(MAX_DELTA_PX, deltaY * unit));
  return Math.exp(-px * ZOOM_PER_PX);
}

/**
 * Ctrl+wheel and trackpad pinch (which browsers send as wheel events with ctrlKey) zoom the
 * preview instead of the whole page, anchored at the pointer. The listener is native and
 * non-passive because React's onWheel is passive and could not cancel the browser zoom.
 * A plain wheel is left alone so the workbench keeps scrolling.
 */
export function useWheelZoom(
  workRef: RefObject<HTMLElement | null>,
  getZoom: () => number,
  zoomTo: (target: number, anchor?: ZoomAnchorPoint) => void
) {
  const latest = useRef({ getZoom, zoomTo });
  const bound = useRef<HTMLElement | null>(null);
  const unbind = useRef<(() => void) | null>(null);

  useEffect(() => {
    latest.current = { getZoom, zoomTo };
  });

  // The workbench can mount after the hook, so check the ref on every render and
  // only re-bind when the element itself changed.
  useEffect(() => {
    const el = workRef.current;
    if (el === bound.current) return;
    unbind.current?.();
    unbind.current = null;
    bound.current = el;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY === 0) return;
      const rect = el.getBoundingClientRect();
      const { getZoom: current, zoomTo: apply } = latest.current;
      apply(current() * wheelZoomFactor(e.deltaY, e.deltaMode), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    unbind.current = () => el.removeEventListener('wheel', onWheel);
  });

  useEffect(
    () => () => {
      unbind.current?.();
      unbind.current = null;
      bound.current = null;
    },
    []
  );
}
