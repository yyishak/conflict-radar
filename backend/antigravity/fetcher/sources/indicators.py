import requests
from backend.antigravity.fetcher.db import store_indicator

WB_API_URL = "http://api.worldbank.org/v2/country/ETH/indicator"

def fetch_indicators():
    """
    Fetch macro-indicators (inflation, food prices) and IOM displacement stats.
    """
    # 1. World Bank - Inflation (FP.CPI.TOTL.ZG)
    try:
        # Get latest inflation data
        response = requests.get(f"{WB_API_URL}/FP.CPI.TOTL.ZG", params={"format": "json", "per_page": 1})
        response.raise_for_status()
        data = response.json()
        
        if len(data) > 1 and data[1]:
            latest_val = data[1][0]
            store_indicator({
                "name": "Inflation Rate (Annual %)",
                "value": float(latest_val.get("value")),
                "category": "macro",
                "metadata": {"date": latest_val.get("date")}
            })
            print(f"Stored inflation indicator.")
    except Exception as e:
        print(f"Error fetching WB data: {e}")

    # 2. IOM DTM (Displacement Tracking Matrix)
    # Note: IOM DTM often requires specific API keys or scraping.
    # For this implementation, we'll log a placeholder or fetch from a known public endpoint if available.
    print("IOM DTM fetcher: Placeholder logged (Requires specific endpoint).")

if __name__ == "__main__":
    fetch_indicators()
