'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, X } from 'lucide-react';

export function IntelligenceBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchBriefing = async () => {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .eq('name', 'SITUATIONAL_BRIEFING')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data && data.metadata && data.metadata.content) {
        setBriefing(data.metadata.content);
      }
    };

    fetchBriefing();
    
    // Subscribe to new briefings
    const channel = supabase
      .channel('briefing_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'indicators' }, payload => {
        if (payload.new.name === 'SITUATIONAL_BRIEFING') {
          setBriefing(payload.new.metadata.content);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!briefing) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-radar-red/10 border border-radar-red/30 rounded text-[10px] font-black uppercase tracking-widest text-radar-red hover:bg-radar-red/20 transition-all group"
      >
        <Sparkles className="w-3 h-3 animate-pulse" />
        Intel Briefing
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-96 bg-radar-dark border border-radar-red/50 shadow-2xl shadow-radar-red/20 z-[60] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-radar-red">Situational Analysis</h3>
            <X className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white" onClick={() => setIsOpen(false)} />
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-radar-panel/50 border border-radar-border relative overflow-hidden">
               <div className="scanline"></div>
               <p className="text-[11px] leading-relaxed text-gray-300 font-mono italic">
                 {briefing}
               </p>
            </div>
            <div className="text-[8px] text-gray-500 uppercase tracking-widest flex justify-between items-center">
              <span>Confidence: 84%</span>
              <span>Source: Intel-Core-V1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
