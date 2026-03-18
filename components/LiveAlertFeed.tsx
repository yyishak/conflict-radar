'use client';

import { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { CATEGORY_CONFIG, type EventCategory } from '@/lib/categories';

interface LiveAlertFeedProps {
  events: any[];
  layout?: 'sidebar' | 'mobile';
}

export function LiveAlertFeed({ events, layout = 'sidebar' }: LiveAlertFeedProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState<'all' | 'conflict' | 'political' | 'humanitarian'>('all');

  const allAlerts = events.slice(0, 50);

  const filtered =
    filter === 'all'
      ? allAlerts
      : allAlerts.filter((a) => {
          const cat = (a.category ?? '').toLowerCase();
          if (filter === 'conflict') return /conflict|war|military|armed/i.test(cat);
          if (filter === 'political') return /political|governance|election/i.test(cat);
          if (filter === 'humanitarian') return /humanitarian|disaster|health|food/i.test(cat);
          return true;
        });

  const cfg = (cat: EventCategory | string) =>
    CATEGORY_CONFIG[cat as EventCategory] ?? CATEGORY_CONFIG.General;

  const formatTime = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const rootClasses =
    layout === 'sidebar'
      ? 'w-96 border-r border-radar-border bg-radar-dark flex flex-col z-20 shrink-0'
      : 'w-full border-t border-radar-border bg-radar-dark flex flex-col z-20 shrink-0';

  return (
    <aside className={rootClasses}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-radar-border bg-radar-panel/40 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-radar-red flex items-center gap-2">
            <span className="w-2 h-2 bg-radar-red rounded-full animate-pulse" />
            Diagnostic Feed
          </h2>
          <span className="text-[9px] text-gray-500 font-mono">{filtered.length} signals</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(['all', 'conflict', 'political', 'humanitarian'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded transition-colors ${
                filter === f
                  ? 'bg-radar-red text-white'
                  : 'text-gray-500 hover:text-white bg-radar-panel/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest animate-pulse">
              Scanning frequencies...
            </p>
          </div>
        ) : (
          <div className="divide-y divide-radar-border/30">
            {filtered.map((alert, idx) => {
              const category: EventCategory = alert.category ?? 'General';
              const c = cfg(category);
              const isExpanded = expandedId === alert.id;
              const isBreaking = idx < 3;

              return (
                <div
                  key={alert.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : alert.id)}
                  className={`px-4 py-3.5 cursor-pointer transition-all group ${
                    isExpanded ? 'bg-radar-panel/60' : 'hover:bg-radar-panel/30'
                  }`}
                >
                  {/* Meta row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {isBreaking && (
                        <span className="text-[7px] font-black uppercase tracking-widest bg-radar-red text-white px-1.5 py-0.5">
                          BREAKING
                        </span>
                      )}
                      <span
                        className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ color: c.color, background: `${c.color}18` }}
                      >
                        <c.Icon className="w-2.5 h-2.5" />
                        {c.label}
                      </span>
                    </div>
                    <span className="text-[8px] text-gray-500 font-mono tabular-nums">
                      {formatTime(alert.created_at)}
                    </span>
                  </div>

                  {/* Headline */}
                  <p
                    className={`text-[13px] font-bold leading-snug transition-colors mb-1.5 ${
                      isExpanded ? '' : 'text-gray-200 group-hover:text-white'
                    }`}
                    style={isExpanded ? { color: c.color } : undefined}
                  >
                    {alert.description}
                  </p>

                  {/* Location + source */}
                  <div className="flex items-center gap-3">
                    {alert.location ? (
                      <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {alert.location}
                      </span>
                    ) : null}
                    {alert.source ? (
                      <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest ml-auto">
                        {alert.source}
                      </span>
                    ) : null}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="mt-3 pt-3 border-t space-y-2"
                      style={{ borderColor: `${c.color}25` }}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded" style={{ background: `${c.color}10` }}>
                          <p className="text-[7px] text-gray-500 uppercase font-bold mb-0.5">Source</p>
                          <p className="text-[10px] font-black uppercase" style={{ color: c.color }}>
                            {alert.source ?? '—'}
                          </p>
                        </div>
                        <div className="p-2 rounded" style={{ background: `${c.color}10` }}>
                          <p className="text-[7px] text-gray-500 uppercase font-bold mb-0.5">Risk Level</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-2.5 h-2 rounded-sm"
                                style={{
                                  background:
                                    i < (alert.risk_level ?? 1) ? c.color : `${c.color}25`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {alert.url ? (
                        <a
                          href={alert.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] font-mono uppercase tracking-widest hover:underline flex items-center gap-1"
                          style={{ color: c.color }}
                        >
                          Read full report <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
