import type { BookElement, BookSpread } from '@trek/shared'

import type { JourneySource } from './StudioSidebar'

/**
 * Which of the journey's pictures the content browser shows.
 *
 * `recent` holds ids rather than a flag on the photo: what just arrived is a
 * fact about this sitting, not about the picture, and the journey store has no
 * reason to remember it.
 */
export type PhotoFilter =
  | { kind: 'all' }
  | { kind: 'entry'; id: number }
  | { kind: 'loose' }
  /** The entries that have something on the page on the sheet; two or more, one is an `entry`. */
  | { kind: 'page'; ids: number[] }
  | { kind: 'recent'; photoIds: number[] }

type Photo = JourneySource['photos'][number]

/**
 * The pictures a filter admits, before anything is searched.
 *
 * Which entry a picture belongs to is read off the journal's own junction
 * rather than off its words, which is what lets "not in an entry" mean exactly
 * that. Pure, and out here rather than inside the panel, because these four
 * rules are the feature and a rendered component is an awkward place to prove
 * them right.
 */
export function photosFor(source: JourneySource, filter: PhotoFilter): Photo[] {
  switch (filter.kind) {
    case 'entry':
      return source.photos.filter(p => p.entryIds.includes(filter.id))
    case 'loose':
      return source.photos.filter(p => !p.entryIds.length)
    case 'page':
      return source.photos.filter(p => p.entryIds.some(id => filter.ids.includes(id)))
    case 'recent': {
      // In the order they were sent, which is the order they were chosen in,
      // not wherever the gallery sorted them.
      const byId = new Map(source.photos.map(p => [p.photoId, p] as const))
      return filter.photoIds.flatMap(id => {
        const photo = byId.get(id)
        return photo ? [photo] : []
      })
    }
    default:
      return source.photos
  }
}

/** The photo ids an element shows: its frame, a map's markers, the picture its letters are filled with. */
function shownPhotoIds(e: BookElement): number[] {
  if (e.kind === 'photo') return e.photoId == null ? [] : [e.photoId]
  if (e.kind === 'map') return e.points.flatMap(p => (p.photoId == null ? [] : [p.photoId]))
  if (e.kind === 'text' && e.fillPaint?.type === 'photo') return [e.fillPaint.photoId]
  return []
}

/** The entry id a text bound to an entry names outright. */
function namedEntryIds(e: BookElement): number[] {
  return e.kind === 'text' && e.binding?.entryId != null ? [e.binding.entryId] : []
}

/**
 * The journal entries the page on the sheet is made of, in journal order.
 *
 * Read off what is on the page rather than off the one entry the auto layout
 * remembered: a day with three stops is three entries, and a page made by hand
 * has none remembered at all. An entry counts when a text is bound to it, or
 * when a picture placed on the page belongs to it; the entry the page was laid
 * out from seeds the set. Parked elements are not on the page. Ids the journal
 * no longer has are dropped.
 */
export function entriesOnPage(
  spread: Pick<BookSpread, 'elements' | 'entryId'> | undefined,
  source: JourneySource,
): number[] {
  if (!spread) return []
  const found = new Set<number>()
  if (spread.entryId != null) found.add(spread.entryId)
  const owners = new Map(source.photos.map(p => [p.photoId, p.entryIds] as const))
  for (const e of spread.elements) {
    namedEntryIds(e).forEach(id => found.add(id))
    for (const photoId of shownPhotoIds(e)) (owners.get(photoId) ?? []).forEach(id => found.add(id))
    if (e.kind === 'text' && e.binding?.source === 'photo.caption' && e.binding.photoId != null) {
      (owners.get(e.binding.photoId) ?? []).forEach(id => found.add(id))
    }
  }
  return source.entries.filter(e => found.has(e.id)).map(e => e.id)
}

/** The filter that shows these entries: the entry itself for one, the union for several, none for none. */
export function pageFilterFor(ids: number[]): PhotoFilter | null {
  if (!ids.length) return null
  return ids.length === 1 ? { kind: 'entry', id: ids[0] } : { kind: 'page', ids }
}

/** Whether a filter already shows exactly this page's entries. */
export function isPageFilter(filter: PhotoFilter, ids: number[]): boolean {
  if (filter.kind === 'entry') return ids.length === 1 && ids[0] === filter.id
  if (filter.kind !== 'page') return false
  return filter.ids.length === ids.length && ids.every(id => filter.ids.includes(id))
}

/**
 * The words, over what the filter left.
 *
 * A photo matches on its own caption and on the entry it belongs to: most
 * photos carry no words at all, so matching only captions would make the
 * search box look broken on exactly the journeys that need it.
 */
export function matchingPhotos(photos: Photo[], source: JourneySource, query: string): Photo[] {
  const q = query.trim().toLowerCase()
  if (!q) return photos
  return photos.filter(p =>
    (p.caption && p.caption.toLowerCase().includes(q))
    || (source.photoEntries[p.photoId] || '').includes(q))
}

/** The entries the words admit, for the other tab. */
export function matchingEntries(source: JourneySource, query: string): JourneySource['entries'] {
  const q = query.trim().toLowerCase()
  if (!q) return source.entries
  return source.entries.filter(e =>
    [e.title, e.story, e.location, ...e.pros, ...e.cons]
      .some(v => v && v.toLowerCase().includes(q)))
}

/** The four answers, each named as `emptyKey` so the check of the client's translation keys can read it. */
const EMPTY = {
  none: { emptyKey: 'journey.studio.noPhotos' },
  unmatched: { emptyKey: 'journey.studio.noMatches' },
  entry: { emptyKey: 'journey.studio.noEntryPhotos' },
  loose: { emptyKey: 'journey.studio.noLoosePhotos' },
} as const

/**
 * Why the grid is empty, which is four different answers.
 *
 * "No photos" on a journey with three hundred of them, because the filter is
 * on a day that has none, reads as the pictures having gone.
 */
export function emptyKeyFor(source: JourneySource, filter: PhotoFilter, admitted: Photo[]): string {
  if (!source.photos.length) return EMPTY.none.emptyKey
  if (admitted.length) return EMPTY.unmatched.emptyKey
  if (filter.kind === 'entry') return EMPTY.entry.emptyKey
  if (filter.kind === 'loose') return EMPTY.loose.emptyKey
  return EMPTY.unmatched.emptyKey
}
