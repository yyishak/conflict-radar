'use client';

import dynamic from 'next/dynamic';
import { TopNav } from '@/components/TopNav';
import { LiveAlertFeed } from '@/components/LiveAlertFeed';
import { RegionalRisk } from '@/components/RegionalRisk';
import { EconomicSidebar } from '@/components/EconomicSidebar';
import { SmartDigest } from '@/components/SmartDigest';
import { EventDetailModal } from '@/components/EventDetailModal';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-radar-dark flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">Initialising Global Visualizer...</div>
});

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    // Initial fetch from Supabase
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (data && !error) {
        const mappedEvents = data.map(ev => ({
          ...ev,
          id: ev.id,
          latitude: ev.latitude,
          longitude: ev.longitude,
          current_score: ev.risk_level * 2,
          category: ev.type?.includes('Conflict') || ev.type?.includes('Violence') ? 'Kinetic' : 'Tactical',
          text: ev.description?.substring(0, 30) || 'Intelligence Pulse'
        }));
        setEvents(mappedEvents);
      }
    };

    fetchEvents();

    const channel = supabase
      .channel('live_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => {
        const newEvent = payload.new;
        setEvents(prev => [{
          ...newEvent,
          id: newEvent.id,
          latitude: newEvent.latitude,
          longitude: newEvent.longitude,
          current_score: newEvent.risk_level * 2,
          category: newEvent.type?.includes('Conflict') || newEvent.type?.includes('Violence') ? 'Kinetic' : 'Tactical',
          text: newEvent.description?.substring(0, 30) || 'New Pulse'
        }, ...prev].slice(0, 200));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="flex flex-col h-screen font-sans selection:bg-radar-red selection:text-white">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LiveAlertFeed />
        
        <div className="flex-1 overflow-y-auto bg-[#050505] relative flex flex-col no-scrollbar">
          {/* TOP SECTION: Interactive 3D Globe */}
          <section className="h-[500px] relative border-b border-radar-border shrink-0">
            <div className="scanline"></div>
            <GlobeMap events={events} onEventClick={setSelectedEvent} />
            
            {/* Overlay Labels */}
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                Global Situation
                <span className="text-[10px] bg-radar-red text-white px-2 py-0.5 rounded font-mono">LIVE FEED</span>
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 text-white">Focus Layer: Ethiopia Administrative States</p>
            </div>
          </section>

          {/* BOTTOM SECTION: Risk Analysis & Metrics */}
          <RegionalRisk />
        </div>
        
        <EconomicSidebar />
      </div>
      <SmartDigest />
      
      {/* Event Detail Modal */}
      <EventDetailModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </main>
  );
}
