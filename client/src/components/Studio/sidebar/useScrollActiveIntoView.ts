import { useEffect, useRef, type RefObject } from 'react';

const ACTIVE = '.st-thumb.is-active';

/** True when the whole of `el` lies inside `box`'s visible area. */
export function isWithin(el: Element, box: Element): boolean {
  const a = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  return a.top >= b.top && a.bottom <= b.bottom;
}

/** Whether the user asked the system for less motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
}

/**
 * Keeps the active page's thumbnail on screen in a scrolling list.
 *
 * It acts only when the panel mounts and when `activeIndex` changes, never on
 * a re-render, so it does not fight the user scrolling the list themselves.
 * On mount it moves only if the thumbnail is not already visible (the list may
 * come back with its scroll position restored) and does so at once; afterwards
 * it eases, unless the user prefers reduced motion. `block: 'nearest'` means a
 * thumbnail that is already visible does not move at all.
 *
 * Attach the returned ref to the scroll container that holds the thumbnails.
 */
export function useScrollActiveIntoView<T extends HTMLElement>(activeIndex: number): RefObject<T | null> {
  const box = useRef<T>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    const root = box.current;
    const el = root?.querySelector<HTMLElement>(ACTIVE);
    // jsdom has no scrollIntoView.
    if (!root || !el || typeof el.scrollIntoView !== 'function') return;
    if (first && isWithin(el, root)) return;
    el.scrollIntoView({ block: 'nearest', behavior: first || prefersReducedMotion() ? 'instant' : 'smooth' });
  }, [activeIndex]);

  return box;
}
