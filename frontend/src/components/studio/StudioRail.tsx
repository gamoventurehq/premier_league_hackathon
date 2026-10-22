'use client';

/**
 * The studio's left rail.
 *
 * The branch's `SidebarNav` was a 64px strip of Ionic icons that switched
 * tabs in place. The studio is a Next.js application with real routes, so
 * the rail is a set of links: the browser's back button, the middle click
 * and a right-click "open in new tab" all behave the way a user expects.
 *
 * The rail has three shapes:
 *  - a full rail with labels (wide screens),
 *  - an icon-only rail (mid screens),
 *  - a horizontal top row of icons (narrow screens).
 *
 * The label is always present in the accessibility tree (`sr-only` until
 * the wide breakpoint), so an icon-only rail still announces every
 * destination by name.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Radar,
  Shield,
  Swords,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';

interface RailItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const RAIL_ITEMS: RailItem[] = [
  {
    href: '/studio',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'The studio overview: score, form, and the live narrative.',
  },
  {
    href: '/studio/pitch',
    label: 'Live Pitch',
    icon: Radar,
    description: 'The live pitch radar and the spatial state of the match.',
  },
  {
    href: '/studio/tactical',
    label: 'Tactical',
    icon: Swords,
    description: 'Tactical reasoning: Pitch Control, lanes, and inflection points.',
  },
  {
    href: '/studio/personas',
    label: 'Personas',
    icon: Users,
    description: 'The same match explained to the Analyst, Casual, Player Cam, and Club audiences.',
  },
  {
    href: '/studio/diagnostics',
    label: 'Diagnostics',
    icon: Activity,
    description: 'Pipeline diagnostics: agent trace, latencies, and the match ledger.',
  },
];

/**
 * Is this item the one the user is on?
 *
 * The dashboard is only active on `/studio` itself — the deeper routes are
 * separate sections, not children of the dashboard.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/studio') return pathname === '/studio';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioRail() {
  const pathname = usePathname() ?? '/studio';

  return (
    <aside
      aria-label="Studio sections"
      className={cn(
        'flex shrink-0 flex-row items-center gap-1 overflow-x-auto border-line bg-surface/60',
        'border-b px-2 py-2 backdrop-blur-xl',
        'sm:sticky sm:top-0 sm:h-screen sm:w-16 sm:flex-col sm:items-stretch',
        'sm:gap-1 sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0 sm:border-r sm:px-2 sm:py-4',
        'lg:w-64 lg:px-3',
      )}
    >
      <Link
        href="/studio"
        title="Premier League Studio"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-accent',
          'transition-colors hover:bg-inset',
        )}
      >
        <Shield className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Premier League Studio home</span>
      </Link>

      <nav
        className="flex min-w-0 flex-1 items-center gap-1 sm:flex-col sm:items-stretch"
        aria-label="Studio"
      >
        {RAIL_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.description}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-9 w-9 shrink-0 items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium',
                'justify-center transition-colors focus-visible:outline-offset-2',
                // The rail carries its labels from `lg` up, so the target has
                // to grow with them: a fixed 36px box would let the label
                // spill out of its own button.
                'lg:w-full lg:justify-start lg:px-3',
                active
                  ? 'bg-accent-soft text-ink ring-1 ring-accent/40'
                  : 'text-ink-muted hover:bg-inset hover:text-ink',
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-accent"
                />
              ) : null}
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only whitespace-nowrap lg:not-sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
