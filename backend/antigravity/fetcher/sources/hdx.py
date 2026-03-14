import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

# Using HDX search API instead of python-hdx library for simplicity in this script
HDX_SEARCH_URL = "https://data.humdata.org/api/3/action/package_search"

def fetch_hdx_ethiopia_datasets():
    """
    Search for Ethiopia conflict-related datasets on HDX.
    Note: HDX is more about files (csv/xlsx), so we link to them as events or indicators.
    """
    params = {
        "q": 'organization:acled AND country:ethiopia AND title:"Conflict Data"',
        "rows": 5
    }
    
    try:
        response = requests.get(HDX_SEARCH_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        results = data.get("result", {}).get("results", [])
        for dataset in results:
            title = dataset.get("title")
            risk = calculate_risk_level("news_tension")
            
            payload = {
                "source": "HDX",
                "type": "Dataset Update",
                "location": "Ethiopia",
                "description": f"Dataset: {title}",
                "risk_level": risk,
                "latitude": 9.145,
                "longitude": 40.489,
                "metadata": {
                    "id": dataset.get("id"),
                    "name": dataset.get("name"),
                    "url": f"https://data.humdata.org/dataset/{dataset.get('name')}",
                    "resources": dataset.get("resources")
                }
            }
            store_event(payload)
            
        print(f"Logged {len(results)} HDX datasets.")
    except Exception as e:
        print(f"Error fetching HDX data: {e}")

if __name__ == "__main__":
    fetch_hdx_ethiopia_datasets()
