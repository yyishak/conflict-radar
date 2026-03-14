from datetime import datetime
import pandas as pd

def calculate_risk_level(category: str, detail_score: float = 0.0) -> int:
    """
    Calculate a risk level (1-5) based on event category and optional detail score.
    1: Minimal, 2: low, 3: moderate, 4: high, 5: critical
    """
    category_base = {
        "battle": 5,
        "violence_against_civilians": 5,
        "explosion": 5,
        "protest": 3,
        "riot": 4,
        "hazard_flood": 4,
        "hazard_earthquake": 3,
        "hazard_drought": 3,
        "news_tension": 2,
        "displacement": 4
    }
    
    base_score = category_base.get(category.lower(), 1)
    # Adjustment logic can go here (e.g., scale based on fatalities or magnitude)
    
    return min(5, max(1, base_score))

def clean_event(raw_data: dict, source: str) -> dict:
    """
    Normalize raw data from different sources into a unified event schema.
    """
    # This will be expanded as we implement individual fetchers
    processed = {
        "source": source,
        "created_at": datetime.now().isoformat(),
        "metadata": raw_data
    }
    return processed
