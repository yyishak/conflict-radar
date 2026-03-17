import { NextResponse } from 'next/server';

// Symbols: WTI Crude, Brent Crude, Natural Gas, Gold (for hedging context)
const SYMBOLS = ['CL=F', 'BZ=F', 'NG=F', 'GC=F'];

const SYMBOL_NAMES: Record<string, string> = {
  'CL=F': 'WTI Crude Oil',
  'BZ=F': 'Brent Crude',
  'NG=F': 'Natural Gas',
  'GC=F': 'Gold',
};

const SYMBOL_UNITS: Record<string, string> = {
  'CL=F': 'USD/bbl',
  'BZ=F': 'USD/bbl',
  'NG=F': 'USD/MMBtu',
  'GC=F': 'USD/oz',
};

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    next: { revalidate: 60 }, // cache for 60s
  });

  if (!res.ok) throw new Error(`Yahoo Finance: ${res.status} for ${symbol}`);

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta;
  const price: number = meta.regularMarketPrice ?? meta.previousClose;
  const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    name: SYMBOL_NAMES[symbol] ?? symbol,
    unit: SYMBOL_UNITS[symbol] ?? 'USD',
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePct: +changePct.toFixed(2),
    currency: meta.currency ?? 'USD',
  };
}

export async function GET() {
  const results = await Promise.allSettled(SYMBOLS.map(fetchQuote));

  const quotes = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    // Graceful fallback — return null price so client can show "N/A"
    return {
      symbol: SYMBOLS[i],
      name: SYMBOL_NAMES[SYMBOLS[i]],
      unit: SYMBOL_UNITS[SYMBOLS[i]],
      price: null,
      change: null,
      changePct: null,
      currency: 'USD',
      error: true,
    };
  });

  return NextResponse.json(
    { quotes, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } },
  );
}
