import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ── Server-side cache: re-use Gemini response for 15 minutes ─────────────
// This prevents burning through the free-tier quota on every page load.
let cachedSummary: string | null = null;
let cachedAt: number = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  try {
    // Return cached digest if still fresh
    if (cachedSummary && Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        summary: cachedSummary,
        generatedAt: new Date(cachedAt).toISOString(),
        cached: true,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary:
          'Gemini API key is not configured on the server. Live digest is unavailable, but core indicators and map layers remain active.',
      });
    }

    // Fetch only the most recent & relevant data — keeps the prompt small
    const [eventsRes, indicatorsRes] = await Promise.all([
      supabase
        .from('events')
        .select('source, type, location, description, risk_level, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('indicators')
        .select('name, value, category, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const events = eventsRes.data ?? [];
    const indicators = indicatorsRes.data ?? [];

    const prompt = `You are an Ethiopia-focused strategic risk analyst.

Using ONLY the structured data below, write a concise 3–4 sentence intelligence digest about Ethiopia's current situation.

Rules:
- Focus on Ethiopia; mention neighbouring countries only if directly relevant.
- Blend conflict, political, humanitarian, and economic signals into one narrative.
- Be neutral and decision-useful; no sensationalism.
- Do NOT invent facts not present in the data.

Recent events (${events.length}):
${events.map(e => `[${e.created_at?.slice(0,10)}] ${e.type} | ${e.location} | ${e.description?.slice(0,120)}`).join('\n')}

Key indicators:
${indicators.map(i => `${i.name}: ${i.value}`).join('\n')}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 250 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText.slice(0, 300));

      // If rate limited, serve the last cached result if available
      if (geminiRes.status === 429 && cachedSummary) {
        return NextResponse.json({
          summary: cachedSummary,
          generatedAt: new Date(cachedAt).toISOString(),
          cached: true,
        });
      }

      return NextResponse.json({
        summary:
          'Ethiopia digest temporarily unavailable (upstream API limit). Map layers and indicators remain live.',
      });
    }

    const json: any = await geminiRes.json();
    const summaryText =
      (json.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text)
        .filter(Boolean)
        .join(' ')
        .trim() || 'Ethiopia digest could not be generated from the current data snapshot.';

    // Update cache
    cachedSummary = summaryText;
    cachedAt = Date.now();

    return NextResponse.json({ summary: summaryText, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Smart digest route error:', err);
    return NextResponse.json({
      summary:
        'Ethiopia digest failed due to an internal error. Live radar and indicator panels remain available.',
    });
  }
}
