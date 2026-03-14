import requests
from backend.antigravity.fetcher.db import store_indicator

# GDELT Summary API for events in Ethiopia
GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

def fetch_gdelt_vibe():
    """
    Query GDELT for the 'Tone' of news in Ethiopia to provide a 'Vibe Check'.
    """
    params = {
        "query": "country:ET",
        "mode": "ToneChart",
        "format": "json"
    }
    
    try:
        # Note: GDELT has multiple APIs. ToneChart gives a distribution.
        # For a simple 'Vibe Score', we can query recent articles and average the tone.
        response = requests.get(GDELT_DOC_API, params={
            "query": "country:ET",
            "mode": "ArtList",
            "maxrecords": 50,
            "format": "json"
        })
        response.raise_for_status()
        data = response.json()
        
        articles = data.get("articles", [])
        if not articles:
            return
            
        avg_tone = sum(float(a.get("tone", 0)) for a in articles) / len(articles)
        
        indicator_payload = {
            "name": "Ethiopia Vibe Score (GDELT Tone)",
            "value": round(avg_tone, 2),
            "category": "sentiment",
            "metadata": {
                "article_count": len(articles),
                "trend": "neutral" # Placeholder
            }
        }
        store_indicator(indicator_payload)
        print(f"Stored GDELT Vibe Score: {avg_tone}")
        
    except Exception as e:
        print(f"Error fetching GDELT data: {e}")

if __name__ == "__main__":
    fetch_gdelt_vibe()
