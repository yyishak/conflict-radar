import feedparser
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

FEEDS = [
    {"name": "Al Jazeera - Africa", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
    {"name": "BBC - Africa", "url": "http://feeds.bbci.co.uk/news/world/africa/rss.xml"},
    {"name": "Ethiopia Observer", "url": "https://www.ethiopiaobserver.com/feed/"},
    {"name": "Reuters - World", "url": "https://p.reuters.com/reuters/worldNews"}
]

def fetch_ground_truth():
    """
    Scrape various news RSS feeds for Ethiopia-related conflict and major events.
    """
    all_events = []
    
    for feed_info in FEEDS:
        print(f"Scraping {feed_info['name']}...")
        try:
            resp = requests.get(feed_info['url'], timeout=10)
            if resp.status_code != 200:
                continue
                
            feed = feedparser.parse(resp.content)
            
            for entry in feed.entries:
                title = entry.get('title', '')
                summary = entry.get('summary', entry.get('description', ''))
                
                # Keywords to filter for Ethiopia or War
                keywords = ["Ethiopia", "Addis Ababa", "Tigray", "Amhara", "Oromia", "Abiy", "War", "Conflict", "Fighting"]
                if any(k.lower() in title.lower() or k.lower() in summary.lower() for k in keywords):
                    
                    # Deduce category
                    category = "news_tension"
                    if any(w in title.lower() for w in ["war", "battle", "clash", "killed", "army", "militia"]):
                        category = "kinetic_conflict"
                    
                    risk = calculate_risk_level(category)
                    
                    # Basic location extraction from title
                    location = "Ethiopia"
                    for reg in ["Tigray", "Amhara", "Oromia", "Afar", "Somali", "Gambela", "Benishangul"]:
                        if reg.lower() in title.lower():
                            location = f"{reg}, Ethiopia"
                            break
                    
                    payload = {
                        "source": feed_info['name'],
                        "type": "Ground Truth Report",
                        "location": location,
                        "description": title,
                        "risk_level": risk,
                        "latitude": 9.145, # Default to center
                        "longitude": 40.489,
                        "metadata": {
                            "link": entry.link,
                            "published": getattr(entry, 'published', ''),
                            "full_text": summary[:1000]
                        }
                    }
                    store_event(payload)
                    all_events.append(payload)
                    
        except Exception as e:
            print(f"Error scraping {feed_info['name']}: {e}")
            
    print(f"Scraped {len(all_events)} ground-truth reports.")
    return all_events

if __name__ == "__main__":
    fetch_ground_truth()
