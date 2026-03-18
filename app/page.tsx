'use client';

import dynamic from 'next/dynamic';
import { TopNav } from '@/components/TopNav';
import { LiveAlertFeed } from '@/components/LiveAlertFeed';
import { EconomicSidebar } from '@/components/EconomicSidebar';
import { RegionalRisk } from '@/components/RegionalRisk';
import { SmartDigest } from '@/components/SmartDigest';
import { EventDetailModal } from '@/components/EventDetailModal';
import { FilterBar } from '@/components/FilterBar';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { classifyEvent, ALL_CATEGORIES, type EventCategory } from '@/lib/categories';
import { resolveCoords } from '@/lib/ethiopia-coords';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#020407] flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
      Initialising Global Visualizer...
    </div>
  ),
});

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewPreset, setViewPreset] = useState<'ethiopia' | 'horn' | 'global'>('ethiopia');
  const [liteMode, setLiteMode] = useState(false);

  const [activeFilters, setActiveFilters] = useState<Set<EventCategory>>(
    new Set(ALL_CATEGORIES),
  );

  const toggleFilter = useCallback((cat: EventCategory) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const setAllFilters = useCallback((cats: EventCategory[]) => {
    setActiveFilters(new Set(cats));
  }, []);

  const enrichEvent = (ev: any) => {
    // Use stored coords if available, otherwise resolve from location text
    const hasCoords = ev.latitude && ev.longitude;
    const fallback  = hasCoords ? null : resolveCoords(ev.location);
    return {
      ...ev,
      latitude:      hasCoords ? ev.latitude  : (fallback?.lat ?? null),
      longitude:     hasCoords ? ev.longitude : (fallback?.lng ?? null),
      current_score: (ev.risk_level ?? 1) * 2,
      category:      classifyEvent(ev.type, ev.source),
      text:          ev.description?.substring(0, 30) || 'Intelligence Pulse',
    };
  };

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (data && !error) setEvents(data.map(enrichEvent));
    };
    fetchEvents();

    const channel = supabase
      .channel('live_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => {
        setEvents(prev => [enrichEvent(payload.new), ...prev].slice(0, 200));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(ALL_CATEGORIES.map(c => [c, 0])) as Record<EventCategory, number>;
    events.forEach(ev => { counts[ev.category as EventCategory] = (counts[ev.category as EventCategory] ?? 0) + 1; });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(
    () => events.filter(ev => activeFilters.has(ev.category as EventCategory)),
    [events, activeFilters],
  );

  // All filtered events go to the globe — no artificial cap
  const globeEvents = useMemo(() => filteredEvents, [filteredEvents]);

  return (
    <main className="flex flex-col h-screen font-sans selection:bg-radar-red selection:text-white">
      <TopNav />

      {/* ── Desktop layout: Feed | Globe | Economic ──────────────────────── */}
      <div className="flex-1 overflow-hidden hidden md:flex">

        {/* Left: Diagnostic Feed */}
        <LiveAlertFeed events={filteredEvents} layout="sidebar" />

        {/* Centre: Globe + news — scrollable column */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-radar-dark no-scrollbar">

          {/* Globe — fixed height so news is reachable by scrolling */}
          <section className="h-[480px] relative shrink-0 bg-[#020407]">
            <div className="scanline" />
            <GlobeMap
              events={globeEvents}
              onEventClick={setSelectedEvent}
              view={viewPreset}
              liteMode={liteMode}
            />

            {/* Compact map controls — top right only */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              <div className="map-control-pill bg-black/75 border border-white/10 rounded px-2 py-1 flex items-center gap-1 backdrop-blur-sm">
                {(['ethiopia', 'horn', 'global'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setViewPreset(v)}
                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                      viewPreset === v ? 'bg-radar-red text-white' : 'text-gray-400 hover:text-white'
                    }`}
                    aria-label={`Focus map on ${v}`}
                  >
                    {v === 'ethiopia' ? 'ET' : v === 'horn' ? 'HoA' : 'GL'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLiteMode(l => !l)}
                className={`map-control-pill bg-black/75 border rounded px-2 py-1 text-[8px] font-mono backdrop-blur-sm transition-colors ${
                  liteMode ? 'border-radar-red/50 text-radar-red' : 'border-white/10 text-gray-400 hover:text-white'
                }`}
                aria-pressed={liteMode}
                aria-label="Toggle lite mode"
              >
                Lite
              </button>
            </div>
          </section>

          {/* Filter bar */}
          <FilterBar
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            onSetAll={setAllFilters}
            counts={categoryCounts}
          />

          {/* Ethiopia Thematic Intelligence / news */}
          <RegionalRisk onSelectEvent={setSelectedEvent} />
        </div>

        {/* Right: Economic indicators & rates */}
        <EconomicSidebar layout="sidebar" />
      </div>

      {/* ── Mobile layout: Globe → Filters → Feed ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#020407] flex flex-col no-scrollbar md:hidden">
        {/* Globe */}
        <section className="h-[340px] relative shrink-0">
          <div className="scanline" />
          <GlobeMap
            events={globeEvents}
            onEventClick={setSelectedEvent}
            view={viewPreset}
            liteMode={liteMode}
          />
          {/* Compact view controls — mobile */}
          <div className="absolute top-3 right-3 z-10">
            <div className="map-control-pill bg-black/75 border border-white/10 rounded px-2 py-1 flex items-center gap-1 backdrop-blur-sm">
              {(['ethiopia', 'horn', 'global'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewPreset(v)}
                  className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                    viewPreset === v ? 'bg-radar-red text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {v === 'ethiopia' ? 'ET' : v === 'horn' ? 'HoA' : 'GL'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Filters */}
        <FilterBar
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          onSetAll={setAllFilters}
          counts={categoryCounts}
        />

        {/* Ethiopia Thematic Intelligence */}
        <RegionalRisk onSelectEvent={setSelectedEvent} />

        {/* Diagnostic feed */}
        <LiveAlertFeed events={filteredEvents} layout="mobile" />

        {/* Economic indicators stacked below on mobile */}
        <EconomicSidebar layout="mobile" />
      </div>

      <SmartDigest />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </main>
  );
}
