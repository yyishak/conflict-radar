import os
import sys

# Add the parent directory to sys.path so we can import the fetcher module
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from backend.antigravity.fetcher.sources.gdacs import fetch_gdacs_ethiopia
from backend.antigravity.fetcher.sources.reliefweb import fetch_reliefweb_ethiopia
from backend.antigravity.fetcher.sources.hdx import fetch_hdx_ethiopia_datasets
from backend.antigravity.fetcher.sources.gdelt import fetch_gdelt_vibe
from backend.antigravity.fetcher.sources.indicators import fetch_indicators

print("--- Starting Dry Run of Fetchers ---")

print("\n1. Testing GDACS (Disaster)...")
fetch_gdacs_ethiopia()

print("\n2. Testing ReliefWeb (Humanitarian)...")
fetch_reliefweb_ethiopia()

print("\n3. Testing HDX (Conflict Datasets)...")
fetch_hdx_ethiopia_datasets()

print("\n4. Testing GDELT (Sentiment)...")
fetch_gdelt_vibe()

print("\n5. Testing Indicators (WB/Macro)...")
fetch_indicators()

print("\n--- Dry Run Completed ---")
