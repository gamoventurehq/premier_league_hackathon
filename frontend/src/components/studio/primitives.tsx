'use client';

/**
 * The studio's shared primitives.
 *
 * Every card in the studio is built from these, so the whole product reads
 * as one system rather than a dozen one-offs. Two rules hold everywhere:
 *
 *  - Colour comes from the token classes (`text-ink`, `border-line`,
 *    `bg-surface`, `text-accent`), never from a literal hex value. The
 *    tokens are defined in `app/globals.css` and are theme aware.
 *  - No inline style objects. Layout is Tailwind; the only inline style
 *    permitted is a numeric geometry value that cannot be known ahead of
 *    time (a bar's width, a player's pitch coordinate).
 */

import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-line bg-surface/70 backdrop-blur-xl',
        'shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  kicker,
  actions,
  className,
}: {
  title: string;
  kicker?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-4 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        {kicker ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            {kicker}
          </p>
        ) : null}
        <h2 className="mt-1 truncate text-[15px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Labels and values                                                   */
/* ------------------------------------------------------------------ */

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: 'default' | 'home' | 'away' | 'accent';
  className?: string;
}) {
  const valueTone = {
    default: 'text-ink',
    home: 'text-home',
    away: 'text-away',
    accent: 'text-accent',
  }[tone];

  return (
    <div className={cn('min-w-0', className)}>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            'font-semibold tabular-nums tracking-tight text-[22px] leading-none',
            valueTone,
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-[11px] font-medium text-ink-muted">{unit}</span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-1 truncate text-[11px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'home' | 'away' | 'accent';
}) {
  const toneClass = {
    default: 'text-ink',
    home: 'text-home',
    away: 'text-away',
    accent: 'text-accent',
  }[tone ?? 'default'];

  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className={cn('text-[13px] font-medium tabular-nums', toneClass)}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meters                                                              */
/* ------------------------------------------------------------------ */

export function MeterTrack({
  value,
  max = 100,
  tone = 'accent',
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'home' | 'away' | 'positive' | 'caution';
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = {
    accent: 'bg-accent',
    home: 'bg-home',
    away: 'bg-away',
    positive: 'bg-positive',
    caution: 'bg-caution',
  }[tone];

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-inset', className)}
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StatMeter({
  label,
  value,
  max = 100,
  unit,
  tone = 'accent',
  className,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  tone?: 'accent' | 'home' | 'away' | 'positive' | 'caution';
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <span className="text-[12px] font-semibold tabular-nums text-ink">
          {Math.round(value)}
          {unit ? <span className="ml-0.5 text-ink-muted">{unit}</span> : null}
        </span>
      </div>
      <MeterTrack value={value} max={max} tone={tone} className="mt-2" label={label} />
    </div>
  );
}

/**
 * A two-sided bar. The home share grows from the left, the away share
 * from the right, and the two meet in the middle.
 */
export function SplitBar({
  home,
  away,
  className,
  label,
}: {
  home: number;
  away: number;
  className?: string;
  label?: string;
}) {
  const total = Math.max(1, home + away);
  const homePct = (home / total) * 100;
  return (
    <div
      className={cn('flex h-1.5 w-full overflow-hidden rounded-full bg-inset', className)}
      role="img"
      aria-label={label ?? `Home ${Math.round(homePct)} percent, away ${Math.round(100 - homePct)} percent`}
    >
      <div className="h-full bg-home transition-[width] duration-500" style={{ width: `${homePct}%` }} />
      <div className="h-full flex-1 bg-away transition-[width] duration-500" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chips, crests, controls                                             */
/* ------------------------------------------------------------------ */

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'home' | 'away' | 'positive' | 'caution';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line text-ink-muted bg-inset',
    accent: 'border-accent/40 text-accent bg-accent-soft',
    home: 'border-home/40 text-home bg-home/10',
    away: 'border-away/40 text-away bg-away/10',
    positive: 'border-positive/40 text-positive bg-positive/10',
    caution: 'border-caution/40 text-caution bg-caution/10',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]',
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A club mark. The studio never uses a real club crest — the fixture is
 * synthetic — so this is a monogram on the team's colour.
 */
export function TeamCrest({
  label,
  tone,
  className,
}: {
  label: string;
  tone: 'home' | 'away';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold tracking-tight',
        tone === 'home'
          ? 'bg-home/15 text-home ring-1 ring-home/30'
          : 'bg-away/15 text-away ring-1 ring-away/30',
        className,
      )}
    >
      {label.slice(0, 3)}
    </span>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** A longer description, used as the accessible name. */
  description?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-full border border-line bg-inset p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
              active
                ? 'bg-accent text-white'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * An icon-only control. `label` is mandatory: an icon button with no
 * accessible name is unusable with a screen reader.
 */
export function IconButton({
  label,
  onClick,
  children,
  className,
  pressed,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted',
        'transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40',
        pressed && 'border-accent/50 bg-accent-soft text-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-xs text-[12px] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pitch drawing helpers                                               */
/* ------------------------------------------------------------------ */

/**
 * A player dot on the pitch. The position is the only thing that varies,
 * so it is the only thing that is an inline style.
 */
export function PitchNode({
  x,
  y,
  tone,
  size = 10,
  label,
  onSelect,
  selected,
}: {
  x: number;
  y: number;
  tone: 'home' | 'away' | 'ball';
  size?: number;
  label?: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const fills = {
    home: 'bg-home',
    away: 'bg-away',
    ball: 'bg-white',
  }[tone];

  const node = (
    <span
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/40',
        fills,
        selected && 'ring-2 ring-white',
      )}
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
    />
  );

  if (!onSelect) return node;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onSelect}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {node}
    </button>
  );
}
