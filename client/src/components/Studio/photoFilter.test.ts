import { bookMapElementSchema, bookPhotoElementSchema, bookTextElementSchema, type BookElement } from '@trek/shared';
import { describe, expect, it } from 'vitest';

import { entriesOnPage, isPageFilter, pageFilterFor, photosFor } from './photoFilter';
import type { JourneySource } from './StudioSidebar';

/**
 * FE-STUDIO-PHOTOFILTER-001 to FE-STUDIO-PHOTOFILTER-012: which entries a page
 * is made of, and the pictures the "This page" filter admits for them.
 */

const FRAME = { x: 10, y: 10, w: 80, h: 60 };
const entry = (id: number, photoIds: number[]): JourneySource['entries'][number] => ({
  id,
  title: `Entry ${id}`,
  story: null,
  location: null,
  date: null,
  lat: null,
  lng: null,
  mood: null,
  weather: null,
  pros: [],
  cons: [],
  photoIds,
});

// A day with three stops (1: no photos, 2: photos 20+21, 3: photo 30), plus a loose picture 40.
const SOURCE: JourneySource = {
  entries: [entry(1, []), entry(2, [20, 21]), entry(3, [30]), entry(4, [])],
  photos: [
    { photoId: 20, entryIds: [2] },
    { photoId: 21, entryIds: [2] },
    { photoId: 30, entryIds: [3] },
    { photoId: 40, entryIds: [] },
    { photoId: 50, entryIds: [2, 3] },
  ],
  photoEntries: {},
};

const photo = (id: string, photoId: number | null): BookElement =>
  bookPhotoElementSchema.parse({ id, kind: 'photo', frame: FRAME, photoId });
const text = (id: string, binding?: { source: string; entryId?: number; photoId?: number }): BookElement =>
  bookTextElementSchema.parse({ id, kind: 'text', frame: FRAME, text: 'x', binding });
const map = (id: string, points: { photoId?: number }[]): BookElement =>
  bookMapElementSchema.parse({
    id,
    kind: 'map',
    frame: FRAME,
    points: points.map((p, i) => ({ label: `P${i}`, lat: 1, lng: 2, country: 'PT', photoId: null, ...p })),
  });

describe('entriesOnPage', () => {
  it('FE-STUDIO-PHOTOFILTER-001: reads every entry a multi-entry day page names', () => {
    const spread = {
      entryId: 1,
      elements: [
        text('a', { source: 'entry.title', entryId: 1 }),
        text('b', { source: 'entry.story', entryId: 2 }),
        text('c', { source: 'entry.title', entryId: 3 }),
      ],
    };
    expect(entriesOnPage(spread, SOURCE)).toEqual([1, 2, 3]);
  });

  it('FE-STUDIO-PHOTOFILTER-002: a hand-made page with only placed photos resolves through their entries', () => {
    const spread = { entryId: null, elements: [photo('p1', 30), photo('p2', 20)] };
    expect(entriesOnPage(spread, SOURCE)).toEqual([2, 3]);
  });

  it('FE-STUDIO-PHOTOFILTER-003: a photo that sits in two entries counts for both', () => {
    expect(entriesOnPage({ entryId: null, elements: [photo('p', 50)] }, SOURCE)).toEqual([2, 3]);
  });

  it('FE-STUDIO-PHOTOFILTER-004: the first entry having no photos does not hide the others', () => {
    const spread = { entryId: 1, elements: [text('b', { source: 'entry.title', entryId: 2 })] };
    expect(entriesOnPage(spread, SOURCE)).toEqual([1, 2]);
    expect(pageFilterFor([1, 2].filter((id) => id === 2))).toEqual({ kind: 'entry', id: 2 });
  });

  it('FE-STUDIO-PHOTOFILTER-005: an empty page, a missing page and a loose photo resolve to nothing', () => {
    expect(entriesOnPage({ entryId: null, elements: [] }, SOURCE)).toEqual([]);
    expect(entriesOnPage(undefined, SOURCE)).toEqual([]);
    expect(
      entriesOnPage({ entryId: null, elements: [photo('p', 40), photo('q', null), photo('r', 999)] }, SOURCE)
    ).toEqual([]);
  });

  it('FE-STUDIO-PHOTOFILTER-006: the entry the page was laid out from is the fallback', () => {
    expect(entriesOnPage({ entryId: 3, elements: [] }, SOURCE)).toEqual([3]);
    // An entry the journal no longer has is dropped.
    expect(entriesOnPage({ entryId: 99, elements: [] }, SOURCE)).toEqual([]);
  });

  it('FE-STUDIO-PHOTOFILTER-007: map marker photos, caption bindings and photo-filled text count, in journal order', () => {
    const filled = bookTextElementSchema.parse({
      id: 'f',
      kind: 'text',
      frame: FRAME,
      text: 'x',
      fillPaint: { type: 'photo', photoId: 30 },
    });
    const spread = {
      entryId: null,
      elements: [
        map('m', [{}, { photoId: 20 }]),
        text('cap', { source: 'photo.caption', photoId: 30 }),
        filled,
        text('j', { source: 'journey.title' }),
      ],
    };
    expect(entriesOnPage(spread, SOURCE)).toEqual([2, 3]);
  });
});

describe('the page filter', () => {
  it('FE-STUDIO-PHOTOFILTER-008: shows the union of the entries photos, in gallery order', () => {
    const got = photosFor(SOURCE, { kind: 'page', ids: [3, 2] }).map((p) => p.photoId);
    expect(got).toEqual([20, 21, 30, 50]);
  });

  it('FE-STUDIO-PHOTOFILTER-009: no ids admits nothing', () => {
    expect(photosFor(SOURCE, { kind: 'page', ids: [] })).toEqual([]);
  });

  it('FE-STUDIO-PHOTOFILTER-010: one entry is an entry filter, several a page filter, none no filter', () => {
    expect(pageFilterFor([])).toBeNull();
    expect(pageFilterFor([2])).toEqual({ kind: 'entry', id: 2 });
    expect(pageFilterFor([2, 3])).toEqual({ kind: 'page', ids: [2, 3] });
  });

  it('FE-STUDIO-PHOTOFILTER-011: knows when it is already on exactly the page set', () => {
    expect(isPageFilter({ kind: 'entry', id: 2 }, [2])).toBe(true);
    expect(isPageFilter({ kind: 'entry', id: 2 }, [2, 3])).toBe(false);
    expect(isPageFilter({ kind: 'page', ids: [3, 2] }, [2, 3])).toBe(true);
    expect(isPageFilter({ kind: 'page', ids: [2] }, [2, 3])).toBe(false);
    expect(isPageFilter({ kind: 'all' }, [2, 3])).toBe(false);
  });
});
