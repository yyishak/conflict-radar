import time
import requests
from backend.antigravity.fetcher.db import store_indicator

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"


def fetch_gdelt_vibe():
    """
    Query GDELT for the 'Tone' of news in Ethiopia to provide a sentiment vibe score.
    Includes exponential backoff on 429 rate-limit responses.
    """
    params = {
        "query":      "country:ET",
        "mode":       "ArtList",
        "maxrecords": 50,
        "format":     "json",
    }

    max_retries = 3
    delay = 10  # seconds

    for attempt in range(max_retries):
        try:
            response = requests.get(GDELT_DOC_API, params=params, timeout=20)

            if response.status_code == 429:
                wait = delay * (2 ** attempt)
                print(f"GDELT rate limited (429) — waiting {wait}s before retry {attempt + 1}/{max_retries}")
                time.sleep(wait)
                continue

            response.raise_for_status()
            data = response.json()

            articles = data.get("articles", [])
            if not articles:
                print("GDELT: no articles returned.")
                return

            avg_tone = sum(float(a.get("tone", 0)) for a in articles) / len(articles)

            store_indicator({
                "name":     "Social Sentiment Pulse",
                "value":    round(avg_tone, 2),
                "category": "sentiment",
                "metadata": {
                    "article_count": len(articles),
                    "source":        "GDELT",
                    "trend":         "positive" if avg_tone > 0 else "negative",
                },
            })
            print(f"GDELT: stored vibe score {avg_tone:.2f} from {len(articles)} articles.")
            return

        except Exception as e:
            print(f"Error fetching GDELT data (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(delay * (2 ** attempt))

    print("GDELT: all retries exhausted — skipping this pulse.")


if __name__ == "__main__":
    fetch_gdelt_vibe()
