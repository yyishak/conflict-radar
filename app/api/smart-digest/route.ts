import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Server-side in-memory cache (survives warm invocations) ──────────────────
let cachedSummary: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Supabase admin client (server-only) ───────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Persist the digest to Supabase so it survives serverless cold-starts ──────
async function persistDigest(text: string) {
  try {
    await sb.from('indicators').insert({
      name: 'SMART_DIGEST',
      value: 1,
      category: 'Intelligence',
      metadata: { content: text, generatedAt: new Date().toISOString() },
    });
  } catch { /* non-fatal */ }
}

// ── Read last persisted digest from Supabase ──────────────────────────────────
async function readPersistedDigest(): Promise<{ text: string; generatedAt: string } | null> {
  try {
    const res = await sb
      .from('indicators')
      .select('metadata, created_at')
      .eq('name', 'SMART_DIGEST')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (res.data?.metadata?.content) {
      return {
        text: res.data.metadata.content as string,
        generatedAt: res.data.metadata.generatedAt ?? res.data.created_at,
      };
    }
  } catch { /* table may not have a row yet */ }
  return null;
}

// ── Rule-based digest — generated from raw data, no AI needed ─────────────────
function buildRuleBasedDigest(events: any[], indicators: any[]): string {
  if (!events.length && !indicators.length) {
    return 'Ethiopia intelligence pulse active. Awaiting event data from backend fetcher — digest will auto-generate once signals accumulate.';
  }

  const byType: Record<string, number> = {};
  const recentLocs: string[] = [];
  for (const e of events.slice(0, 20)) {
    const t = (e.type ?? 'General').split(' ')[0];
    byType[t] = (byType[t] ?? 0) + 1;
    if (e.location && !recentLocs.includes(e.location)) recentLocs.push(e.location);
  }

  const topType  = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const locList  = recentLocs.slice(0, 3).join(', ');

  const getInd = (key: string) =>
    indicators.find(i => (i.name ?? '').toLowerCase().includes(key.toLowerCase()))?.value ?? null;

  const inflation  = getInd('INFLATION');
  const etb        = getInd('ETB_USD_OFFICIAL');
  const sentiment  = getInd('Social Sentiment');

  const parts: string[] = [];

  if (topType) {
    parts.push(
      `${topType[1]} ${topType[0].toLowerCase()} event${topType[1] > 1 ? 's' : ''} recorded across ${locList || 'monitored zones'}.`,
    );
  }

  if (etb) {
    parts.push(`ETB/USD official rate at ${Number(etb).toFixed(2)}.`);
  }

  if (inflation) {
    const lvl = Number(inflation) >= 30 ? 'severe' : Number(inflation) >= 15 ? 'elevated' : 'moderate';
    parts.push(`Annual inflation ${lvl} at ${Number(inflation).toFixed(1)}%.`);
  }

  if (sentiment != null) {
    const mood = Number(sentiment) > 0 ? 'improving' : Number(sentiment) < -2 ? 'tense' : 'mixed';
    parts.push(`Social sentiment pulse ${mood} (${Number(sentiment).toFixed(1)}).`);
  }

  parts.push('All map layers and indicators remain live.');

  return parts.join(' ');
}

export async function GET() {
  try {
    // 1. Serve in-memory cache if still warm
    if (cachedSummary && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        summary: cachedSummary,
        generatedAt: new Date(cachedAt).toISOString(),
        cached: true,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Fetch live data regardless (needed for rule-based fallback too)
    const [eventsRes, indicatorsRes] = await Promise.all([
      sb.from('events')
        .select('source, type, location, description, risk_level, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      sb.from('indicators')
        .select('name, value, category, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const events     = eventsRes.data     ?? [];
    const indicators = indicatorsRes.data ?? [];

    // 3. Try Gemini if key is present
    if (apiKey) {
      const prompt = `You are an Ethiopia-focused strategic risk analyst.

Using ONLY the structured data below, write a concise 3–4 sentence intelligence digest about Ethiopia's current situation.

Rules:
- Focus on Ethiopia; mention neighbouring countries only if directly relevant.
- Blend conflict, political, humanitarian, and economic signals into one narrative.
- Be neutral and decision-useful; no sensationalism.
- Do NOT invent facts not present in the data.

Recent events (${events.length}):
${events.map(e => `[${e.created_at?.slice(0, 10)}] ${e.type} | ${e.location} | ${e.description?.slice(0, 100)}`).join('\n')}

Key indicators:
${indicators.map(i => `${i.name}: ${i.value}`).join('\n')}`;

      // Try gemini-2.0-flash, then fall back to gemini-1.5-flash on 429
      const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const model of models) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
            }),
          },
        );

        if (geminiRes.ok) {
          const json: any = await geminiRes.json();
          const text = (json.candidates?.[0]?.content?.parts ?? [])
            .map((p: any) => p.text)
            .filter(Boolean)
            .join(' ')
            .trim();

          if (text) {
            cachedSummary = text;
            cachedAt      = Date.now();
            // Persist to Supabase so cold-starts can recover it
            await persistDigest(text);
            return NextResponse.json({
              summary: text,
              generatedAt: new Date().toISOString(),
            });
          }
        } else if (geminiRes.status !== 429) {
          // Non-rate-limit error — stop trying models
          console.error(`Gemini [${model}]:`, geminiRes.status);
          break;
        }
        // 429 → try next model
      }
    }

    // 4. Gemini failed — serve last Supabase-persisted digest if available
    const persisted = await readPersistedDigest();
    if (persisted) {
      cachedSummary = persisted.text;
      cachedAt      = Date.now();
      return NextResponse.json({
        summary:     persisted.text,
        generatedAt: persisted.generatedAt,
        cached:      true,
      });
    }

    // 5. Absolute fallback — rule-based digest from live data
    const fallback = buildRuleBasedDigest(events, indicators);
    return NextResponse.json({ summary: fallback, generatedAt: new Date().toISOString() });

  } catch (err) {
    console.error('Smart digest route error:', err);
    return NextResponse.json({
      summary: 'Ethiopia intelligence pulse active. Live radar, indicators, and map layers remain operational.',
      generatedAt: new Date().toISOString(),
    });
  }
}
