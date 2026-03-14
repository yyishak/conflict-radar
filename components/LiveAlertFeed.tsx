import { Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function LiveAlertFeed() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data && !error) {
        setAlerts(data);
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel('alert_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => {
        setAlerts(prev => [payload.new, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <aside className="w-80 border-r border-radar-border bg-radar-dark flex flex-col z-20 shrink-0">
      <div className="p-4 border-b border-radar-border flex justify-between items-center bg-radar-panel/50">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-radar-red flex items-center gap-2">
          <span className="w-2 h-2 bg-radar-red rounded-full animate-pulse"></span>
          Diagnostic Feed
        </h2>
        <Filter className="w-4 h-4 text-gray-500 cursor-pointer" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {alerts.length === 0 ? (
          <div className="text-[10px] text-gray-500 uppercase text-center mt-10 animate-pulse">Scanning frequencies...</div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
              className={`border-l-2 ${alert.risk_level > 3 ? 'border-radar-red shadow-lg shadow-radar-red/5' : 'border-radar-orange'} bg-radar-panel/30 p-3 relative group cursor-pointer hover:bg-radar-panel/50 transition-all overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {alert.location || 'Unknown Region'}
                </div>
                {expandedId === alert.id && <span className="text-[8px] bg-radar-red text-white px-1 font-bold">ANALYSIS ACTIVE</span>}
              </div>
              
              <p className={`text-sm leading-snug transition-all ${expandedId === alert.id ? 'text-white font-bold' : 'text-gray-300'}`}>
                {alert.description}
              </p>

              {expandedId === alert.id && (
                <div className="mt-3 pt-3 border-t border-radar-border/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-radar-dark p-2 border border-radar-border/30">
                      <p className="text-[8px] text-gray-500 uppercase font-bold">Source</p>
                      <p className="text-[10px] text-radar-red font-black uppercase">{alert.source}</p>
                    </div>
                    <div className="bg-radar-dark p-2 border border-radar-border/30">
                      <p className="text-[8px] text-gray-500 uppercase font-bold">Risk Weight</p>
                      <p className="text-[10px] text-white font-black uppercase">{alert.risk_level}/5.0</p>
                    </div>
                  </div>
                  <div className="bg-radar-red/10 p-2 border border-radar-red/20 italic text-[11px] text-radar-red/90 leading-relaxed">
                    Intelligence confirm reports of heightened activity in the sector. Recommendation: Maintain Level 4 situational awareness and monitor secondary feeds.
                  </div>
                </div>
              )}

              {!expandedId && (
                <div className="mt-2 flex gap-2">
                  <span className={`text-[9px] bg-radar-red/20 text-radar-red px-1 rounded border border-radar-red/30 uppercase font-bold`}>
                    {alert.source}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
