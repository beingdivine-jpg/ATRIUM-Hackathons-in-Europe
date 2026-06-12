import os, requests, json
from datetime import datetime, timezone

# ── Secrets from environment ─────────────────────────────────────────────────
SUPABASE_URL      = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
HANDSHAKE_TOKEN   = os.getenv("HARVESTER_SECRET", "")

print("Checking configuration...")
if not SUPABASE_URL:      print("!! Missing SUPABASE_URL")
if not SUPABASE_ANON_KEY: print("!! Missing SUPABASE_ANON_KEY")
if not HANDSHAKE_TOKEN:   print("!! Missing HARVESTER_SECRET")

# ── Devpost scraper ──────────────────────────────────────────────────────────
DEVPOST_API = "https://devpost.com/api/hackathons"

EUROPEAN_KEYWORDS = [
    "europe", "european", "berlin", "london", "paris", "amsterdam",
    "stockholm", "barcelona", "lisbon", "dublin", "vienna", "warsaw",
    "prague", "budapest", "brussels", "munich", "hamburg", "zurich",
    "copenhagen", "helsinki", "milan", "rome", "madrid", "tallinn", "riga",
]

def is_european(item: dict) -> bool:
    """Return True if this hackathon is European (online-global events excluded)."""
    loc = (item.get("displayed_location") or {}).get("location", "").lower()
    title = (item.get("title") or "").lower()
    themes = " ".join(item.get("themes", [])).lower()
    text = f"{loc} {title} {themes}"
    return any(kw in text for kw in EUROPEAN_KEYWORDS)

def safe_date(raw: str | None) -> str | None:
    """Normalise partial date strings. Returns YYYY-MM-DD or None."""
    if not raw:
        return None
    # Devpost dates are like "Jun 12, 2026" or ISO strings
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # If none matched, just take the first 10 chars if it looks like ISO
    if len(raw) >= 10 and raw[4] == "-":
        return raw[:10]
    return None

def harvest_signals(max_pages: int = 5) -> list[dict]:
    """Page through Devpost's API collecting upcoming hackathons with EU presence."""
    print("Scouting European hackathons via Devpost...")
    results = []

    for page in range(1, max_pages + 1):
        params = {
            "challenge_type[]": "online",   # Devpost uses this key
            "page": page,
            "per_page": 24,
            "order_by": "deadline",
            "status[]": ["upcoming", "open"],
        }
        try:
            r = requests.get(DEVPOST_API, params=params, timeout=20,
                             headers={"Accept": "application/json",
                                      "User-Agent": "AtriumHarvester/2.0"})
            r.raise_for_status()
            payload = r.json()
        except Exception as e:
            print(f"  Page {page} fetch error: {e}")
            break

        hackathons = payload.get("hackathons", [])
        if not hackathons:
            break

        for item in hackathons:
            if not is_european(item):
                continue

            # ── Date parsing ─────────────────────────────────────────────────
            sub_dates   = item.get("submission_period_dates", "")
            # "Jun 12, 2026 - Jun 30, 2026" → split on " - "
            date_parts  = [p.strip() for p in sub_dates.split(" - ")] if sub_dates else []
            start_date  = safe_date(date_parts[0] if date_parts else None)
            end_date    = safe_date(date_parts[1] if len(date_parts) > 1 else None)

            if not start_date:
                continue  # skip items without a parseable date

            # ── Skip events that have already closed ─────────────────────────
            try:
                if datetime.strptime(start_date, "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                ) < datetime.now(tz=timezone.utc):
                    continue
            except ValueError:
                pass

            # ── Location ─────────────────────────────────────────────────────
            loc_obj  = item.get("displayed_location") or {}
            location = loc_obj.get("location") or "Europe"
            is_remote = (
                "online" in location.lower()
                or "remote" in location.lower()
                or "virtual" in location.lower()
                or item.get("challenge_type") == "online"
            )

            # ── Prize ─────────────────────────────────────────────────────────
            prize_raw = item.get("prize_amount") or "0"
            if isinstance(prize_raw, (int, float)):
                prize_str = f"€{int(prize_raw):,}"
            else:
                prize_str = str(prize_raw) if prize_raw else "€0"

            # ── URLs ──────────────────────────────────────────────────────────
            devpost_url = item.get("url") or ""
            # Prefer the hackathon's own website; fallback to devpost page
            website     = item.get("website_url") or devpost_url

            if not devpost_url:
                continue  # can't link to it at all

            # ── Organiser / tags ──────────────────────────────────────────────
            org   = item.get("organization_name") or None
            tags  = [t["id"] for t in (item.get("themes") or [])] or None

            results.append({
                "title":            item.get("title", "Untitled").strip(),
                "exhibition_date":  start_date,
                "end_date":         end_date,
                "reward_pool":      prize_str,
                "venue_location":   location,
                "provenance_link":  devpost_url,
                "application_link": website,          # ← required by edge fn
                "format_type":      "hackathon",
                "is_remote":        is_remote,
                "organizer":        org,
                "tags":             tags,
                "source_signal":    "Devpost Intelligence",
            })

        print(f"  Page {page}: {len(hackathons)} fetched, running EU total: {len(results)}")

    print(f"Scouting complete. {len(results)} European signals ready for deposit.")
    return results


# ── Send to Supabase edge function ───────────────────────────────────────────
def send_to_atrium(data: list[dict]) -> None:
    if not data:
        print("No signals to deposit.")
        return

    endpoint = f"{SUPABASE_URL}/functions/v1/ingest-signal"
    headers  = {
        "apikey":             SUPABASE_ANON_KEY,
        "Authorization":      f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type":       "application/json",
        "X-Atrium-Handshake": HANDSHAKE_TOKEN,
    }

    # Send in batches of 50 to stay well under the 6 MB edge-function limit
    BATCH = 50
    total_inserted  = 0
    total_archived  = 0
    total_dupes     = 0

    for i in range(0, len(data), BATCH):
        batch = data[i : i + BATCH]
        try:
            r = requests.post(endpoint, headers=headers,
                              data=json.dumps(batch), timeout=30)
            try:
                body = r.json()
            except Exception:
                body = {"raw": r.text}

            if r.status_code in (200, 201):
                total_inserted += body.get("inserted", 0)
                total_archived += body.get("auto_archived", 0)
                total_dupes    += body.get("duplicates", 0)
                print(f"  Batch {i//BATCH + 1}: ✓ inserted={body.get('inserted',0)} "
                      f"archived={body.get('auto_archived',0)} dupes={body.get('duplicates',0)}")
            else:
                print(f"  Batch {i//BATCH + 1}: ✗ {r.status_code} — {body}")
        except Exception as e:
            print(f"  Batch {i//BATCH + 1}: connection error — {e}")

    print(f"\nDeposit complete. ✓ Inserted: {total_inserted} | "
          f"Auto-archived: {total_archived} | Duplicates skipped: {total_dupes}")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if SUPABASE_URL and HANDSHAKE_TOKEN:
        signals = harvest_signals(max_pages=10)
        if signals:
            send_to_atrium(signals)
        else:
            print("No European signals found this run.")
    else:
        print("Script halted: Configuration incomplete. Check GitHub Secrets.")
