import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function EconomicSidebar() {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndicators = async () => {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        setIndicators(data);
      }
    };

    fetchIndicators();
  }, []);

  const getVal = (name: string, fallback: string | number) => {
    const found = indicators.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    return found ? found.value : fallback;
  };

  const officialRate = getVal('ETB_USD_OFFICIAL', '118.42');
  const blackMarketRate = getVal('ETB_USD_BLACK_MARKET', '148.50');

  return (
    <aside className="w-80 border-l border-radar-border bg-radar-dark flex flex-col z-20 shrink-0 overflow-hidden">
      <div className="p-4 border-b border-radar-border flex justify-between items-center bg-radar-panel/50">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Economic Intel</h2>
        <span className="text-[9px] text-radar-cyan animate-pulse uppercase font-mono">Live Stream</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* Currency Section */}
        <div 
          onClick={() => setExpandedSection(expandedSection === 'currency' ? null : 'currency')}
          className="space-y-4 cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors">Exchange Index</h3>
            <span className="text-[8px] text-radar-red font-mono">{expandedSection === 'currency' ? '[-] CLOSE' : '[+] DETAIL'}</span>
          </div>
          
          <div className="space-y-2">
            <div className="bg-radar-panel/30 border border-radar-border p-3 flex justify-between items-end">
              <div>
                <p className="text-[8px] text-gray-500 uppercase font-bold">Official Rate</p>
                <p className="text-xl font-black text-white">{officialRate}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-gray-500 uppercase font-bold">Parallel</p>
                <p className="text-xl font-black text-radar-teal">{blackMarketRate}</p>
              </div>
            </div>

            {expandedSection === 'currency' && (
              <div className="p-3 bg-radar-cyan/5 border border-radar-cyan/20 text-[10px] text-gray-400 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <p className="italic">Analysis: Parallel market premium remains elevated at 25.4% due to interbank liquidity constraints. Historical trend suggests seasonal volatility in Q3.</p>
                <div className="h-12 w-full bg-radar-dark/50 overflow-hidden relative border border-radar-border/30">
                  <div className="absolute inset-0 flex items-end">
                    <div className="w-full h-1/2 bg-gradient-to-t from-radar-cyan/20 to-transparent"></div>
                  </div>
                  <div className="absolute bottom-2 left-2 text-[8px] font-mono text-radar-cyan">SPREAD: +29.08 ETB</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Energy Section */}
        <div 
          onClick={() => setExpandedSection(expandedSection === 'energy' ? null : 'energy')}
          className="space-y-3 cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors">Fuel & Energy</h3>
            <span className="text-[8px] text-radar-orange font-mono">{expandedSection === 'energy' ? '[-] CLOSE' : '[+] DETAIL'}</span>
          </div>
          <div className="bg-radar-panel/50 border border-radar-border p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-300 font-bold uppercase">Diesel Price</span>
              <span className="text-[10px] text-radar-red font-mono">112.50 ETB/L</span>
            </div>
            {expandedSection === 'energy' && (
              <div className="pt-2 border-t border-radar-border/30 space-y-2 animate-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between text-[8px] uppercase font-bold">
                  <span className="text-gray-500">Inventory</span>
                  <span className="text-radar-orange">Critical (12%)</span>
                </div>
                <div className="w-full bg-radar-dark h-1 rounded-full overflow-hidden">
                  <div className="bg-radar-orange h-full w-[12%] animate-pulse"></div>
                </div>
                <p className="text-[9px] text-gray-500 italic">Central supply lines under stress. Distribution rationing enforced in 8 administrative zones.</p>
              </div>
            )}
          </div>
        </div>

        {/* Inflation Section */}
        <div 
          onClick={() => setExpandedSection(expandedSection === 'inflation' ? null : 'inflation')}
          className="space-y-3 cursor-pointer group"
        >
          <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors">Macro Stability</h3>
          <div className="p-3 bg-radar-panel/50 border border-radar-border flex justify-between items-center transition-all group-hover:border-radar-cyan/30">
            <span className="text-xs font-bold text-gray-400 uppercase">Annual Inflation</span>
            <span className="text-sm text-radar-cyan font-mono font-bold">34.2%</span>
          </div>
          {expandedSection === 'inflation' && (
            <div className="p-3 bg-radar-panel/20 border border-radar-border text-[9px] text-gray-400 leading-relaxed italic animate-in fade-in duration-200">
              Food basket costs rose by 4.2% month-over-month. Supply chain disruptions in the northern corridor contributing to price pressure on basic staples.
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-radar-border/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest text-white">Sentiment Pulse</h3>
            <span className="text-[10px] font-mono text-radar-cyan">{getVal('Social Sentiment Pulse', '-2.4')}</span>
          </div>
          <div className="w-full bg-radar-panel h-2 overflow-hidden border border-radar-border/30 relative">
            <div 
              className="bg-radar-cyan h-full transition-all duration-1000 relative" 
              style={{ width: `${Math.abs(Number(getVal('Social Sentiment Pulse', -2.4))) * 10}%`, marginLeft: Number(getVal('Social Sentiment Pulse', -2.4)) > 0 ? '50%' : 'auto', marginRight: Number(getVal('Social Sentiment Pulse', -2.4)) < 0 ? '50%' : 'auto' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-scan"></div>
            </div>
            <div className="absolute top-0 left-1/2 w-px h-full bg-gray-600"></div>
          </div>
          <div className="flex justify-between mt-1 text-[8px] font-bold uppercase tracking-widest text-gray-600">
            <span>Volatile</span>
            <span className="text-gray-400">Neutral</span>
            <span>Stable</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
