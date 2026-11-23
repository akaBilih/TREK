import { afterEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '../../../tests/helpers/render';
import { StudioContentFilter } from './StudioContentFilter';
import type { JourneySource } from './StudioSidebar';

/** FE-STUDIO-FILTER-001 to FE-STUDIO-FILTER-002: the entry menu of a long journey. */

const source = {
  entries: Array.from({ length: 111 }, (_, i) => ({
    id: i + 1,
    title: `Entry ${i + 1}`,
    story: null,
    location: null,
    date: null,
    lat: null,
    lng: null,
    mood: null,
    weather: null,
    pros: [],
    cons: [],
    photoIds: [i + 1],
  })),
  photos: Array.from({ length: 111 }, (_, i) => ({ photoId: i + 1, entryIds: [i + 1] })),
} as unknown as JourneySource;

const t = (key: string) => key;

const mount = (filter: Parameters<typeof StudioContentFilter>[0]['filter']) =>
  render(
    <StudioContentFilter
      source={source}
      filter={filter}
      setFilter={() => {}}
      admitted={1}
      pageEntryId={null}
      t={t}
      locale="en"
    />
  );

describe('StudioContentFilter', () => {
  afterEach(() => {
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('FE-STUDIO-FILTER-001: opening the menu scrolls the entry in force into view', () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    mount({ kind: 'entry', id: 100 });
    fireEvent.click(screen.getByTitle('journey.studio.filterPhotos'));
    const active = screen.getByRole('menuitemradio', { checked: true });
    expect(active).toHaveTextContent('Entry 100');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(113);
  });

  it('FE-STUDIO-FILTER-002: opens without scrollIntoView (jsdom) and not at all while closed', () => {
    mount({ kind: 'all' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByTitle('journey.studio.filterPhotos'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
