import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useTranslation } from '../../i18n';
import { useStudioStore } from '../../store/studioStore';

/**
 * The previous and next page buttons of the zoom bar. They stop at the first
 * and last page; PageUp and PageDown do the same from the keyboard
 * (useStudioKeys.ts), so the tooltips name them.
 */
export function StudioPageStepper() {
  const index = useStudioStore((s) => s.activeSpread);
  const count = useStudioStore((s) => s.doc?.spreads.length ?? 0);
  const onGo = useStudioStore((s) => s.setActiveSpread);
  const { t } = useTranslation();
  const prev = t('journey.studio.prevPage');
  const next = t('journey.studio.nextPage');
  return (
    <>
      <button
        type="button"
        onClick={() => onGo(index - 1)}
        disabled={index <= 0}
        aria-label={prev}
        title={`${prev} (PageUp)`}
      >
        <ChevronLeft size={15} className="rtl:rotate-180" />
      </button>
      <button
        type="button"
        onClick={() => onGo(index + 1)}
        disabled={index >= count - 1}
        aria-label={next}
        title={`${next} (PageDown)`}
      >
        <ChevronRight size={15} className="rtl:rotate-180" />
      </button>
      <span className="st-zoom-sep" />
    </>
  );
}
