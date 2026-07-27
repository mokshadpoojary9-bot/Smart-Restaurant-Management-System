"""Owner analytics summary (revenue, top items, hourly breakdown)."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from db import db
from deps import require_roles

router = APIRouter()


@router.get("/analytics/summary")
async def analytics_summary(user=Depends(require_roles("admin"))):
    orders = await db.orders.find({}, {"_id": 0}).to_list(5000)
    total_revenue = round(sum(o["total"] for o in orders), 2)
    served = [o for o in orders if o["status"] == "served"]
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    todays = [o for o in orders if o["created_at"].startswith(today)]
    todays_rev = round(sum(o["total"] for o in todays), 2)
    daily = {}
    for i in range(7):
        d = (now - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        daily[d] = 0.0
    for o in orders:
        d = o["created_at"][:10]
        if d in daily:
            daily[d] += o["total"]
    daily_series = [{"date": d, "revenue": round(v, 2)} for d, v in daily.items()]
    hours = {h: 0 for h in range(24)}
    for o in orders:
        try:
            h = int(o["created_at"][11:13])
            hours[h] += 1
        except Exception:
            pass
    hour_series = [{"hour": f"{h:02d}", "orders": c} for h, c in hours.items()]
    item_stats = {}
    for o in orders:
        for it in o["items"]:
            k = it["name"]
            item_stats.setdefault(k, {"name": k, "qty": 0, "revenue": 0.0})
            item_stats[k]["qty"] += it["qty"]
            item_stats[k]["revenue"] += it["price"] * it["qty"]
    top_items = sorted(item_stats.values(), key=lambda x: -x["qty"])[:6]
    return {
        "orders_total": len(orders), "revenue_total": total_revenue,
        "orders_today": len(todays), "revenue_today": todays_rev,
        "served_count": len(served),
        "avg_order_value": round(total_revenue / len(orders), 2) if orders else 0,
        "daily_series": daily_series, "hour_series": hour_series, "top_items": top_items,
    }
