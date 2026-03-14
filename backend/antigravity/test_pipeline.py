import urllib.request
import json
import time
import random
import uuid

URL = "http://localhost:8000/ingest"

def get_unique_ping(category):
    uid = str(uuid.uuid4())[:8]
    if category == "Kinetic":
        return {
            "source": "Telegram OSINT",
            "text": f"MASSIVE EXPLOSION reported near the oil refinery in the city outskirts. Fire spreading. Unique Event ID: {uid}",
            "url": "https://t.me/osint_feed"
        }
    elif category == "Political":
        return {
            "source": "Twitter / X",
            "text": f"Diplomatic talks have stalled. Sanctions might be incoming tomorrow morning. Unique ID: {uid}",
            "url": "https://x.com/news/1"
        }
    else:
        return {
            "source": "Ground Sources",
            "text": f"Troop movements spotted near the border crossing. Heavy tactical machinery moving. UID: {uid}",
            "url": "https://news.local"
        }

def send_ping(payload, name):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(URL, data=data, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        print(f"Sent: {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")

def main():
    print("Testing Ingestor pipeline with UNIQUE events...")
    send_ping(get_unique_ping("Kinetic"), "Event 1 (Kinetic)")
    time.sleep(1)
    send_ping(get_unique_ping("Political"), "Event 2 (Political)")
    time.sleep(1)
    send_ping(get_unique_ping("Tactical"), "Event 3 (Tactical)")
    print("All test events dispatched.")

if __name__ == "__main__":
    main()
