import requests
from backend.antigravity.fetcher.db import store_indicator, supabase

WB_API_URL = "http://api.worldbank.org/v2/country/ETH/indicator"
YAHOO_URL  = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"
HEADERS    = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _fetch_yahoo_price(symbol: str) -> float | None:
    """Return latest Yahoo Finance close price for a symbol, or None on failure."""
    try:
        r = requests.get(YAHOO_URL.format(symbol=symbol), headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        meta = data["chart"]["result"][0]["meta"]
        return float(meta.get("regularMarketPrice") or meta.get("previousClose"))
    except Exception as e:
        print(f"  Yahoo Finance [{symbol}]: {e}")
        return None


def _get_etb_rate() -> float | None:
    """Read the latest official ETB/USD rate from Supabase indicators."""
    try:
        res = (
            supabase.table("indicators")
            .select("value")
            .ilike("name", "%ETB_USD_OFFICIAL%")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            return float(res.data[0]["value"])
    except Exception as e:
        print(f"  ETB rate lookup: {e}")
    return None


def fetch_indicators():
    """
    Fetch macro indicators for Ethiopia and push to Supabase.
    Stores: inflation, diesel price (ETB), fuel stress index.
    """

    # ── 1. World Bank – Annual Inflation (FP.CPI.TOTL.ZG) ─────────────────────
    try:
        r = requests.get(
            f"{WB_API_URL}/FP.CPI.TOTL.ZG",
            params={"format": "json", "per_page": 1},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        if len(data) > 1 and data[1]:
            row = data[1][0]
            val = row.get("value")
            if val is not None:
                store_indicator({
                    "name": "INFLATION_ANNUAL_PCT",
                    "value": float(val),
                    "category": "macro",
                    "metadata": {"source": "World Bank", "date": row.get("date")},
                })
                print(f"Stored INFLATION_ANNUAL_PCT: {val:.1f}%")
    except Exception as e:
        print(f"  World Bank inflation: {e}")

    # ── 2. Diesel price in ETB (derived: Brent crude + ETB/USD rate) ───────────
    #   Approximation: Ethiopian pump price ~ (Brent/159L) * 1.40 markup * ETB_rate
    #   (1 barrel = 158.987 litres; 1.40 = refining + distribution + tax ≈ 40%)
    brent_usd = _fetch_yahoo_price("BZ=F")
    etb_rate  = _get_etb_rate()

    if brent_usd and etb_rate:
        diesel_etb = (brent_usd / 159.0) * 1.40 * etb_rate
        store_indicator({
            "name": "DIESEL_PRICE_ETB",
            "value": round(diesel_etb, 2),
            "category": "energy",
            "metadata": {
                "source": "Derived: Brent crude (Yahoo Finance) + NBE ETB/USD",
                "brent_usd": brent_usd,
                "etb_usd_rate": etb_rate,
            },
        })
        print(f"Stored DIESEL_PRICE_ETB: {diesel_etb:.2f} ETB/L  (Brent=${brent_usd}, rate={etb_rate})")

        # ── 3. Fuel stress index (0–100) ─────────────────────────────────
        #   Baseline: ~70 ETB/L was "normal"; higher = more stressed.
        baseline  = 70.0
        stress    = min(100, max(0, (diesel_etb - baseline) / baseline * 100))
        store_indicator({
            "name": "FUEL_STRESS_INDEX",
            "value": round(stress, 1),
            "category": "energy",
            "metadata": {"baseline_etb": baseline, "method": "pct above baseline"},
        })
        print(f"Stored FUEL_STRESS_INDEX: {stress:.1f}")
    else:
        print("  Skipping diesel/fuel stress — missing Brent price or ETB rate.")

    # ── 4. IOM DTM placeholder ─────────────────────────────────────────────────
    print("IOM DTM: no public endpoint available — skipped.")


if __name__ == "__main__":
    fetch_indicators()
