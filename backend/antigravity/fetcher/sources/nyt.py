import os
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

NYT_API_KEY = os.environ.get("NYT_API_KEY")
NYT_TOP_STORIES_URL = "https://api.nytimes.com/svc/topstories/v2/world.json"


def fetch_nyt_world_conflict():
    """
    Fetch New York Times World top stories and store conflict-related ones.
    """
    if not NYT_API_KEY:
        print("NYT_API_KEY missing — skipping NYT fetch.")
        return

    try:
        resp = requests.get(NYT_TOP_STORIES_URL, params={"api-key": NYT_API_KEY}, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        results = data.get("results", [])
        stored = 0

        conflict_keywords = ["war", "conflict", "clash", "fighting", "battle", "attack", "military", "rebels"]

        for item in results:
            title = item.get("title", "")
            abstract = item.get("abstract", "")
            url = item.get("url", "")
            geo = item.get("geo_facet") or []

            text = f"{title} {abstract}".lower()
            if not any(k in text for k in conflict_keywords):
                continue

            category = "news_tension"
            if any(w in text for w in ["war", "battle", "clash", "attack", "airstrike", "offensive"]):
                category = "kinetic_conflict"

            risk = calculate_risk_level(category)

            location = ", ".join(geo) if geo else "Global"

            payload = {
                "source": "NYTimes World",
                "type": "Conflict News",
                "location": location,
                "description": title,
                "risk_level": risk,
                "latitude": 0.0,
                "longitude": 0.0,
                "metadata": {
                    "url": url,
                    "abstract": abstract,
                    "section": item.get("section"),
                    "subsection": item.get("subsection"),
                    "published_date": item.get("published_date"),
                    "des_facet": item.get("des_facet"),
                    "geo_facet": geo,
                },
            }
            store_event(payload)
            stored += 1

        print(f"NYTimes: stored {stored} conflict-related world stories.")

    except Exception as e:
        print(f"Error fetching NYTimes data: {e}")


if __name__ == "__main__":
    fetch_nyt_world_conflict()

