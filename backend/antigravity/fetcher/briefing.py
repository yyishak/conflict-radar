from backend.antigravity.fetcher.db import supabase, store_indicator


def generate_situational_briefing():
    """
    Aggregates latest events + indicators into a succinct situational briefing.
    Heuristic engine — designed to be swapped for Gemini/GPT later.
    """
    print("Generating situational briefing...")

    # 1. Fetch latest events
    try:
        events_res = (
            supabase.table("events")
            .select("*")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        events = events_res.data if events_res.data else []
    except Exception as e:
        print(f"  [briefing] Could not fetch events: {e}")
        events = []

    # 2. Fetch latest indicators (table may not exist yet)
    try:
        indicators_res = (
            supabase.table("indicators")
            .select("*")
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )
        indicators = indicators_res.data if indicators_res.data else []
    except Exception as e:
        print(f"  [briefing] Could not fetch indicators (table missing?): {e}")
        indicators = []

    if not events and not indicators:
        briefing = (
            "Intelligence scanning in progress. "
            "No critical escalations detected in the current sector."
        )
        _store(briefing)
        return briefing

    summary_parts = []

    # Conflict focus
    conflict_events = [
        e for e in events
        if e.get("source") in ("ACLED", "Scraper") or
           "conflict" in (e.get("type") or "").lower()
    ]
    if conflict_events:
        loc = conflict_events[0].get("location") or "the region"
        summary_parts.append(
            f"CONFLICT: {len(conflict_events)} incident(s) reported. Focus area: {loc}."
        )
    else:
        summary_parts.append("CONFLICT: Kinetic activity at baseline levels.")

    # Sentiment / stability
    sentiment = next(
        (i for i in indicators if "Sentiment" in (i.get("name") or "")), None
    )
    if sentiment:
        val = sentiment.get("value", 0)
        state = "STABLE" if val > 0 else "DEGRADING"
        summary_parts.append(f"STABILITY: Regional pulse is {state} ({val:+.1f}).")

    # Hazard focus
    hazard_events = [e for e in events if e.get("source") == "GDACS"]
    if hazard_events:
        summary_parts.append(f"HAZARDS: {len(hazard_events)} active natural hazard alert(s).")

    full_briefing = " | ".join(summary_parts) + " [INTEL-CORE-V1]"

    _store(full_briefing)
    print(f"Briefing generated: {full_briefing}")
    return full_briefing


def _store(content: str):
    try:
        store_indicator({
            "name": "SITUATIONAL_BRIEFING",
            "value": 1.0,
            "category": "Intelligence",
            "metadata": {"content": content},
        })
    except Exception as e:
        print(f"  [briefing] Could not store briefing indicator: {e}")


if __name__ == "__main__":
    generate_situational_briefing()
