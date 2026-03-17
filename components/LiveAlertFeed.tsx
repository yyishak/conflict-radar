'use client';

import { useState } from 'react';
import { CATEGORY_CONFIG, type EventCategory } from '@/lib/categories';

interface LiveAlertFeedProps {
  events: any[];
}

export function LiveAlertFeed({ events }: LiveAlertFeedProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  // Show latest 15
  const alerts = events.slice(0, 15);

  const cfg = (cat: EventCategory | string) =>
    CATEGORY_CONFIG[cat as EventCategory] ?? CATEGORY_CONFIG.General;

  return (
    <aside className="w-80 border-r border-radar-border bg-radar-dark flex flex-col z-20 shrink-0">
      <div className="p-4 border-b border-radar-border flex justify-between items-center bg-radar-panel/50">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-radar-red flex items-center gap-2">
          <span className="w-2 h-2 bg-radar-red rounded-full animate-pulse" />
          Diagnostic Feed
        </h2>
        <span className="text-[9px] text-gray-500 font-mono">{alerts.length} signals</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {alerts.length === 0 ? (
          <div className="text-[10px] text-gray-500 uppercase text-center mt-10 animate-pulse">
            Scanning frequencies...
          </div>
        ) : (
          alerts.map((alert) => {
            const category: EventCategory = alert.category ?? 'General';
            const c = cfg(category);
            const isExpanded = expandedId === alert.id;

            return (
              <div
                key={alert.id}
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                className="border-l-2 bg-radar-panel/30 p-3 relative group cursor-pointer hover:bg-radar-panel/50 transition-all overflow-hidden"
                style={{ borderColor: c.color }}
              >
                {/* Header row */}
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[9px] text-gray-500 font-mono uppercase tracking-tighter">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {alert.location ? ` · ${alert.location}` : ''}
                  </div>
                  {isExpanded && (
                    <span className="text-[8px] text-white px-1 font-bold" style={{ background: c.color }}>
                      ANALYSIS
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className={`text-sm leading-snug transition-all ${isExpanded ? 'text-white font-bold' : 'text-gray-300'}`}>
                  {alert.description}
                </p>

                {/* Expanded analysis */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-radar-border/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-radar-dark p-2 border border-radar-border/30">
                        <p className="text-[8px] text-gray-500 uppercase font-bold">Source</p>
                        <p className="text-[10px] font-black uppercase" style={{ color: c.color }}>
                          {alert.source}
                        </p>
                      </div>
                      <div className="bg-radar-dark p-2 border border-radar-border/30">
                        <p className="text-[8px] text-gray-500 uppercase font-bold">Risk Weight</p>
                        <p className="text-[10px] text-white font-black uppercase">{alert.risk_level}/5</p>
                      </div>
                    </div>
                    <div
                      className="p-2 border text-[11px] leading-relaxed italic"
                      style={{ background: `${c.color}10`, borderColor: `${c.color}30`, color: c.color }}
                    >
                      Intelligence confirms heightened activity in this sector.
                      Recommendation: Maintain Level 4 situational awareness.
                    </div>
                  </div>
                )}

                {/* Category chip */}
                {!isExpanded && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px]">{c.icon}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase"
                      style={{ color: c.color, borderColor: `${c.color}40`, background: c.bgColor }}
                    >
                      {c.label}
                    </span>
                    {alert.source && (
                      <span className="text-[8px] text-gray-600 font-mono uppercase ml-auto">
                        {alert.source}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
