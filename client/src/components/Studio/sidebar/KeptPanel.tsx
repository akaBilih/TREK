import { useLayoutEffect, useRef, type ReactNode, type UIEvent } from 'react';

/**
 * One section's body inside the side panel, kept mounted once visited so the
 * section keeps its own state (a tab, a search, a filter) while another is open.
 *
 * The wrapper adds no box of its own while shown (`display: contents`), so the
 * panel's flex layout reaches the section's root as before. Hidden, it is
 * `display: none`: nothing in it can take focus, and a browser drops the scroll
 * offset of what it hides, so the offsets are noted as they change and put back
 * when the section is shown again.
 */
export function KeptPanel({ active, children }: { active: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const offsets = useRef(new Map<Element, number>());

  const note = (e: UIEvent<HTMLDivElement>) => {
    if (active && e.target instanceof Element) offsets.current.set(e.target, e.target.scrollTop);
  };

  useLayoutEffect(() => {
    if (!active) return;
    for (const [el, top] of offsets.current) {
      if (!root.current?.contains(el)) offsets.current.delete(el);
      else el.scrollTop = top;
    }
  }, [active]);

  return (
    <div ref={root} hidden={!active} style={active ? { display: 'contents' } : undefined} onScrollCapture={note}>
      {children}
    </div>
  );
}
