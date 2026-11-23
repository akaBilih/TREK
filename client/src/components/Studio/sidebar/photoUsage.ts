import type { BookDocument } from '@trek/shared';

import { folioLabel, foliosOf } from '../bookSheets';

/** One place a picture sits in the book. */
export interface PhotoUse {
  spreadIndex: number;
  elementId: string;
}

/**
 * Where each picture is already placed, by photo id, in book order.
 *
 * Counts every photo element on a spread, a page background (a locked photo
 * element) included, and counts hidden ones: a hidden picture is still in the
 * book and would be printed once shown again. Parked elements are off the
 * page, so they do not count. Photos only fill photo elements here; a photo
 * held as a fill by a text or map element is not tracked.
 */
export function photoUsage(doc: BookDocument | null | undefined): Map<number, PhotoUse[]> {
  const used = new Map<number, PhotoUse[]>();
  doc?.spreads.forEach((spread, spreadIndex) => {
    for (const el of spread.elements) {
      if (el.kind !== 'photo' || el.photoId == null) continue;
      const list = used.get(el.photoId);
      const use = { spreadIndex, elementId: el.id };
      if (list) list.push(use);
      else used.set(el.photoId, [use]);
    }
  });
  return used;
}

/** The page number of a spread as the book prints it ("4", "2 – 3"); a cover has none, so its position in the book. */
export function pageLabelOf(doc: BookDocument, spreadIndex: number): string {
  return folioLabel(foliosOf(doc.spreads, spreadIndex, doc.page.pageNumbers.startAt)) || String(spreadIndex + 1);
}
