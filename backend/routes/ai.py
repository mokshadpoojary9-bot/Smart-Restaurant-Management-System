"""Gemini-powered AI endpoints (chat, recommendations, forecast, insights)."""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from db import db
from utils import gen_id, now_iso
from deps import get_current_user, require_roles
from ai_service import (
    ai_chat_stream, ai_recommendations, ai_forecast_demand,
    ai_inventory_prediction, ai_weekly_insight,
)

router = APIRouter()


@router.post("/ai/chat")
async def ai_chat(body: dict, user=Depends(get_current_user)):
    message = body.get("message", "")
    session_id = body.get("session_id") or f"chat_{user['user_id']}"
    items = await db.menu_items.find({}, {"_id": 0}).to_list(500)

    async def gen():
        try:
            async for token in ai_chat_stream(message, session_id, items):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/ai/recommendations")
async def ai_recs(user=Depends(get_current_user)):
    items = await db.menu_items.find({"available": True}, {"_id": 0}).to_list(500)
    orders = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return await ai_recommendations(user, items, orders)


@router.get("/ai/forecast")
async def ai_forecast(user=Depends(require_roles("admin"))):
    orders = await db.orders.find({}, {"_id": 0}).to_list(5000)
    return await ai_forecast_demand(orders)


@router.get("/ai/inventory-alerts")
async def ai_inv_alerts(user=Depends(require_roles("admin"))):
    inv = await db.inventory_items.find({}, {"_id": 0}).to_list(500)
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    result = await ai_inventory_prediction(inv, orders)
    for r in result.get("at_risk", []):
        existing = await db.notifications.find_one({"target_role": "admin", "meta.inv_name": r["name"], "read": False})
        if not existing:
            await db.notifications.insert_one({
                "id": gen_id("ntf"), "target_role": "admin", "target_user_id": None,
                "message": f"AI Alert: {r['name']} may run out in ~{r.get('hours', 24)}h",
                "kind": "ai-alert", "meta": {"inv_name": r["name"]},
                "created_at": now_iso(), "read": False,
            })
    return result


@router.get("/ai/weekly-insight")
async def ai_weekly(user=Depends(require_roles("admin"))):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return await ai_weekly_insight(orders)
