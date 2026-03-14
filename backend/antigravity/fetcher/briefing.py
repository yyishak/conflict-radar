from backend.antigravity.fetcher.db import supabase, store_indicator
import datetime

def generate_situational_briefing():
    """
    Aggregates latest events and indicators to generate a succinct 
    situational briefing. Uses heuristic templates for now, 
    designed to be replaced by Gemini API.
    """
    print("Generating situational briefing...")
    
    # 1. Fetch latest events
    events_res = supabase.table("events").select("*").order("created_at", { "ascending": False }).limit(5).execute()
    events = events_res.data if events_res.data else []
    
    # 2. Fetch latest indicators
    indicators_res = supabase.table("indicators").select("*").order("created_at", { "ascending": False }).limit(3).execute()
    indicators = indicators_res.data if indicators_res.data else []
    
    if not events and not indicators:
        return "Intelligence scanning in progress. No critical escalations detected in the current sector."

    # 3. Build heuristic summary
    summary_parts = []
    
    # War/Conflict focus
    war_events = [e for e in events if e.get('source') in ['ACLED', 'Scraper']]
    if war_events:
        summary_parts.append(f"CONFLICT: {len(war_events)} incidents reported. Focus in {war_events[0].get('location')}.")
    else:
        summary_parts.append("CONFLICT: Kinetic activity remains at baseline levels.")
        
    # Economic/Sentiment focus
    sentiment = next((i for i in indicators if "Sentiment" in i.get('name', '')), None)
    if sentiment:
        vibe = "STABLE" if sentiment.get('value', 0) > 0 else "DEGRADING"
        summary_parts.append(f"STABILITY: Regional pulse is {vibe} ({sentiment.get('value', 0)}).")
        
    # 4. Final Polish
    full_briefing = " | ".join(summary_parts) + " [INTEL-CORE-V1]"
    
    # 5. Store as an indicator of type 'Briefing'
    store_indicator({
        "name": "SITUATIONAL_BRIEFING",
        "value": 1.0, # Meta value
        "category": "Intelligence",
        "metadata": {"content": full_briefing}
    })
    
    print(f"Briefing Generated: {full_briefing}")
    return full_briefing

if __name__ == "__main__":
    generate_situational_briefing()
