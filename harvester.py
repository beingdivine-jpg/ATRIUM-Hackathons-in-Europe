import os, requests, json

# Load secrets from the GitHub environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
HANDSHAKE_TOKEN = os.getenv("HARVESTER_SECRET")

def harvest_signals():
    print("Scouting European Hackathons...")
    # This targets the Devpost API for upcoming European events
    url = "https://devpost.com/api/hackathons?challenge_type=upcoming&location=Europe"
    
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json().get('hackathons',)
        
        findings =
        for item in data:
            findings.append({
                "title": item.get("title"),
                "timeline_date": item.get("submission_period_dates"),
                "reward_pool": item.get("prize_amount", "€0"),
                "patron_entities": [item.get("host_name")],
                "venue_location": item.get("city_state", "Europe"),
                "provenance_link": item.get("url"),
                "competition_type": "hackathon",
                "is_remote": "online" in item.get("challenge_type", "").lower(),
                "source_signal": "via Devpost"
            })
        return findings
    except Exception as e:
        print(f"Error scouting: {e}")
        return

def send_to_vault(data):
    # This calls your secure Edge Function in Lovable Cloud
    clean_url = SUPABASE_URL.rstrip('/')
    endpoint = f"{clean_url}/functions/v1/ingest-signal"
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "X-Atrium-Handshake": HANDSHAKE_TOKEN
    }
    
    try:
        response = requests.post(endpoint, headers=headers, json=data)
        print(f"The Vault responded with Status: {response.status_code}")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    if not SUPABASE_URL or not HANDSHAKE_TOKEN:
        print("CRITICAL ERROR: Secrets are not configured in GitHub.")
    else:
        events = harvest_signals()
        if events:
            send_to_vault(events)
