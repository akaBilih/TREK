import { Layers } from 'lucide-react';
import { useState } from 'react';

import { useStudioStore } from '../../../store/studioStore';
import { photoSrc } from '../bookRender';
import type { StudioT } from '../StudioSidebar';
import type { PhotoUse } from './photoUsage';

/**
 * One picture of the content grid: the button that adds it, and, when the
 * book already holds it, a sibling badge that goes to where it sits.
 *
 * Two buttons side by side rather than one inside the other, which is not
 * valid HTML and would make the thumbnail's drag and the badge's click fight.
 */
export function StudioPhotoCell({
  photoId,
  caption,
  uses,
  pageLabel,
  onAdd,
  t,
}: {
  photoId: number;
  caption: string | null;
  uses: readonly PhotoUse[];
  /** The page the first use is on, for the badge's words when there is only one. */
  pageLabel: string;
  onAdd: () => void;
  t: StudioT;
}) {
  const setActiveSpread = useStudioStore((s) => s.setActiveSpread);
  const select = useStudioStore((s) => s.select);
  // Which of several places the next press goes to.
  const [next, setNext] = useState(0);

  const jump = () => {
    const use = uses[next % uses.length];
    if (!use) return;
    // The spread first: changing it clears the selection.
    setActiveSpread(use.spreadIndex);
    select([use.elementId]);
    setNext((next + 1) % uses.length);
  };

  const used =
    uses.length === 1
      ? t('journey.studio.photoUsedOn', { page: pageLabel })
      : t('journey.studio.photoUsed', { count: uses.length });
  const jumpLabel = `${used}. ${t('journey.studio.photoGoTo')}`;

  return (
    <div className="st-photo-item">
      <button
        type="button"
        className="st-photo-cell"
        onClick={onAdd}
        title={t('journey.studio.addToPage')}
        aria-label={caption ? `${t('journey.studio.addToPage')}: ${caption}` : t('journey.studio.addToPage')}
        draggable
        onDragStart={(e) => {
          // HTML5 drag is the right tool for one item from a list onto a target, and it gives
          // the thumbnail as the drag image for free; the canvas uses pointer events instead.
          e.dataTransfer.setData('application/x-trek-photo', String(photoId));
          e.dataTransfer.effectAllowed = 'copy';
        }}
      >
        <img src={photoSrc(photoId, false)} alt="" loading="lazy" draggable={false} />
      </button>
      {uses.length > 0 && (
        <button type="button" className="st-photo-used" onClick={jump} title={jumpLabel} aria-label={jumpLabel}>
          <Layers size={11} strokeWidth={2} aria-hidden />
          {uses.length > 1 && <span>{uses.length}</span>}
        </button>
      )}
    </div>
  );
}
