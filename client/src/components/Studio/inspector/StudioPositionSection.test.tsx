import type { BookDocument, BookElement } from '@trek/shared';
import { bookPageSetupSchema, bookShapeElementSchema } from '@trek/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '../../../../tests/helpers/render';
import { useStudioStore } from '../../../store/studioStore';
import { StudioInspector } from '../StudioInspector';

/**
 * FE-STUDIO-POSITION-001 to FE-STUDIO-POSITION-004: the ratio lock beside the
 * width and height, which is off until asked for, makes each side follow the
 * other at the frame's proportions, and is not offered for several elements.
 */

const page = bookPageSetupSchema.parse({ preset: 'square-210', pageWidth: 210, pageHeight: 210, bleed: 3, safe: 5 });
const shape = (id: string, frame = { x: 20, y: 30, w: 60, h: 30 }) =>
  bookShapeElementSchema.parse({ id, kind: 'shape', frame }) as BookElement;

function load(elements: BookElement[], selection: string[]) {
  useStudioStore.getState().load({
    version: 1,
    title: 'T',
    page,
    spreads: [{ id: 'sp1', role: 'inner', background: null, elements, parked: [], entryId: null }],
  } as BookDocument);
  useStudioStore.getState().select(selection);
}

function draw() {
  return render(
    <StudioInspector
      spreadIndex={0}
      page={page}
      stats={null}
      path={[]}
      source={{ entries: [], photos: [], photoEntries: {} }}
      setPageNumbers={() => {}}
      t={(k: string) => k}
      locale="en"
      onOpenPanel={vi.fn()}
    />
  );
}

const frameOf = (id: string) => useStudioStore.getState().doc?.spreads[0]?.elements.find((e) => e.id === id)?.frame;

function openPosition() {
  const head = [...document.querySelectorAll('.st-section-head')].find(
    (h) => h.querySelector('.st-section-label')?.textContent === 'journey.studio.position'
  );
  if (head && head.getAttribute('aria-expanded') !== 'true') fireEvent.click(head);
}

function type(label: string, value: string) {
  const field = screen.getByRole('spinbutton', { name: (n) => n.startsWith(label) });
  fireEvent.change(field, { target: { value } });
  fireEvent.blur(field);
}

beforeEach(() => {
  useStudioStore.getState().load({ version: 1, title: 'T', page, spreads: [] } as unknown as BookDocument);
});

describe('the ratio lock', () => {
  it('FE-STUDIO-POSITION-001: leaves width and height independent by default', () => {
    load([shape('s1')], ['s1']);
    draw();
    openPosition();
    type('journey.studio.width', '90');
    expect(frameOf('s1')).toEqual({ x: 20, y: 30, w: 90, h: 30 });
    expect(screen.getByRole('button', { name: 'journey.studio.lockRatio' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('FE-STUDIO-POSITION-002: sets the height from the width, and the width from the height, when on', () => {
    load([shape('s1')], ['s1']);
    draw();
    openPosition();
    fireEvent.click(screen.getByRole('button', { name: 'journey.studio.lockRatio' }));
    type('journey.studio.width', '90');
    expect(frameOf('s1')).toEqual({ x: 20, y: 30, w: 90, h: 45 });
    type('journey.studio.height', '15');
    expect(frameOf('s1')).toEqual({ x: 20, y: 30, w: 30, h: 15 });
  });

  it('FE-STUDIO-POSITION-003: holds the minimum on the side that follows', () => {
    load([shape('s1', { x: 0, y: 0, w: 100, h: 10 })], ['s1']);
    draw();
    openPosition();
    fireEvent.click(screen.getByRole('button', { name: 'journey.studio.lockRatio' }));
    type('journey.studio.width', '20');
    expect(frameOf('s1')).toEqual({ x: 0, y: 0, w: 20, h: 4 });
  });

  it('FE-STUDIO-POSITION-004: offers no lock for several elements', () => {
    load([shape('s1'), shape('s2')], ['s1', 's2']);
    draw();
    openPosition();
    expect(screen.queryByRole('button', { name: 'journey.studio.lockRatio' })).toBeNull();
  });
});
