import os, requests, json

# 1. Load secrets from the GitHub Actions environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
HANDSHAKE_TOKEN = os.getenv("HARVESTER_SECRET")

print("Checking configuration...")
if not SUPABASE_URL: print("!! Missing SUPABASE_URL")
if not SUPABASE_ANON_KEY: print("!! Missing SUPABASE_ANON_KEY")
if not HANDSHAKE_TOKEN: print("!! Missing HARVESTER_SECRET")

def harvest_signals():
    print("Scouting elite European Hackathons & Buildathons via Devpost...")
    # This targets the Devpost API for upcoming European events
    url = "https://devpost.com/api/hackathons?challenge_type=upcoming&location=Europe"
    
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json().get('hackathons',)
        print(f"Successfully scouted {len(data)} potential signals.")
        return data
    except Exception as e:
        print(f"Scouting error: {e}")
        return None

def send_to_atrium(data):
    # This calls your secure Edge Function middleman in Atrium Europe
    clean_url = SUPABASE_URL.rstrip('/')
    endpoint = f"{clean_url}/functions/v1/ingest-signal"
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "X-Atrium-Handshake": HANDSHAKE_TOKEN
    }
    
    # 2. Format the data for your new 'competitions' table and Museum Plaque UI
    formatted_data =
    for item in data:
        # Extracts only the 6 keys required for your elite minimalist layout
        formatted_data.append({
            "title": item.get("title"),
            "timeline_date": item.get("submission_period_dates"),
            "reward_pool": item.get("prize_amount", "€0"),
            "venue_location": item.get("city_state", "Europe"),
            "provenance_link": item.get("url"),
            "competition_type": "hackathon",
            "source_signal": "via Devpost Intelligence"
        })

    try:
        print(f"Depositing {len(formatted_data)} signals into Atrium's Vault...")
        response = requests.post(endpoint, headers=headers, json=formatted_data)
        print(f"Vault Response Status: {response.status_code}")
        if response.status_code > 299:
            print(f"Error Details: {response.text}")
    except Exception as e:
        print(f"Connection to Atrium failed: {e}")

if __name__ == "__main__":
    if SUPABASE_URL and HANDSHAKE_TOKEN:
        signals = harvest_signals()
        if signals:
            send_to_atrium(signals)
    else:
        print("Script halted: Configuration is incomplete. Check your GitHub Secrets.")
