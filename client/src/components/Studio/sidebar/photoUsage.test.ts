import { bookPageSetupSchema, normalizeBookDocument, type BookDocument } from '@trek/shared';
import { describe, expect, it } from 'vitest';

import { photoUsage, pageLabelOf } from './photoUsage';

const photo = (id: string, photoId: number | undefined, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'photo',
  frame: { x: 0, y: 0, w: 50, h: 50 },
  photoId,
  ...over,
});

const doc = (spreads: Record<string, unknown>[]): BookDocument =>
  normalizeBookDocument({
    version: 1,
    title: 'T',
    page: bookPageSetupSchema.parse({ preset: 'square-210', pageWidth: 210, pageHeight: 210, bleed: 3, safe: 5 }),
    spreads,
  });

const spread = (id: string, role: string, elements: unknown[] = [], parked: unknown[] = []) => ({
  id,
  role,
  background: null,
  elements,
  parked,
});

describe('photoUsage', () => {
  it('is empty without a book', () => {
    expect(photoUsage(null).size).toBe(0);
  });

  it('lists each picture with the spread and element it sits in, in book order', () => {
    const book = doc([
      spread('c', 'cover', [photo('a', 7)]),
      spread('s1', 'inner', [photo('b', 8), photo('c', 7)]),
      spread('s2', 'inner', [photo('d', 7)]),
    ]);
    const used = photoUsage(book);
    expect(used.get(7)).toEqual([
      { spreadIndex: 0, elementId: 'a' },
      { spreadIndex: 1, elementId: 'c' },
      { spreadIndex: 2, elementId: 'd' },
    ]);
    expect(used.get(8)).toEqual([{ spreadIndex: 1, elementId: 'b' }]);
    expect(used.has(9)).toBe(false);
  });

  it('counts a locked page background and a hidden picture', () => {
    const book = doc([spread('s1', 'inner', [photo('bg', 5, { locked: true }), photo('h', 6, { hidden: true })])]);
    const used = photoUsage(book);
    expect(used.get(5)).toHaveLength(1);
    expect(used.get(6)).toHaveLength(1);
  });

  it('ignores parked elements, empty frames and other kinds', () => {
    const book = doc([
      spread(
        's1',
        'inner',
        [photo('empty', undefined), { id: 't', kind: 'text', frame: { x: 0, y: 0, w: 10, h: 10 }, text: 'hi' }],
        [photo('p', 4)]
      ),
    ]);
    expect(photoUsage(book).size).toBe(0);
  });
});

describe('pageLabelOf', () => {
  const book = doc([spread('c', 'cover'), spread('s1', 'inner'), spread('s2', 'inner')]);

  it('names an inner spread by its printed pages', () => {
    expect(pageLabelOf(book, 1)).toBe(book.page.pageNumbers.startAt + ' – ' + (book.page.pageNumbers.startAt + 1));
  });

  it('falls back to the position for a cover, which has no folio', () => {
    expect(pageLabelOf(book, 0)).toBe('1');
  });
});
