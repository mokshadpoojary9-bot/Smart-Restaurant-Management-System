"""Gemini AI service via the public google-generativeai SDK.

Env vars:
- GEMINI_API_KEY  (required) — get from https://aistudio.google.com/app/apikey
- GEMINI_MODEL    (optional) — defaults to "gemini-2.5-flash"

If GEMINI_API_KEY is missing all AI calls degrade gracefully to heuristic
answers so the app never hard-crashes on Render / other hosts.
"""
import os
import json
import re
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter

import google.generativeai as genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def _model(system_instruction: str) -> genai.GenerativeModel:
    return genai.GenerativeModel(MODEL_NAME, system_instruction=system_instruction)


async def _generate_text(system: str, prompt: str) -> str:
    """One-shot text generation. Returns empty string on failure."""
    if not GEMINI_API_KEY:
        return ""
    try:
        model = _model(system)
        resp = await model.generate_content_async(prompt)
        return (resp.text or "").strip()
    except Exception:
        return ""


# ---------------------------------------------------------------- streaming chat
async def ai_chat_stream(message: str, session_id: str, menu_items: list):
    """Streaming chatbot — answers menu questions & recommends dishes."""
    lines = [
        f"- {i['name']} ({i['category']}) — ${i['price']:.2f} — {'veg' if i.get('is_veg') else 'non-veg'} — "
        f"{'AVAILABLE' if i.get('available', True) else 'UNAVAILABLE'} — "
        f"allergens: {', '.join(i.get('allergens', [])) or 'none'} — {i.get('description','')[:120]}"
        for i in menu_items[:60]
    ]
    context = "\n".join(lines)
    system = (
        "You are Amber, the friendly AI concierge for 'Ember & Oak' — a 100% PURE VEGETARIAN fine-dining restaurant. "
        "Every dish, drink and dessert on the menu is vegetarian (no meat, poultry, fish or seafood). "
        "Never suggest or invent non-vegetarian items. If a guest asks for chicken, mutton, fish, etc., politely explain we are a pure-veg kitchen and recommend a great veg alternative from the menu. "
        "Help guests navigate the menu, check live dish availability, explain ingredients and allergens, "
        "and recommend dishes based on preferences (spice level, cuisine, light vs indulgent). "
        "Keep replies warm, concise (2-4 short sentences), and always tell the user if something is currently unavailable. "
        f"Here is the live (pure-veg) menu:\n{context}"
    )

    if not GEMINI_API_KEY:
        yield "Sorry, the AI concierge is offline right now (GEMINI_API_KEY is not configured on the server)."
        return

    try:
        model = _model(system)
        stream = await model.generate_content_async(message, stream=True)
        async for chunk in stream:
            text = getattr(chunk, "text", None)
            if text:
                yield text
    except Exception as e:
        yield f"Sorry, I'm having trouble reaching my AI brain right now ({str(e)[:80]}). Please try again."


# ---------------------------------------------------------------- recommendations
async def ai_recommendations(user: dict, menu_items: list, past_orders: list):
    """Return personalized top-3 recommendations."""
    if not menu_items:
        return {"picks": [], "rationale": "Menu is empty."}
    past_dish_counter = Counter()
    for o in past_orders:
        for it in o.get("items", []):
            past_dish_counter[it["name"]] += it["qty"]
    top_past = past_dish_counter.most_common(5)
    past_str = ", ".join(f"{n} x{c}" for n, c in top_past) or "no previous orders"
    menu_str = "\n".join(
        f"- {m['name']} | {m['category']} | ${m['price']:.2f} | {'veg' if m.get('is_veg') else 'non-veg'} | spice {m.get('spice_level',1)}/3 | tags: {','.join(m.get('tags',[]))}"
        for m in menu_items[:80]
    )
    system = (
        "You are a restaurant sommelier AI. Given a customer's past orders and the current menu, "
        "return STRICT JSON like: {\"picks\":[{\"name\":\"...\",\"reason\":\"...\"}], \"rationale\":\"...\"}. "
        "Pick exactly 3 items from the menu. Reasons should be one short sentence each, personal and warm."
    )
    prompt = (
        f"Customer: {user['name']}\n"
        f"Past favorites: {past_str}\n\n"
        f"MENU:\n{menu_str}\n\n"
        "Return only the JSON, no prose."
    )

    text = await _generate_text(system, prompt)
    j = _extract_json(text) if text else {}
    by_name = {m["name"].lower(): m for m in menu_items}
    picks_full = []
    for p in j.get("picks", []):
        m = by_name.get(p.get("name", "").lower())
        if m:
            picks_full.append({**m, "reason": p.get("reason", "")})
    if not picks_full:
        fallback = sorted(menu_items, key=lambda x: -x.get("rating", 0))[:3]
        return {
            "picks": [{**m, "reason": "Top-rated pick"} for m in fallback],
            "rationale": "Live AI unavailable, showing top-rated dishes.",
        }
    return {"picks": picks_full[:3], "rationale": j.get("rationale", "Curated for you.")}


# ---------------------------------------------------------------- demand forecast
async def ai_forecast_demand(orders: list):
    """Predict busy hours + weekday from historical data."""
    hour_counter = Counter()
    dow_counter = Counter()
    for o in orders:
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
            hour_counter[dt.hour] += 1
            dow_counter[dt.strftime("%A")] += 1
        except Exception:
            continue
    top_hours = hour_counter.most_common(3)
    top_days = dow_counter.most_common(3)
    forecast_series = [{"hour": f"{h:02d}", "orders": hour_counter.get(h, 0)} for h in range(24)]

    system = "You are a data analyst writing 2 short crisp sentences of demand forecast for a restaurant owner. No fluff."
    prompt = (
        f"Peak hours: {top_hours}. Peak days: {top_days}. Total historical orders: {len(orders)}. "
        "Write 2 sentences predicting when the restaurant will be busy this week and suggesting one staffing action."
    )
    summary = await _generate_text(system, prompt)
    if not summary:
        top_h = top_hours[0][0] if top_hours else 19
        summary = f"Peak hours are around {top_h:02d}:00. Plan extra staff during dinner service."

    return {
        "hour_series": forecast_series,
        "top_hours": [{"hour": f"{h:02d}", "orders": c} for h, c in top_hours],
        "top_days": [{"day": d, "orders": c} for d, c in top_days],
        "summary": summary,
    }


# ---------------------------------------------------------------- inventory alerts
async def ai_inventory_prediction(inventory: list, recent_orders: list):
    """Flag ingredients likely to run out."""
    consumption = defaultdict(float)
    for o in recent_orders:
        for it in o.get("items", []):
            for inv in inventory:
                if inv["name"].lower() in it["name"].lower():
                    consumption[inv["name"]] += 0.1 * it["qty"]
    hours_span = 24
    at_risk = []
    for inv in inventory:
        used = consumption.get(inv["name"], 0.0)
        rate_per_hour = used / max(hours_span, 1)
        hours_left = inv["stock"] / rate_per_hour if rate_per_hour > 0 else 999
        if inv["stock"] <= inv["threshold"] or hours_left <= 24:
            at_risk.append({
                "name": inv["name"],
                "stock": inv["stock"],
                "unit": inv["unit"],
                "hours": round(min(hours_left, 240), 1),
                "threshold": inv["threshold"],
            })

    system = "You are an inventory analyst. In one short sentence, tell the restaurant owner what to reorder today."
    at_risk_str = ", ".join(
        f"{r['name']} ({r['stock']:.1f} {r['unit']}, ~{r['hours']}h)" for r in at_risk
    ) or "no items at risk"
    summary = await _generate_text(system, f"At-risk items: {at_risk_str}. Write one action sentence.")
    if not summary:
        summary = "Restock at-risk items before the dinner rush."
    return {"at_risk": at_risk, "summary": summary}


# ---------------------------------------------------------------- weekly insight
async def ai_weekly_insight(orders: list):
    """Plain-English weekly summary for the owner."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    weekly = []
    for o in orders:
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
            if dt >= week_ago:
                weekly.append(o)
        except Exception:
            continue
    revenue = sum(o["total"] for o in weekly)
    day_rev = defaultdict(float)
    item_qty = Counter()
    for o in weekly:
        try:
            d = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00")).strftime("%A")
            day_rev[d] += o["total"]
            for it in o["items"]:
                item_qty[it["name"]] += it["qty"]
        except Exception:
            pass
    top_day = max(day_rev.items(), key=lambda x: x[1])[0] if day_rev else "N/A"
    top_items = ", ".join(f"{n} ({c})" for n, c in item_qty.most_common(3)) or "no items yet"
    system = (
        "You are a restaurant analyst. Write a warm, plain-English 3-4 sentence weekly summary for the owner. "
        "Cover: total revenue, busiest day, top selling dishes, and one clear suggestion. No emojis, no bullet lists."
    )
    prompt = (
        f"This week: revenue ${revenue:.2f} across {len(weekly)} orders. "
        f"Busiest day: {top_day}. Top items: {top_items}."
    )
    summary = await _generate_text(system, prompt)
    if not summary:
        summary = f"This week you earned ${revenue:.2f} across {len(weekly)} orders. {top_day} was your busiest day."
    return {
        "revenue": round(revenue, 2),
        "orders": len(weekly),
        "top_day": top_day,
        "top_items": [{"name": n, "qty": c} for n, c in item_qty.most_common(5)],
        "summary": summary,
    }


# ---------------------------------------------------------------- helpers
def _extract_json(s: str):
    """Extract the first JSON object from a string safely."""
    if not s:
        return {}
    m = re.search(r"\{[\s\S]*\}", s)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {}
