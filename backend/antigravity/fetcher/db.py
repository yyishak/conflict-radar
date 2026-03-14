import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def store_event(event_data: dict):
    """
    Store an event in the Supabase 'events' table.
    expected schema: id (uuid), source (text), type (text), location (text), 
    description (text), risk_level (int), latitude (float), longitude (float), 
    metadata (jsonb), created_at (timestamp)
    """
    try:
        response = supabase.table("events").insert(event_data).execute()
        return response
    except Exception as e:
        print(f"Error storing event in Supabase: {e}")
        return None

def store_indicator(indicator_data: dict):
    """
    Store an indicator (like Vibe Check or Macro indicators) in 'indicators' table.
    expected schema: id (uuid), name (text), value (float), category (text), 
    metadata (jsonb), created_at (timestamp)
    """
    try:
        response = supabase.table("indicators").insert(indicator_data).execute()
        return response
    except Exception as e:
        print(f"Error storing indicator in Supabase: {e}")
        return None
