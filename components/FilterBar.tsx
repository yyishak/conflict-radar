'use client';

import { CATEGORY_CONFIG, ALL_CATEGORIES, type EventCategory } from '@/lib/categories';

interface FilterBarProps {
  activeFilters: Set<EventCategory>;
  onToggle: (cat: EventCategory) => void;
  onSetAll: (cats: EventCategory[]) => void;
  counts: Record<EventCategory, number>;
}

export function FilterBar({ activeFilters, onToggle, onSetAll, counts }: FilterBarProps) {
  const allActive = ALL_CATEGORIES.every(c => activeFilters.has(c));
  const noneActive = activeFilters.size === 0;

  const totalActive = ALL_CATEGORIES.reduce((sum, c) => sum + (counts[c] ?? 0), 0);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-radar-border backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0" style={{ background: 'var(--radar-panel)' }}>
      {/* Label */}
      <div className="flex items-center gap-2 shrink-0 mr-1">
        <span className="w-1.5 h-1.5 rounded-full bg-radar-red animate-pulse" />
        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em]">Event Filter</span>
        <span className="text-[9px] text-gray-600 font-mono">|</span>
        <span className="text-[9px] text-gray-400 font-mono">{totalActive} events</span>
      </div>

      {/* ALL / NONE */}
      <button
        onClick={() => onSetAll(allActive ? [] : ALL_CATEGORIES)}
        className="shrink-0 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border transition-all duration-200"
        style={{
          borderColor: allActive ? 'var(--radar-border)' : 'var(--radar-border)',
          background: allActive ? 'var(--radar-red)' : 'transparent',
          color: allActive ? 'white' : 'var(--foreground)',
          opacity: allActive ? 1 : 0.5,
        }}
      >
        {allActive ? 'ALL ✓' : noneActive ? 'NONE' : 'ALL'}
      </button>

      <span className="text-[9px] text-radar-border shrink-0">|</span>

      {/* Category pills */}
      {ALL_CATEGORIES.map(id => {
        const cfg = CATEGORY_CONFIG[id];
        const active = activeFilters.has(id);
        const count = counts[id] ?? 0;

        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            title={cfg.desc}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95 select-none"
            style={{
              border: `1px solid ${active ? cfg.color : 'var(--radar-border)'}`,
              background: active ? cfg.bgColor : 'transparent',
              color: active ? cfg.color : 'var(--foreground)',
              opacity: active ? 1 : 0.55,
              boxShadow: active ? `0 0 8px ${cfg.color}30` : 'none',
            }}
          >
            {/* Icon */}
            <span className="text-[11px] leading-none">{cfg.icon}</span>

            {/* Label */}
            <span className="leading-none">{cfg.label}</span>

            {/* Count badge */}
            {count > 0 && (
              <span
                className="ml-0.5 px-1 py-0 rounded text-[8px] font-black leading-4 min-w-[14px] text-center"
                style={{
                  background: active ? cfg.color : 'var(--radar-border)',
                  color: active ? 'white' : 'var(--foreground)',
                }}
              >
                {count}
              </span>
            )}

            {/* Active indicator dot */}
            {active && (
              <span
                className="w-1 h-1 rounded-full shrink-0"
                style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}
              />
            )}
          </button>
        );
      })}

      {/* Divider + hint */}
      <span className="shrink-0 ml-auto text-[8px] text-gray-600 font-mono uppercase tracking-wider hidden lg:block whitespace-nowrap">
        Click to toggle · Scroll for more
      </span>
    </div>
  );
}
