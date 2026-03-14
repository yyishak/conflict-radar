from backend.antigravity.fetcher.db import supabase, store_indicator
import re

# Keyword weighting for sentiment
SENTIMENT_WEIGHTS = {
    "war": -5, "battle": -5, "killing": -6, "massacre": -8, "violence": -4, "clash": -3,
    "tension": -2, "protest": -2, "unrest": -3, "instability": -3,
    "fire": -2, "drought": -4, "flood": -4, "earthquake": -5, "disaster": -5, "famine": -7,
    "peace": 4, "stable": 3, "growth": 3, "agreement": 5, "ceasefire": 6,
    "investment": 2, "recovery": 3, "aid": 2, "humanitarian": 1
}

def analyze_sentiment(text):
    """
    Calculate a sentiment score from -10 to 10 based on keyword intensity.
    """
    if not text:
        return 0
    
    score = 0
    words = re.findall(r'\w+', text.lower())
    
    for word in words:
        if word in SENTIMENT_WEIGHTS:
            score += SENTIMENT_WEIGHTS[word]
            
    # Normalize to -10 to 10 scale
    normalized = max(-10, min(10, score))
    return normalized

def process_latest_sentiment():
    """
    Pull latest events, calculate sentiment pulse, and store as indicator.
    """
    try:
        # Fetch last 50 events
        res = supabase.table('events').select('description').order('created_at', desc=True).limit(50).execute()
        events = res.data if res.data else []
        
        if not events:
            return
            
        total_score = 0
        for ev in events:
            total_score += analyze_sentiment(ev.get('description', ''))
            
        avg_vibe = total_score / len(events)
        
        # Store as indicator
        # Note: Indicator table expects {name, value, unit, metadata}
        # Based on previous code: store_indicator({"name": "Social Sentiment Pulse", "value": round(avg_vibe, 2), ...})
        store_indicator({
            "name": "Social Sentiment Pulse",
            "value": round(avg_vibe, 1),
            "category": "Sentiment",
            "metadata": {"trend": "calculating"}
        })
        
        print(f"Calculated Social Sentiment Pulse: {round(avg_vibe, 1)}")
        
    except Exception as e:
        print(f"Error processing sentiment: {e}")

if __name__ == "__main__":
    process_latest_sentiment()
