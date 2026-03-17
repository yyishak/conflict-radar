import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ETHIOPIA_THEMATIC_ARTICLES = [
  {
    id: 'conflict-dynamics',
    title: "Conflict Dynamics Across Ethiopia's Northern Corridor",
    source: 'Multi-source field reporting',
    summary:
      'Synthesised overview of current kinetic activity, ceasefire stability, and cross-border spillover risks impacting northern Ethiopia.',
    url: 'https://example.org/ethiopia/conflict-dynamics',
  },
  {
    id: 'political-stability',
    title: 'Political Stability & Governance Signal Pack',
    source: 'Parliament, party communiqués, and civil-society reporting',
    summary:
      'Curated brief on institutional resilience, protest activity, and elite bargaining trends shaping Ethiopia’s medium-term political trajectory.',
    url: 'https://example.org/ethiopia/political-stability',
  },
  {
    id: 'macroeconomic-stress',
    title: 'Macro-Economic Stress & FX Pressure',
    source: 'IMF, World Bank, commercial research',
    summary:
      'Digest of inflation, FX liquidity, and sovereign risk signals relevant to importers, lenders, and portfolio exposure.',
    url: 'https://example.org/ethiopia/macroeconomic-stress',
  },
];

interface RegionalRiskProps {
  onSelectEvent?: (event: any) => void;
}

export function RegionalRisk({ onSelectEvent }: RegionalRiskProps) {
  const [regions, setRegions] = useState<any[]>([]);
  const [activeArticle, setActiveArticle] = useState<any | null>(null);
  const [ethiopiaEvents, setEthiopiaEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchLiveStats = async () => {
      // Fetch pulse indicators
      const [indicatorsRes, eventsRes] = await Promise.all([
        supabase.from('indicators').select('*'),
        supabase.from('events').select('*').ilike('location', '%Ethiopia%')
      ]);

      const indicators = indicatorsRes.data ?? [];
      const events = eventsRes.data ?? [];

      if (events.length) {
        // Keep a small, recent Ethiopia-focused slice for the news layout
        const sorted = [...events].sort(
          (a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime(),
        );
        setEthiopiaEvents(sorted.slice(0, 40));
      }

      // Build dynamic regional cards — no hard-coded numbers
      const kineticEvents = events.filter(e =>
        e.source === 'ACLED' ||
        (e.source || '').includes('Al Jazeera') ||
        (e.source || '').includes('BBC') ||
        (e.source || '').includes('Ethiopia Observer'),
      );

      const disasterEvents = events.filter(e =>
        /flood|drought|disaster/i.test(e.type ?? '') ||
        /GDACS|ReliefWeb/i.test(e.source ?? ''),
      );

      const sentimentMatch = indicators.find(i => i.name === 'Social Sentiment Pulse');
      const inflationIndicator = indicators.find(i =>
        /inflation|cpi/i.test(i.name ?? ''),
      );
      const fuelIndicator = indicators.find(i =>
        /fuel|diesel/i.test(i.name ?? ''),
      );

      const warCount = kineticEvents.length;
      const disasterCount = disasterEvents.length;
      const sentiment = typeof sentimentMatch?.value === 'number' ? sentimentMatch.value : null;
      const inflation = typeof inflationIndicator?.value === 'number' ? inflationIndicator.value : null;
      const fuelStress = typeof fuelIndicator?.value === 'number' ? fuelIndicator.value : null;

      const riskFromCount = (count: number) => {
        if (count > 20) return 'Critical';
        if (count > 10) return 'High Risk';
        if (count > 3) return 'Elevated';
        if (count > 0) return 'Watch';
        return 'Stable';
      };

      const politicalRisk = (() => {
        if (sentiment == null) return 'Live Feed';
        if (sentiment <= -3) return 'Critical';
        if (sentiment < 0) return 'Elevated';
        if (sentiment > 2) return 'Improving';
        return 'Watch';
      })();

      const inflationRisk = (() => {
        if (inflation == null) return 'Live Feed';
        if (inflation >= 30) return 'Severe';
        if (inflation >= 15) return 'High Risk';
        if (inflation >= 5) return 'Elevated';
        return 'Stable';
      })();

      const fuelRisk = (() => {
        if (fuelStress == null) return 'Live Feed';
        if (fuelStress >= 80) return 'Critical';
        if (fuelStress >= 50) return 'Elevated';
        return 'Watch';
      })();

      const nextRegions = [
        {
          name: 'War & Conflict',
          desc: 'Active kinetic operations & troop movements',
          risk: riskFromCount(warCount),
          color: 'radar-red',
          unrest: warCount ? warCount.toString() : '—',
          food: riskFromCount(warCount) === 'Critical' ? 'Level 4' : riskFromCount(warCount) === 'High Risk' ? 'Level 3' : 'Level 2',
          idp: warCount ? `${warCount.toLocaleString()} signals` : 'Live feed',
          active: warCount ? `${warCount} Intelligence Reports` : 'No recent reports',
          progress: Math.min(100, 40 + warCount * 3),
        },
        {
          name: 'Natural Disaster',
          desc: 'Drought, flooding & environmental hazards',
          risk: riskFromCount(disasterCount),
          color: 'radar-orange',
          unrest: disasterCount ? disasterCount.toString() : '—',
          food: riskFromCount(disasterCount),
          idp: disasterCount ? `${disasterCount.toLocaleString()} hazard events` : 'Live feed',
          active: disasterCount ? `${disasterCount} Active Zones` : 'No active zones',
          progress: Math.min(100, 30 + disasterCount * 4),
        },
        {
          name: 'Political Stability',
          desc:
            sentiment != null
              ? `Regional Vibe Index: ${sentiment > 0 ? 'Positive' : 'Tense'}`
              : 'Civil unrest, policy shifts & social tension',
          risk: politicalRisk,
          color: 'radar-orange',
          unrest: sentiment != null ? sentiment.toFixed(1) : '—',
          food: sentiment != null ? (sentiment > 0 ? 'Positive' : 'Tense') : 'Live feed',
          idp: 'Sentiment Index',
          active: warCount ? `${warCount} Linked Incidents` : 'No linked incidents',
          progress: Math.min(100, 50 + (sentiment != null ? Math.abs(sentiment) * 5 : 10)),
        },
        {
          name: 'Inflation & Economy',
          desc: 'ETB volatility & macro-economic stress',
          risk: inflationRisk,
          color: 'radar-red',
          unrest: inflation != null ? inflation.toFixed(1) : '—',
          food: inflation != null ? `${inflation.toFixed(1)}%` : 'Live feed',
          idp: 'Market Conditions',
          active: 'National Coverage',
          progress: Math.min(100, 40 + (inflation != null ? inflation : 10)),
        },
        {
          name: 'Oil & Fuel Energy',
          desc: 'Resource scarcity & supply chain integrity',
          risk: fuelRisk,
          color: 'radar-orange',
          unrest: fuelStress != null ? fuelStress.toFixed(1) : '—',
          food: fuelStress != null ? 'Inventory' : 'Live feed',
          idp: fuelStress != null ? `${fuelStress.toFixed(0)}% Stress` : 'Rationing risk',
          active: fuelStress != null ? 'Critical corridors' : 'Monitoring',
          progress: Math.min(100, 30 + (fuelStress != null ? fuelStress : 15)),
        },
      ];

      setRegions(nextRegions);
    };

    fetchLiveStats();
    // Refresh every minute
    const interval = setInterval(fetchLiveStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.round(diffH / 24);
    return `${diffD}d ago`;
  };

  return (
    <section id="ethiopia-intel" className="p-6 space-y-8 no-scrollbar">
      <div className="flex items-center justify-between border-b border-radar-border pb-4">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Ethiopia Thematic Intelligence</h3>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Intelligence Pulse</span>
          <button className="text-radar-red text-[10px] font-bold uppercase tracking-widest hover:underline">Full Dataset</button>
        </div>
      </div>

      {/* Thematic reading deck modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-radar-panel border border-radar-border rounded-lg max-w-lg w-full mx-4 p-6 relative">
            <button
              onClick={() => setActiveArticle(null)}
              className="absolute top-3 right-3 text-[10px] font-mono text-gray-400 hover:text-white uppercase tracking-widest"
            >
              Close
            </button>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em] mb-2">
              Ethiopia Reading Brief
            </p>
            <h4 className="text-lg font-black text-white mb-2">{activeArticle.title}</h4>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
              Curated from: {activeArticle.source}
            </p>
            <p className="text-sm text-gray-300 mb-4">
              {activeArticle.summary}
            </p>
            <a
              href={activeArticle.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-radar-red hover:underline"
            >
              Open full article / source
              <span className="text-xs">↗</span>
            </a>
          </div>
        </div>
      )}

      {/* Thematic reading deck + NYT-style Ethiopia layout */}
      <div className="bg-radar-panel border border-radar-border rounded p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.24em]">
              Ethiopia Thematic Reading Deck
            </p>
            <p className="text-[10px] text-gray-400">
              Curated long-reads to frame the day&apos;s risk picture.
            </p>
          </div>
        </div>

        {/* Top row: featured briefs (paper-style headlines) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-radar-border pt-4">
          {ETHIOPIA_THEMATIC_ARTICLES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveArticle(a)}
              className="text-left group"
            >
              <h4 className="text-[13px] font-semibold text-white group-hover:text-radar-red leading-snug">
                {a.title}
              </h4>
              <p className="mt-1 text-[10px] text-gray-500 uppercase tracking-widest">
                {a.source}
              </p>
              <p className="mt-2 text-[11px] text-gray-400 line-clamp-3">
                {a.summary}
              </p>
            </button>
          ))}
        </div>

        {/* Bottom row: Ethiopia news layout — categorised, recency-biased */}
        <div className="mt-4 border-t border-radar-border pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              id: 'conflict',
              title: 'Conflict & Security',
              filter: (e: any) =>
                /conflict|kinetic|clash|battle|attack|militia|troop/i.test(e.type ?? '') ||
                /ACLED|OpenSky/i.test(e.source ?? ''),
            },
            {
              id: 'political',
              title: 'Political & Governance',
              filter: (e: any) =>
                /politic|election|governance|protest|demonstration/i.test(e.type ?? '') ||
                /parliament|party/i.test(e.description ?? ''),
            },
            {
              id: 'humanitarian',
              title: 'Humanitarian & Disaster',
              filter: (e: any) =>
                /flood|drought|disaster|idp|displacement|aid/i.test(e.type ?? '') ||
                /GDACS|ReliefWeb/i.test(e.source ?? ''),
            },
            {
              id: 'economic',
              title: 'Economic & Markets',
              filter: (e: any) =>
                /inflation|fx|currency|commodity|trade|market/i.test(e.type ?? '') ||
                /World Bank|IMF/i.test(e.source ?? ''),
            },
          ].map((bucket) => {
            const items = ethiopiaEvents.filter(bucket.filter).slice(0, 4);
            return (
              <div key={bucket.id} className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 border-b border-radar-border pb-1">
                  {bucket.title}
                </h4>
                {items.length === 0 && (
                  <p className="text-[10px] text-gray-600 italic">No fresh Ethiopia items in this band.</p>
                )}
                <ul className="space-y-1.5">
                  {items.map((e, idx) => (
                    <li
                      key={`${bucket.id}-${idx}`}
                      className="text-[11px] text-gray-300 leading-snug cursor-pointer hover:text-white"
                      onClick={() => onSelectEvent?.(e)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {e.location || 'Ethiopia'}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {formatRelativeTime(e.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">
                          {e.type || e.source}
                        </span>
                        <span className="text-[8px] uppercase tracking-widest text-radar-red ml-auto">
                          {bucket.id === 'conflict'
                            ? 'High Risk'
                            : bucket.id === 'political'
                            ? 'Governance'
                            : bucket.id === 'humanitarian'
                            ? 'Humanitarian'
                            : 'Macro'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
