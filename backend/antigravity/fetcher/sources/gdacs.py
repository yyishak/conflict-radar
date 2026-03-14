import feedparser
import os
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"

def fetch_gdacs_ethiopia():
    """
    Listen to GDACS RSS feed and filter for Ethiopia events.
    """
    print(f"Fetching GDACS feed from {GDACS_RSS_URL}...")
    try:
        # feedparser uses requests or urllib2, but doesn't have a direct timeout easily accessible
        # We can fetch with requests first to ensure timeout
        resp = requests.get(GDACS_RSS_URL, timeout=10)
        resp.raise_for_status()
        
        feed = feedparser.parse(resp.content)
        ethiopia_events = []
        
        print(f"Parsed {len(feed.entries)} entries from GDACS.")
        
        for entry in feed.entries:
            # Removed Ethiopia-only filtering for global scope
            print(f"Processing incident: {entry.title}")
            risk = calculate_risk_level("hazard_disaster")
            
            lat = 0.0
            lng = 0.0
            if 'geo_lat' in entry:
                lat = float(entry.geo_lat)
                lng = float(entry.geo_long)
            elif 'georss_point' in entry:
                lat, lng = map(float, entry.georss_point.split())
            
            payload = {
                "source": "GDACS",
                "type": "Natural Hazard",
                "location": entry.title,
                "description": entry.description[:500] if entry.get('description') else "",
                "risk_level": risk,
                "latitude": lat,
                "longitude": lng,
                "metadata": {
                    "link": entry.link,
                    "published": getattr(entry, 'published', ''),
                    "summary": entry.get('summary', '')[:500]
                }
            }
            print(f"Storing GDACS event to Supabase...")
            store_event(payload)
            ethiopia_events.append(payload)
        
        print(f"Stored {len(ethiopia_events)} GDACS events.")
    except Exception as e:
        print(f"Error fetching GDACS data: {e}")

if __name__ == "__main__":
    fetch_gdacs_ethiopia()
