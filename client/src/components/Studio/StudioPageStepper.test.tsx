import type { BookDocument } from '@trek/shared';
import { bookPageSetupSchema } from '@trek/shared';
import { describe, expect, it } from 'vitest';

import { fireEvent, render, screen } from '../../../tests/helpers/render';
import { useStudioStore } from '../../store/studioStore';
import { StudioPageStepper } from './StudioPageStepper';

const page = bookPageSetupSchema.parse({ preset: 'square-210', pageWidth: 210, pageHeight: 210, bleed: 3, safe: 5 });

/** A book of `count` pages, open on page `at`. */
function open(count: number, at: number) {
  useStudioStore.getState().load({
    version: 1,
    title: 'T',
    page,
    spreads: Array.from({ length: count }, (_, i) => ({
      id: `s${i}`,
      role: 'inner',
      background: null,
      elements: [],
      parked: [],
      entryId: null,
    })),
  } as BookDocument);
  useStudioStore.getState().setActiveSpread(at);
}

/** FE-STUDIO-PAGENAV-001 to 003: the zoom bar's previous and next page buttons. */
describe('StudioPageStepper', () => {
  it('FE-STUDIO-PAGENAV-001: goes one page back and one forward from the middle', () => {
    open(5, 2);
    render(<StudioPageStepper />);
    const prev = screen.getByRole('button', { name: /previous page/i });
    const next = screen.getByRole('button', { name: /next page/i });
    expect(prev).toHaveAttribute('title', expect.stringContaining('PageUp'));
    expect(next).toHaveAttribute('title', expect.stringContaining('PageDown'));
    fireEvent.click(next);
    expect(useStudioStore.getState().activeSpread).toBe(3);
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(useStudioStore.getState().activeSpread).toBe(1);
  });

  it('FE-STUDIO-PAGENAV-002: previous is disabled on the first page', () => {
    open(3, 0);
    render(<StudioPageStepper />);
    const prev = screen.getByRole('button', { name: /previous page/i });
    expect(prev).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled();
    fireEvent.click(prev);
    expect(useStudioStore.getState().activeSpread).toBe(0);
  });

  it('FE-STUDIO-PAGENAV-003: next is disabled on the last page', () => {
    open(3, 2);
    render(<StudioPageStepper />);
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled();
  });
});
