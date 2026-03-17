'use client';

import dynamic from 'next/dynamic';
import { TopNav } from '@/components/TopNav';
import { LiveAlertFeed } from '@/components/LiveAlertFeed';
import { RegionalRisk } from '@/components/RegionalRisk';
import { EconomicSidebar } from '@/components/EconomicSidebar';
import { SmartDigest } from '@/components/SmartDigest';
import { EventDetailModal } from '@/components/EventDetailModal';
import { FilterBar } from '@/components/FilterBar';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { classifyEvent, ALL_CATEGORIES, type EventCategory } from '@/lib/categories';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-radar-dark flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
      Initialising Global Visualizer...
    </div>
  ),
});

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // All categories active by default
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

  // Enrich raw Supabase event with normalised fields
  const enrichEvent = (ev: any) => ({
    ...ev,
    current_score: (ev.risk_level ?? 1) * 2,
    category: classifyEvent(ev.type),
    text: ev.description?.substring(0, 30) || 'Intelligence Pulse',
  });

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

  // Per-category counts (across ALL events, not just filtered)
  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(ALL_CATEGORIES.map(c => [c, 0])) as Record<EventCategory, number>;
    events.forEach(ev => { counts[ev.category as EventCategory] = (counts[ev.category as EventCategory] ?? 0) + 1; });
    return counts;
  }, [events]);

  // Events visible on the map / feed
  const filteredEvents = useMemo(
    () => events.filter(ev => activeFilters.has(ev.category as EventCategory)),
    [events, activeFilters],
  );

  return (
    <main className="flex flex-col h-screen font-sans selection:bg-radar-red selection:text-white">
      <TopNav />

      <div className="flex-1 flex overflow-hidden">
        <LiveAlertFeed events={filteredEvents} />

        <div className="flex-1 overflow-y-auto bg-[#050505] relative flex flex-col no-scrollbar">
          {/* Interactive Flat Map */}
          <section className="h-[500px] relative border-b border-radar-border shrink-0">
            <div className="scanline" />
            <GlobeMap events={filteredEvents} onEventClick={setSelectedEvent} />

            {/* Overlay label */}
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                Global Situation
                <span className="text-[10px] bg-radar-red text-white px-2 py-0.5 rounded font-mono">LIVE FEED</span>
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                Focus Layer: Ethiopia Administrative States
              </p>
            </div>
          </section>

          {/* Event filter bar */}
          <FilterBar
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            onSetAll={setAllFilters}
            counts={categoryCounts}
          />

          {/* Risk Analysis */}
          <RegionalRisk />
        </div>

        <EconomicSidebar />
      </div>

      <SmartDigest />

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </main>
  );
}
