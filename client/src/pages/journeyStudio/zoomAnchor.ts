/**
 * Keeping the preview anchored while the zoom changes.
 *
 * The workbench centres the stage while it fits and lets it start at the padding
 * edge once it overflows, so a new zoom moves the stage under a scroll position
 * that did not change. Working in sheet-relative fractions makes the point under
 * the anchor survive that: the same spot of the sheet stays where it was.
 */

/** Padding of `.st-work` in studio.css; the stage never starts closer to the edge. */
const WORK_CSS_PADDING_PX = 40;

export interface AxisAnchorInput {
  /** Current scroll offset on this axis. */
  scroll: number;
  /** Visible size of the workbench on this axis. */
  viewport: number;
  /** Anchor position inside the viewport (0 is its start edge). */
  anchor: number;
  /** The stage's size on this axis at zoom 1. */
  base: number;
  oldZoom: number;
  newZoom: number;
  padding?: number;
}

/** Where the stage starts inside the scrollable content: centred while it fits. */
function stageOffset(size: number, viewport: number, padding: number): number {
  return Math.max(padding, (viewport - size) / 2);
}

/** The scroll offset that leaves the sheet point under `anchor` where it was. */
export function anchoredScrollAxis({
  scroll,
  viewport,
  anchor,
  base,
  oldZoom,
  newZoom,
  padding = WORK_CSS_PADDING_PX,
}: AxisAnchorInput): number {
  const oldSize = base * oldZoom;
  const newSize = base * newZoom;
  if (oldSize <= 0 || newSize <= 0) return 0;
  const oldOffset = stageOffset(oldSize, viewport, padding);
  const newOffset = stageOffset(newSize, viewport, padding);
  const fraction = (scroll + anchor - oldOffset) / oldSize;
  const content = Math.max(viewport, newSize + padding * 2);
  const wanted = newOffset + fraction * newSize - anchor;
  return Math.min(Math.max(0, content - viewport), Math.max(0, wanted));
}

export interface AnchorInput {
  scroll: { x: number; y: number };
  viewport: { width: number; height: number };
  /** Anchor in viewport coordinates, measured from the workbench's origin. */
  anchor: { x: number; y: number };
  /** The stage's size in px at zoom 1. */
  base: { width: number; height: number };
  oldZoom: number;
  newZoom: number;
  padding?: number;
}

export function anchoredScroll(input: AnchorInput): { x: number; y: number } {
  const { scroll, viewport, anchor, base, oldZoom, newZoom, padding } = input;
  return {
    x: anchoredScrollAxis({
      scroll: scroll.x,
      viewport: viewport.width,
      anchor: anchor.x,
      base: base.width,
      oldZoom,
      newZoom,
      padding,
    }),
    y: anchoredScrollAxis({
      scroll: scroll.y,
      viewport: viewport.height,
      anchor: anchor.y,
      base: base.height,
      oldZoom,
      newZoom,
      padding,
    }),
  };
}
