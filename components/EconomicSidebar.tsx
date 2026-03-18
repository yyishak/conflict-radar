'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Fuel, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Quote {
  symbol: string;
  name: string;
  unit: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  currency: string;
  error?: boolean;
}

interface CommodityData {
  quotes: Quote[];
  updatedAt: string;
}

function TrendArrow({ change }: { change: number | null }) {
  if (change === null) return <Minus className="w-3 h-3 text-gray-600" />;
  if (change > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
  if (change < 0) return <TrendingDown className="w-3 h-3 text-radar-red" />;
  return <Minus className="w-3 h-3 text-gray-500" />;
}

function CommodityRow({ quote }: { quote: Quote }) {
  const up = (quote.changePct ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-radar-border/30 last:border-0">
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-300 font-bold uppercase">{quote.name}</span>
        <span className="text-[8px] text-gray-600 font-mono">{quote.unit}</span>
      </div>
      <div className="text-right flex flex-col items-end">
        <span className="text-sm font-black font-mono text-white">
          {quote.price != null ? `$${quote.price.toFixed(2)}` : 'N/A'}
        </span>
        {quote.changePct != null && (
          <span
            className="text-[9px] font-mono font-bold flex items-center gap-0.5"
            style={{ color: up ? '#22c55e' : '#e11d48' }}
          >
            <TrendArrow change={quote.change} />
            {Math.abs(quote.changePct).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

/** Pill that shows a live value or a neutral dash when unavailable */
function LiveValue({
  value,
  unit = '',
  color = 'text-white',
  loading = false,
}: {
  value: number | null;
  unit?: string;
  color?: string;
  loading?: boolean;
}) {
  if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />;
  if (value === null) return <span className="text-gray-600 font-mono text-sm">—</span>;
  return (
    <span className={`text-xl font-black font-mono ${color}`}>
      {value.toFixed(2)}{unit}
    </span>
  );
}

interface EconomicSidebarProps {
  layout?: 'sidebar' | 'mobile';
}

export function EconomicSidebar({ layout = 'sidebar' }: EconomicSidebarProps) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [indicatorsLoaded, setIndicatorsLoaded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [commodities, setCommodities] = useState<CommodityData | null>(null);
  const [commodityLoading, setCommodityLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // ── Supabase indicators ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('indicators')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && !error) setIndicators(data);
      setIndicatorsLoaded(true);
    };
    load();

    // Realtime subscription — refresh on any change
    const channel = supabase
      .channel('indicators-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'indicators' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Live commodity prices ────────────────────────────────────────────────────
  const fetchCommodities = useCallback(async () => {
    try {
      const res = await fetch('/api/commodities');
      if (!res.ok) throw new Error('API error');
      const data: CommodityData = await res.json();
      setCommodities(data);
      setLastUpdated(
        new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch {
      /* keep previous data on error */
    } finally {
      setCommodityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommodities();
    const interval = setInterval(fetchCommodities, 120_000);
    return () => clearInterval(interval);
  }, [fetchCommodities]);

  // ── Helper: look up latest indicator value by name substring ─────────────────
  const getNum = (namePart: string): number | null => {
    const found = indicators.find(i =>
      (i.name ?? '').toLowerCase().includes(namePart.toLowerCase()),
    );
    if (!found) return null;
    const v = Number(found.value);
    return Number.isFinite(v) ? v : null;
  };

  // ── Resolved values (null = not yet in Supabase) ─────────────────────────────
  const officialRate   = getNum('ETB_USD_OFFICIAL');
  const blackMarket    = getNum('ETB_USD_BLACK_MARKET');
  const dieselPrice    = getNum('DIESEL_PRICE_ETB');
  const fuelStress     = getNum('FUEL_STRESS_INDEX');
  const inflation      = getNum('INFLATION_ANNUAL_PCT');
  const sentiment      = getNum('Social Sentiment Pulse');

  // ── Derived / commentary values ───────────────────────────────────────────────
  const spread = officialRate != null && blackMarket != null
    ? blackMarket - officialRate
    : null;
  const premiumPct = officialRate != null && spread != null && officialRate > 0
    ? (spread / officialRate) * 100
    : null;

  const fuelLabel =
    fuelStress == null ? '—' :
    fuelStress >= 70   ? 'Critical' :
    fuelStress >= 40   ? 'Elevated' :
    fuelStress >= 15   ? 'Watch'    : 'Normal';

  const inflationLabel =
    inflation == null ? '—' :
    inflation >= 30    ? 'Severe'    :
    inflation >= 15    ? 'High Risk' :
    inflation >= 5     ? 'Elevated'  : 'Stable';

  // ── Commodity splits ─────────────────────────────────────────────────────────
  const oilQuotes = commodities?.quotes.filter(q => q.symbol !== 'GC=F') ?? [];
  const goldQuote = commodities?.quotes.find(q => q.symbol === 'GC=F');

  const rootClasses =
    layout === 'sidebar'
      ? 'w-80 border-l border-radar-border bg-radar-dark flex flex-col z-20 shrink-0 overflow-hidden'
      : 'w-full border-t border-radar-border bg-radar-dark flex flex-col z-20 shrink-0 overflow-hidden';

  return (
    <aside className={rootClasses}>
      <div className="p-4 border-b border-radar-border flex justify-between items-center bg-radar-panel/50">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Economic Intel</h2>
        <span className="text-[9px] text-radar-red animate-pulse uppercase font-mono">Live</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">

        {/* ── Oil & Commodities ───────────────────────────────────────────────── */}
        <div
          onClick={() => setExpandedSection(expandedSection === 'oil' ? null : 'oil')}
          className="space-y-3 cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 shrink-0" />
              Oil &amp; Commodities
            </h3>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[8px] text-gray-600 font-mono">{lastUpdated}</span>
              )}
              <button
                onClick={e => { e.stopPropagation(); fetchCommodities(); }}
                className="text-gray-500 hover:text-white transition-colors"
                title="Refresh prices"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <span className="text-[8px] text-radar-orange font-mono">
                {expandedSection === 'oil' ? '[-]' : '[+]'}
              </span>
            </div>
          </div>

          <div className="bg-radar-panel/50 border border-radar-border divide-y divide-radar-border/20">
            {commodityLoading ? (
              <div className="p-3 text-[9px] text-gray-500 font-mono animate-pulse uppercase tracking-widest text-center">
                Fetching market data...
              </div>
            ) : oilQuotes.length > 0 ? (
              oilQuotes.map(q => <CommodityRow key={q.symbol} quote={q} />)
            ) : (
              <div className="p-3 text-[9px] text-gray-600 font-mono text-center">
                No commodity data available
              </div>
            )}
          </div>

          {expandedSection === 'oil' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {goldQuote && (
                <div className="bg-radar-panel/30 border border-radar-border/40 px-3">
                  <CommodityRow quote={goldQuote} />
                </div>
              )}
              <div className="p-3 bg-radar-orange/5 border border-radar-orange/20 text-[10px] text-gray-400 space-y-1 italic">
                <p>
                  Brent Crude tracks Horn of Africa supply risk.
                  {commodities?.quotes.find(q => q.symbol === 'BZ=F')?.price != null
                    ? ` Current: $${commodities!.quotes.find(q => q.symbol === 'BZ=F')!.price!.toFixed(2)}/bbl.`
                    : ''
                  }
                  {' '}Elevated prices amplify transport costs across conflict zones.
                </p>
                <p className="text-[8px] text-gray-600 not-italic font-mono">
                  Source: Yahoo Finance · 15-min delay
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Currency Exchange ───────────────────────────────────────────────── */}
        <div
          onClick={() => setExpandedSection(expandedSection === 'currency' ? null : 'currency')}
          className="space-y-3 cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors">
              Exchange Index
            </h3>
            <span className="text-[8px] text-radar-red font-mono">
              {expandedSection === 'currency' ? '[-] CLOSE' : '[+] DETAIL'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="bg-radar-panel/30 border border-radar-border p-3 flex justify-between items-end">
              <div>
                <p className="text-[8px] text-gray-500 uppercase font-bold">Official Rate</p>
                <LiveValue
                  value={officialRate}
                  loading={!indicatorsLoaded}
                  color="text-white"
                />
                <p className="text-[8px] text-gray-600 font-mono">ETB / USD</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-gray-500 uppercase font-bold">Parallel</p>
                <LiveValue
                  value={blackMarket}
                  loading={!indicatorsLoaded}
                  color="text-radar-red"
                />
                <p className="text-[8px] text-gray-600 font-mono">Black market</p>
              </div>
            </div>

            {expandedSection === 'currency' && (
              <div className="p-3 bg-radar-red/5 border border-radar-red/20 text-[10px] text-gray-400 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                {premiumPct != null ? (
                  <p className="italic">
                    Parallel market premium at{' '}
                    <span className="text-radar-red font-bold not-italic">
                      {premiumPct.toFixed(1)}%
                    </span>{' '}
                    above official interbank rate. Spread reflects FX liquidity constraints.
                  </p>
                ) : (
                  <p className="italic text-gray-600">Live spread data unavailable — awaiting backend pulse.</p>
                )}
                <div className="h-10 w-full bg-radar-dark/50 overflow-hidden relative border border-radar-border/30">
                  <div className="absolute inset-0 flex items-end">
                    <div className="w-full h-1/2 bg-gradient-to-t from-radar-red/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-2 left-2 text-[8px] font-mono text-radar-red">
                    {spread != null
                      ? `SPREAD: +${spread.toFixed(2)} ETB`
                      : 'SPREAD: —'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Fuel & Energy ───────────────────────────────────────────────────── */}
        <div
          onClick={() => setExpandedSection(expandedSection === 'energy' ? null : 'energy')}
          className="space-y-3 cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors">
              Fuel &amp; Energy
            </h3>
            <span className="text-[8px] text-radar-orange font-mono">
              {expandedSection === 'energy' ? '[-] CLOSE' : '[+] DETAIL'}
            </span>
          </div>
          <div className="bg-radar-panel/50 border border-radar-border p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-300 font-bold uppercase">Diesel Price</span>
              {!indicatorsLoaded ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
              ) : dieselPrice != null ? (
                <span className="text-[10px] text-radar-red font-mono font-bold">
                  {dieselPrice.toFixed(2)} ETB/L
                </span>
              ) : (
                <span className="text-[10px] text-gray-600 font-mono">— ETB/L</span>
              )}
            </div>
            {expandedSection === 'energy' && (
              <div className="pt-2 border-t border-radar-border/30 space-y-2 animate-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between text-[8px] uppercase font-bold">
                  <span className="text-gray-500">Fuel Stress</span>
                  <span className={fuelStress != null && fuelStress >= 70 ? 'text-radar-red' : 'text-radar-orange'}>
                    {fuelStress != null ? `${fuelLabel} (${fuelStress.toFixed(0)}%)` : '—'}
                  </span>
                </div>
                {fuelStress != null && (
                  <div className="w-full bg-radar-dark h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, fuelStress)}%`,
                        background: fuelStress >= 70 ? '#e11d48' : '#f97316',
                      }}
                    />
                  </div>
                )}
                <p className="text-[9px] text-gray-500 italic">
                  {fuelStress != null
                    ? fuelStress >= 70
                      ? 'Critical pressure on distribution corridors. Rationing risk elevated.'
                      : fuelStress >= 40
                      ? 'Moderate stress on supply chains. Monitor distribution gaps.'
                      : 'Supply conditions within expected range.'
                    : 'Awaiting fuel stress data from backend pulse.'}
                </p>
                <p className="text-[8px] text-gray-600 font-mono not-italic">
                  Derived: Brent crude (Yahoo Finance) × ETB/USD rate
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Macro Stability ─────────────────────────────────────────────────── */}
        <div
          onClick={() => setExpandedSection(expandedSection === 'inflation' ? null : 'inflation')}
          className="space-y-3 cursor-pointer group"
        >
          <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest group-hover:text-white transition-colors">
            Macro Stability
          </h3>
          <div className="p-3 bg-radar-panel/50 border border-radar-border flex justify-between items-center transition-all group-hover:border-radar-red/30">
            <span className="text-xs font-bold text-gray-400 uppercase">Annual Inflation</span>
            {!indicatorsLoaded ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
            ) : inflation != null ? (
              <span className="text-sm text-radar-red font-mono font-bold">
                {inflation.toFixed(1)}%
              </span>
            ) : (
              <span className="text-sm text-gray-600 font-mono">—</span>
            )}
          </div>
          {expandedSection === 'inflation' && (
            <div className="p-3 bg-radar-panel/20 border border-radar-border text-[9px] text-gray-400 leading-relaxed animate-in fade-in duration-200 space-y-1">
              {inflation != null ? (
                <>
                  <p className="italic">
                    Ethiopia annual CPI at{' '}
                    <span className="text-radar-red font-bold not-italic">{inflation.toFixed(1)}%</span>
                    {' '}— classified as{' '}
                    <span className="font-bold not-italic">{inflationLabel}</span>.
                    {inflation >= 15
                      ? ' Food basket and fuel costs under significant pressure.'
                      : ' Price environment relatively contained.'}
                  </p>
                  <p className="text-[8px] text-gray-600 font-mono not-italic">
                    Source: World Bank · FP.CPI.TOTL.ZG (annual)
                  </p>
                </>
              ) : (
                <p className="italic text-gray-600">
                  Inflation data unavailable — awaiting World Bank sync.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Sentiment Pulse ─────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-radar-border/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-widest text-white">
              Sentiment Pulse
            </h3>
            {!indicatorsLoaded ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
            ) : (
              <span className={`text-[10px] font-mono font-bold ${sentiment != null ? 'text-radar-red' : 'text-gray-600'}`}>
                {sentiment != null ? sentiment.toFixed(2) : '—'}
              </span>
            )}
          </div>
          <div className="w-full bg-radar-panel h-2 overflow-hidden border border-radar-border/30 relative">
            {sentiment != null && (
              <div
                className="bg-radar-red h-full transition-all duration-1000 absolute top-0"
                style={{
                  width: `${Math.min(50, Math.abs(sentiment) * 5)}%`,
                  left:  sentiment < 0 ? `${50 - Math.min(50, Math.abs(sentiment) * 5)}%` : '50%',
                }}
              />
            )}
            <div className="absolute top-0 left-1/2 w-px h-full bg-gray-600" />
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
