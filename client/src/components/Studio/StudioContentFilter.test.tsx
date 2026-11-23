import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '../../../tests/helpers/render';
import type { PhotoFilter } from './photoFilter';
import { StudioContentFilter } from './StudioContentFilter';
import type { JourneySource } from './StudioSidebar';

/**
 * FE-STUDIO-CONTENTFILTER-001 to FE-STUDIO-CONTENTFILTER-005: the "This page"
 * chip, offered from the entries the page is made of.
 */

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
const SOURCE: JourneySource = {
  entries: [entry(1, []), entry(2, [20]), entry(3, [30])],
  photos: [
    { photoId: 20, entryIds: [2] },
    { photoId: 30, entryIds: [3] },
  ],
  photoEntries: {},
};
const t = (k: string) => k;

function draw(pageEntryIds: number[], filter: PhotoFilter = { kind: 'all' }) {
  const setFilter = vi.fn();
  render(
    <StudioContentFilter
      source={SOURCE}
      filter={filter}
      setFilter={setFilter}
      admitted={2}
      pageEntryIds={pageEntryIds}
      t={t}
      locale="en"
    />
  );
  return setFilter;
}

describe('StudioContentFilter this-page chip', () => {
  it('FE-STUDIO-CONTENTFILTER-001: several entries with photos give a page filter over all of them', () => {
    const setFilter = draw([1, 2, 3]);
    fireEvent.click(screen.getByText('journey.studio.filterThisPage'));
    expect(setFilter).toHaveBeenCalledWith({ kind: 'page', ids: [2, 3] });
  });

  it('FE-STUDIO-CONTENTFILTER-002: the first entry having no photos does not hide the chip; one entry stays an entry filter', () => {
    const setFilter = draw([1, 3]);
    fireEvent.click(screen.getByText('journey.studio.filterThisPage'));
    expect(setFilter).toHaveBeenCalledWith({ kind: 'entry', id: 3 });
  });

  it('FE-STUDIO-CONTENTFILTER-003: no chip for an empty page or entries without photos', () => {
    draw([]);
    expect(screen.queryByText('journey.studio.filterThisPage')).toBeNull();
  });

  it('FE-STUDIO-CONTENTFILTER-004: no chip when entries have no photos at all', () => {
    draw([1]);
    expect(screen.queryByText('journey.studio.filterThisPage')).toBeNull();
  });

  it('FE-STUDIO-CONTENTFILTER-005: no chip once the filter is on exactly the page set; the filter is labelled', () => {
    draw([2, 3], { kind: 'page', ids: [3, 2] });
    // Only the filter's own label remains, not a second chip.
    expect(screen.getAllByText('journey.studio.filterThisPage')).toHaveLength(1);
  });
});
