import requests
import os
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

# Using NewsData.io as it has good country filtering
NEWSDATA_API_KEY = os.environ.get("NEWSDATA_API_KEY")
NEWSDATA_URL = "https://newsdata.io/api/1/news"

def fetch_ethiopia_news():
    """
    Fetch latest headlines from Ethiopian sources.
    """
    if not NEWSDATA_API_KEY:
        print("NewsData API key missing. Skipping...")
        return
        
    params = {
        "apikey": NEWSDATA_API_KEY,
        "country": "et",
        "language": "en,am"
    }
    
    try:
        response = requests.get(NEWSDATA_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        results = data.get("results", [])
        for article in results:
            title = article.get("title")
            description = article.get("description") or ""
            
            # Simple sentiment logic for news
            category = "news_tension"
            risk = calculate_risk_level(category)
            
            payload = {
                "source": "NewsData.io",
                "type": "News Update",
                "location": "Ethiopia",
                "description": title,
                "risk_level": risk,
                "latitude": 9.145,
                "longitude": 40.489,
                "metadata": {
                    "link": article.get("link"),
                    "pubDate": article.get("pubDate"),
                    "source_id": article.get("source_id"),
                    "sentiment": "Neutral" # Placeholder for actual sentiment analysis
                }
            }
            store_event(payload)
            
        print(f"Stored {len(results)} news articles.")
    except Exception as e:
        print(f"Error fetching news: {e}")

if __name__ == "__main__":
    fetch_ethiopia_news()
