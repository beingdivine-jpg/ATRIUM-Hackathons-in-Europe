import os, requests, json

# 1. Load secrets and print status (without showing the actual key for security)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
HANDSHAKE_TOKEN = os.getenv("HARVESTER_SECRET")

print(f"Checking configuration...")
if not SUPABASE_URL: print("!! Missing SUPABASE_URL")
if not SUPABASE_ANON_KEY: print("!! Missing SUPABASE_ANON_KEY")
if not HANDSHAKE_TOKEN: print("!! Missing HARVESTER_SECRET")

def harvest_signals():
    print("Scouting European Hackathons via Devpost...")
    url = "https://devpost.com/api/hackathons?challenge_type=upcoming&location=Europe"
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json().get('hackathons',)
        print(f"Found {len(data)} events.")
        return data
    except Exception as e:
        print(f"Scouting failed: {e}")
        return None

def send_to_atrium(data):
    # Ensure URL is clean
    endpoint = f"{SUPABASE_URL.rstrip('/')}/functions/v1/ingest-signal"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "X-Atrium-Handshake": HANDSHAKE_TOKEN
    }
    
    # Format the data for your new 'competitions' table
    formatted_data =
    for item in data:
        formatted_data.append({
            "title": item.get("title"),
            "timeline_date": item.get("submission_period_dates"),
            "reward_pool": item.get("prize_amount", "€0"),
            "venue_location": item.get("city_state", "Europe"),
            "provenance_link": item.get("url"),
            "competition_type": "hackathon",
            "source_signal": "via Devpost"
        })

    try:
        print("Sending data to Atrium Vault...")
        response = requests.post(endpoint, headers=headers, json=formatted_data)
        print(f"Vault Response: {response.status_code}")
        if response.status_code > 299:
            print(f"Error Details: {response.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    if SUPABASE_URL and HANDSHAKE_TOKEN:
        events = harvest_signals()
        if events:
            send_to_atrium(events)
    else:
        print("Script stopped: Configuration is incomplete.")
