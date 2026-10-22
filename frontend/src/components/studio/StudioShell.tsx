'use client';

/**
 * The studio shell: the frame the whole product sits in.
 *
 * Three regions — the rail on the left, the top bar across the top, and
 * the content region that the pages render into. The frame is a flex
 * layout, not a fixed grid, so it behaves from a 360px phone to a 2560px
 * wall display:
 *
 *   - below `sm`, the rail becomes a horizontal strip of icons across the
 *     top of the screen, because a 64px column beside a 360px viewport
 *     leaves nothing for the content;
 *   - between `sm` and `lg`, the rail is a 64px column of icons;
 *   - from `lg`, the rail carries its labels.
 *
 * The shell deliberately does NOT lock page scroll. The branch's Ionic
 * shell did (`body { position: fixed; overflow: hidden }`), which made the
 * whole studio a scroll island inside a fixed frame. Here the document
 * scrolls normally and the rail and the top bar are simply sticky.
 */

import { useEffect } from 'react';

import { useStudioStore } from '../../store/studio-store';
import { StudioRail } from './StudioRail';
import { StudioTopBar } from './StudioTopBar';

export function StudioShell({ children }: { children: React.ReactNode }) {
  const language = useStudioStore((s) => s.language);
  const isRtl = language === 'ar';

  // The Arabic broadcast is written right to left, so the whole document
  // direction has to follow the selected language — not just the panel
  // that happens to hold Arabic copy. The studio owns this because it is
  // the studio that offers the language switch.
  useEffect(() => {
    const root = document.documentElement;
    root.dir = isRtl ? 'rtl' : 'ltr';
    return () => {
      root.dir = 'ltr';
    };
  }, [isRtl]);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex min-h-screen flex-col bg-pitch-black text-ink sm:flex-row"
    >
      <StudioRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudioTopBar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
