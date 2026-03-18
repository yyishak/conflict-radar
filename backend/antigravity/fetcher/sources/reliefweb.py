import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

RELIEFWEB_API_URL = "https://api.reliefweb.int/v1/reports"

# Ethiopia ISO code for ReliefWeb filter
ETHIOPIA_COUNTRY_ID = 86

def fetch_reliefweb_ethiopia():
    """
    Fetch humanitarian reports on Ethiopia from ReliefWeb.
    Uses the correct filter format for ReliefWeb API v1.
    """
    payload = {
        "appname": "conflict-radar",
        "limit":   20,
        "filter": {
            "field":  "primary_country.id",
            "value":  ETHIOPIA_COUNTRY_ID,
        },
        "fields": {
            "include": ["title", "date", "source", "primary_country", "url_alias"],
        },
        "sort": ["date.created:desc"],
    }

    try:
        response = requests.post(
            RELIEFWEB_API_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent":   "ConflictRadar/1.0 (conflict monitoring research)",
            },
            timeout=20,
        )

        if response.status_code == 403:
            print("ReliefWeb 403: switching to GET fallback.")
            response = requests.get(
                RELIEFWEB_API_URL,
                params={
                    "appname":          "conflict-radar",
                    "filter[field]":    "primary_country",
                    "filter[value][]":  "Ethiopia",
                    "limit":            20,
                    "profile":          "list",
                },
                headers={"User-Agent": "ConflictRadar/1.0"},
                timeout=20,
            )

        response.raise_for_status()
        data = response.json()

        reports = data.get("data", [])
        stored = 0
        for report in reports:
            fields = report.get("fields", {})
            title  = fields.get("title", "")
            if not title:
                continue

            t = title.lower()
            if   "flood"                         in t: category = "hazard_flood"
            elif "drought"                        in t: category = "hazard_drought"
            elif "displacement" in t or "idp" in t:    category = "displacement"
            else:                                       category = "news_tension"

            risk = calculate_risk_level(category)
            date_str = (fields.get("date") or {}).get("created", "")

            store_event({
                "source":      "ReliefWeb",
                "type":        "Humanitarian Report",
                "location":    "Ethiopia",
                "description": title,
                "risk_level":  risk,
                "latitude":    9.145,
                "longitude":   40.489,
                "url":         f"https://reliefweb.int{fields.get('url_alias', '')}",
                "metadata":    {"date": date_str, "source_org": fields.get("source", [])},
            })
            stored += 1

        print(f"ReliefWeb: stored {stored} humanitarian reports.")

    except Exception as e:
        print(f"Error fetching ReliefWeb data: {e}")


if __name__ == "__main__":
    fetch_reliefweb_ethiopia()
