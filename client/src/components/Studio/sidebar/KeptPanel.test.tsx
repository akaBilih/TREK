import { normalizeBookDocument } from '@trek/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { fireEvent, render, screen } from '../../../../tests/helpers/render';
import { useStudioStore } from '../../../store/studioStore';
import { StudioSidebar, type JourneySource } from '../StudioSidebar';
import type { StudioUploader } from '../studioUpload';
import { RAIL_IDS } from './railSections';

/**
 * FE-STUDIO-KEPT-001 to FE-STUDIO-KEPT-003: a section keeps its state while
 * another is open: the page list its scroll, the content browser its tab and
 * search, and only the open section is reachable.
 */

const SOURCE: JourneySource = { entries: [], photos: [], photoEntries: {} };
const NO_UPLOAD: StudioUploader = async () => ({ photoIds: [], failed: 0, skippedVideos: 0 });

function draw() {
  const doc = useStudioStore.getState().doc;
  if (!doc) throw new Error('no book');
  return render(
    <StudioSidebar
      page={doc.page}
      pxPerMm={96 / 25.4}
      bookView={false}
      source={SOURCE}
      stats={null}
      path={[]}
      t={(k: string) => k}
      locale="en"
      canEdit
      onUpload={NO_UPLOAD}
      onToggleStop={async () => true}
    />
  );
}

const openTab = (id: 'pages' | 'content' | 'layers') =>
  fireEvent.click(document.getElementById(RAIL_IDS.tab(id)) as HTMLElement);

beforeEach(() => {
  useStudioStore.getState().load(
    normalizeBookDocument({
      version: 1,
      title: 'Lisbon',
      page: { preset: 'square-210', pageWidth: 210, pageHeight: 210, bleed: 3, safe: 5 },
      spreads: [{ id: 'sp1', role: 'inner', entryId: null, background: null, elements: [], parked: [] }],
    })
  );
});

describe('keeping a section while another is open', () => {
  it('FE-STUDIO-KEPT-001: puts the page list back where it was scrolled', () => {
    const { container } = draw();
    const list = container.querySelector('.st-panel-scroll') as HTMLElement;
    list.scrollTop = 220;
    fireEvent.scroll(list);

    openTab('content');
    // jsdom keeps the offset; a browser drops it with the box, as this does.
    list.scrollTop = 0;
    openTab('pages');

    expect(container.querySelector('.st-panel-scroll')).toBe(list);
    expect(list.scrollTop).toBe(220);
  });

  it('FE-STUDIO-KEPT-002: keeps the content browser tab and search', () => {
    draw();
    openTab('content');
    fireEvent.change(screen.getByLabelText('journey.studio.searchContent'), { target: { value: 'porto' } });
    fireEvent.click(screen.getByRole('tab', { name: /journey\.studio\.entries/ }));

    openTab('layers');
    openTab('content');

    expect((screen.getByLabelText('journey.studio.searchContent') as HTMLInputElement).value).toBe('porto');
    expect(screen.getByRole('tab', { name: /journey\.studio\.entries/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('FE-STUDIO-KEPT-003: hides a section that is not open and mounts one only once opened', () => {
    const { container } = draw();
    expect(screen.queryByLabelText('journey.studio.searchContent')).toBeNull();

    const list = container.querySelector('.st-panel-scroll') as HTMLElement;
    openTab('content');
    const pages = list.parentElement as HTMLElement;
    expect(pages.hidden).toBe(true);
    expect(screen.getAllByRole('tabpanel').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('aside[role="tabpanel"]')).toHaveLength(1);

    openTab('pages');
    expect(pages.hidden).toBe(false);
    expect(
      (screen.getByLabelText('journey.studio.searchContent').closest('[hidden]') as HTMLElement | null)?.hidden
    ).toBe(true);
  });
});
