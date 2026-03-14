import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function RegionalRisk() {
  const [regions, setRegions] = useState<any[]>([
    { name: 'War & Conflict', desc: 'Active kinetic operations & troop movements', risk: 'Critical', color: 'radar-red', unrest: 9.4, food: 'Level 4', idp: '2.1M', active: '12 Active Zones', progress: 92 },
    { name: 'Natural Disaster', desc: 'Drought, flooding & environmental hazards', risk: 'High Risk', color: 'radar-orange', unrest: 7.8, food: 'Level 5', idp: '840K', active: '6 Active Zones', progress: 72 },
    { name: 'Political Stability', desc: 'Civil unrest, policy shifts & social tension', risk: 'Elevated', color: 'radar-orange', unrest: 8.1, food: 'Critical', idp: '1.2M', active: '15 Incident Areas', progress: 65 },
    { name: 'Inflation & Economy', desc: 'ETB Volatility & macro-economic stress', risk: 'Severe', color: 'radar-red', unrest: 8.8, food: '34.2%', idp: 'Market Vol', active: 'National Coverage', progress: 85 },
    { name: 'Oil & Fuel Energy', desc: 'Resource scarcity & supply chain integrity', risk: 'Elevated', color: 'radar-orange', unrest: 4.2, food: 'Low', idp: 'Rationing', active: '2 Minor Hotspots', progress: 35 },
  ]);

  useEffect(() => {
    const fetchLiveStats = async () => {
      // Fetch pulse indicators
      const [indicatorsRes, eventsRes] = await Promise.all([
        supabase.from('indicators').select('*'),
        supabase.from('events').select('source, type, location').ilike('location', '%Ethiopia%')
      ]);
      
      if (indicatorsRes.data) {
        const sentimentMatch = indicatorsRes.data.find(i => i.name === 'Social Sentiment Pulse');
        
        const updatedRegions = regions.map(r => {
          // If the region is War & Conflict, count active reports
          if (r.name === 'War & Conflict' && eventsRes.data) {
            const kineticCount = eventsRes.data.filter(e => 
              e.source === 'ACLED' || 
              e.source.includes('Al Jazeera') || 
              e.source.includes('BBC') ||
              e.source.includes('Ethiopia Observer')
            ).length;
            return { ...r, active: `${kineticCount} Intelligence Reports`, unrest: kineticCount > 2 ? '9.8' : r.unrest, progress: Math.min(100, 70 + kineticCount * 5) };
          }
          
          // If the region is Political Stability, use the sentiment pulse
          if (r.name === 'Political Stability' && sentimentMatch) {
            return { ...r, unrest: sentimentMatch.value, desc: `Regional Vibe Index: ${sentimentMatch.value > 0 ? 'Positive' : 'Tense'}` };
          }

          const match = indicatorsRes.data.find(ind => ind.name.includes(r.name));
          if (match) {
            return { ...r, unrest: match.value };
          }
          return r;
        });
        setRegions(updatedRegions);
      }
    };

    fetchLiveStats();
    // Refresh every minute
    const interval = setInterval(fetchLiveStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="p-6 space-y-8 no-scrollbar">
      <div className="flex items-center justify-between border-b border-radar-border pb-4">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Ethiopia Thematic Intelligence</h3>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Intelligence Pulse</span>
          <button className="text-radar-red text-[10px] font-bold uppercase tracking-widest hover:underline">Full Dataset</button>
        </div>
      </div>
      
      {/* Rest of the component remains similar but uses the dynamic 'regions' state */}
      <div className="bg-radar-panel border border-radar-border rounded p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest text-white">National Incident Trend</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Cumulative violent events (30 Days)</p>
          </div>
        </div>
        <div className="h-32 w-full flex items-end gap-1 relative overflow-hidden">
          <div className="absolute inset-0 flex items-end opacity-20 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
              <path d="M0,80 Q50,60 100,70 T200,40 T300,50 T400,20 T500,45 T600,15 T700,30 T800,10 T900,25 T1000,5" fill="none" stroke="#e11d48" strokeWidth="4"></path>
            </svg>
          </div>
          {[30, 45, 35, 60, 50, 75, 65, 90, 80, 100].map((h, i) => (
            <div key={i} className={`flex-1 bg-radar-red/${i < 5 ? '10' : i < 7 ? '20' : i < 9 ? '40' : ''}`} style={{ height: `${h}%` }}></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {regions.map((region) => (
          <div key={region.name} className={`bg-radar-panel border-l-2 border-radar-red rounded p-5 border-y border-r border-radar-border transition-all hover:bg-radar-panel/80`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-black uppercase tracking-tight text-white">{region.name}</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{region.desc}</p>
              </div>
              <span className={`bg-radar-red/20 text-radar-red border-radar-red/30 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border`}>{region.risk}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-radar-dark p-2 rounded text-center border border-radar-border">
                <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Index</p>
                <p className={`text-lg font-black text-radar-red`}>{region.unrest}</p>
              </div>
              <div className="bg-radar-dark p-2 rounded text-center border border-radar-border">
                <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Status</p>
                <p className={`text-lg font-black text-radar-orange`}>{region.food}</p>
              </div>
              <div className="bg-radar-dark p-2 rounded text-center border border-radar-border">
                <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Impact</p>
                <p className="text-lg font-black text-white">{region.idp}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-400">
                <span>Active Conflicts</span>
                <span className="text-white">{region.active}</span>
              </div>
              <div className="h-1 bg-radar-border rounded-full overflow-hidden">
                <div className={`h-full bg-radar-red transition-all duration-1000`} style={{ width: `${region.progress}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
