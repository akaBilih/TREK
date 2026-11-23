import type { BookDocument } from '@trek/shared';
import { bookPageSetupSchema } from '@trek/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { act, fireEvent, render } from '../../../tests/helpers/render';
import { useStudioStore } from '../../store/studioStore';
import { pageStepTarget, useStudioKeys } from './useStudioKeys';

/** FE-STUDIO-PAGENAV-004 to 009: PageUp and PageDown go to the previous and next page. */

const page = bookPageSetupSchema.parse({ preset: 'square-210', pageWidth: 210, pageHeight: 210, bleed: 3, safe: 5 });

function loadBook(spreads: number) {
  useStudioStore.getState().load({
    version: 1,
    title: 'Book',
    page,
    spreads: Array.from({ length: spreads }, (_, i) => ({
      id: `s${i}`,
      role: 'inner',
      background: null,
      elements: [],
      parked: [],
      entryId: null,
    })),
  } as BookDocument);
  useStudioStore.setState({ readOnly: false });
}

function Probe() {
  const index = useStudioStore((s) => s.activeSpread);
  useStudioKeys({ spreadIndex: index, editing: false });
  return (
    <>
      <input aria-label="field" />
      <span data-testid="at">{index}</span>
    </>
  );
}

const press = (key: string, target: Element | Document = document) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
};

describe('useStudioKeys page keys', () => {
  beforeEach(() => {
    loadBook(3);
    useStudioStore.getState().setActiveSpread(1);
  });

  it('FE-STUDIO-PAGENAV-004: PageDown and PageUp step through the pages and clear the selection', () => {
    const { getByTestId } = render(<Probe />);
    act(() => useStudioStore.getState().select(['x']));
    const down = press('PageDown');
    expect(down.defaultPrevented).toBe(true);
    expect(getByTestId('at').textContent).toBe('2');
    expect(useStudioStore.getState().selection).toEqual([]);
    press('PageUp');
    press('PageUp');
    expect(getByTestId('at').textContent).toBe('0');
  });

  it('FE-STUDIO-PAGENAV-005: stops at the last page and leaves the key to the browser', () => {
    const { getByTestId } = render(<Probe />);
    act(() => useStudioStore.getState().setActiveSpread(2));
    const ev = press('PageDown');
    expect(ev.defaultPrevented).toBe(false);
    expect(getByTestId('at').textContent).toBe('2');
  });

  it('FE-STUDIO-PAGENAV-006: stops at the first page', () => {
    const { getByTestId } = render(<Probe />);
    act(() => useStudioStore.getState().setActiveSpread(0));
    const ev = press('PageUp');
    expect(ev.defaultPrevented).toBe(false);
    expect(getByTestId('at').textContent).toBe('0');
  });

  it('FE-STUDIO-PAGENAV-007: is ignored while typing in a field', () => {
    const { getByLabelText, getByTestId } = render(<Probe />);
    const ev = press('PageDown', getByLabelText('field'));
    expect(ev.defaultPrevented).toBe(false);
    expect(getByTestId('at').textContent).toBe('1');
  });

  it('FE-STUDIO-PAGENAV-008: ignores the keys with a modifier', () => {
    const { getByTestId } = render(<Probe />);
    fireEvent.keyDown(document, { key: 'PageDown', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'PageDown', altKey: true });
    expect(getByTestId('at').textContent).toBe('1');
  });

  it('FE-STUDIO-PAGENAV-009: pageStepTarget answers null for other keys and out-of-range pages', () => {
    const key = (k: string) => new KeyboardEvent('keydown', { key: k });
    expect(pageStepTarget(key('PageDown'), 0, 2)).toBe(1);
    expect(pageStepTarget(key('PageDown'), 1, 2)).toBeNull();
    expect(pageStepTarget(key('PageUp'), 0, 2)).toBeNull();
    expect(pageStepTarget(key('ArrowRight'), 0, 2)).toBeNull();
  });
});
