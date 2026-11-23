import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { anchoredScroll } from './zoomAnchor';
import { useWheelZoom } from './zoomWheel';

/** CSS defines 1in as 96px and 25.4mm, so this factor is exact, not a guess. */
export const PX_PER_MM = 96 / 25.4;

export const ZOOM_STEPS = [0.1, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1, 1.25, 1.5, 2, 3];
export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
const WORK_PADDING_PX = 72;

export interface ZoomAnchorPoint {
  /** Viewport coordinates measured from the workbench's origin. */
  x: number;
  y: number;
}

interface PendingAnchor {
  oldZoom: number;
  anchor: ZoomAnchorPoint;
  scrollX: number;
  scrollY: number;
}

/**
 * The preview zoom of the Studio workbench: fit-to-window, the step buttons and
 * an anchored change, so the point of the sheet under the anchor (the viewport
 * centre unless a caller passes another) stays put when the stage resizes.
 */
export function useStudioZoom(spreadWidthMm: number, pageHeightMm: number) {
  const [zoom, setZoom] = useState(0.4);
  const [autoFit, setAutoFit] = useState(true);
  const workRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const pending = useRef<PendingAnchor | null>(null);

  /** Largest zoom at which the whole spread still fits the workbench. */
  const fitZoom = useCallback(() => {
    const el = workRef.current;
    if (!el) return 0.4;
    const availW = el.clientWidth - WORK_PADDING_PX * 2;
    const availH = el.clientHeight - WORK_PADDING_PX * 2;
    if (availW <= 0 || availH <= 0) return 0.4;
    const z = Math.min(availW / (spreadWidthMm * PX_PER_MM), availH / (pageHeightMm * PX_PER_MM));
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  }, [spreadWidthMm, pageHeightMm]);

  const zoomToFit = useCallback(() => {
    pending.current = null;
    setAutoFit(true);
    setZoom(fitZoom());
  }, [fitZoom]);

  /** Zoom to `target`, keeping the sheet point under `anchor` (default: the centre) in place. */
  const zoomTo = useCallback((target: number, anchor?: ZoomAnchorPoint) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target));
    const el = workRef.current;
    setAutoFit(false);
    if (el && next !== zoomRef.current) {
      pending.current = {
        oldZoom: pending.current?.oldZoom ?? zoomRef.current,
        anchor: anchor ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 },
        scrollX: el.scrollLeft,
        scrollY: el.scrollTop,
      };
    }
    zoomRef.current = next;
    setZoom(next);
  }, []);

  const stepZoom = useCallback(
    (dir: 1 | -1, anchor?: ZoomAnchorPoint) => {
      const prev = zoomRef.current;
      const next =
        dir === 1
          ? (ZOOM_STEPS.find((s) => s > prev + 0.001) ?? MAX_ZOOM)
          : ([...ZOOM_STEPS].reverse().find((s) => s < prev - 0.001) ?? MIN_ZOOM);
      zoomTo(next, anchor);
    },
    [zoomTo]
  );

  useWheelZoom(workRef, () => zoomRef.current, zoomTo);

  // Fit on mount and on resize, but only while the user has not taken over the
  // zoom — otherwise a window resize would silently undo their choice.
  useLayoutEffect(() => {
    if (autoFit) {
      const z = fitZoom();
      zoomRef.current = z;
      setZoom(z);
    }
  }, [autoFit, fitZoom]);

  useEffect(() => {
    const el = workRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (!autoFit) return;
      const z = fitZoom();
      zoomRef.current = z;
      setZoom(z);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit, fitZoom]);

  // After the new size is laid out: re-anchor a manual change, and let a fitted
  // sheet sit centred with nothing scrolled.
  useLayoutEffect(() => {
    const el = workRef.current;
    const p = pending.current;
    pending.current = null;
    if (!el) return;
    if (autoFit) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
      return;
    }
    if (!p) return;
    const next = anchoredScroll({
      scroll: { x: p.scrollX, y: p.scrollY },
      viewport: { width: el.clientWidth, height: el.clientHeight },
      anchor: p.anchor,
      base: { width: spreadWidthMm * PX_PER_MM, height: pageHeightMm * PX_PER_MM },
      oldZoom: p.oldZoom,
      newZoom: zoom,
    });
    el.scrollLeft = next.x;
    el.scrollTop = next.y;
  }, [zoom, autoFit, spreadWidthMm, pageHeightMm]);

  return {
    zoom,
    setAutoFit,
    workRef,
    stepZoom,
    zoomTo,
    zoomToFit,
    canZoomIn: zoom < MAX_ZOOM - 0.001,
    canZoomOut: zoom > MIN_ZOOM + 0.001,
  };
}
