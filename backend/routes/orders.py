"""Orders + itemised bills."""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from db import db
from utils import gen_id, now_iso
from deps import get_current_user, require_roles
from models import OrderCreate
from notifications import push_notification, push_notification_user

router = APIRouter()


@router.post("/orders")
async def create_order(body: OrderCreate, user=Depends(get_current_user)):
    if not body.items:
        raise HTTPException(400, "Order requires items")
    total = 0.0
    enriched_items = []
    for it in body.items:
        m = await db.menu_items.find_one({"id": it.item_id}, {"_id": 0})
        if not m:
            raise HTTPException(400, f"Item {it.item_id} not found")
        if not m.get("available", True):
            raise HTTPException(400, f"{m['name']} is unavailable")
        line = round(m["price"] * it.qty, 2)
        total += line
        enriched_items.append({
            "item_id": m["id"], "name": m["name"], "price": m["price"],
            "qty": it.qty, "notes": it.notes, "prep_minutes": m.get("prep_minutes", 15),
        })
    subtotal = round(total, 2)
    tax = round(subtotal * 0.05, 2)
    service = round(subtotal * 0.05, 2)
    grand = round(subtotal + tax + service, 2)
    order_id = gen_id("ord")
    order_no = f"#{datetime.now().strftime('%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    doc = {
        "id": order_id, "order_no": order_no, "user_id": user["user_id"],
        "customer_name": user["name"], "items": enriched_items,
        "table_number": body.table_number, "reservation_id": body.reservation_id,
        "notes": body.notes, "subtotal": subtotal, "tax": tax, "service_charge": service,
        "total": grand, "status": "placed", "created_at": now_iso(), "updated_at": now_iso(),
        "eta_minutes": max((it["prep_minutes"] for it in enriched_items), default=15),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)

    # decrement inventory + low-stock alert
    inv_list = await db.inventory_items.find({}, {"_id": 0}).to_list(500)
    for it in enriched_items:
        for inv in inv_list:
            if inv["name"].lower() in it["name"].lower():
                new_stock = max(0.0, inv["stock"] - 0.1 * it["qty"])
                await db.inventory_items.update_one({"id": inv["id"]}, {"$set": {"stock": new_stock, "updated_at": now_iso()}})
                if new_stock <= inv["threshold"]:
                    await push_notification("admin", f"Low stock: {inv['name']} ({new_stock:.1f} {inv['unit']} left)", "low-stock")

    await push_notification("kitchen", f"New order {order_no} received", "new-order", {"order_id": order_id})
    await push_notification("staff", f"Order {order_no} placed", "new-order", {"order_id": order_id})

    bill = {
        "id": gen_id("bill"), "order_id": order_id, "order_no": order_no,
        "user_id": user["user_id"], "subtotal": subtotal, "tax": tax,
        "service_charge": service, "total": grand, "created_at": now_iso(),
        "items": enriched_items, "customer_name": user["name"],
    }
    await db.bills.insert_one(bill)
    return {**doc, "bill_id": bill["id"]}


@router.get("/orders")
async def list_orders(status: Optional[str] = None, mine: bool = False, user=Depends(get_current_user)):
    q = {}
    if status:
        q["status"] = status
    if mine or user["role"] == "customer":
        q["user_id"] = user["user_id"]
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    if user["role"] == "customer" and o["user_id"] != user["user_id"]:
        raise HTTPException(403, "Forbidden")
    return o


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, body: dict, user=Depends(require_roles("admin", "staff", "kitchen"))):
    status = body.get("status")
    if status not in ("placed", "preparing", "ready", "served", "cancelled"):
        raise HTTPException(400, "invalid status")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": status, "updated_at": now_iso()}})
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order:
        msg_map = {
            "preparing": f"Your order {order['order_no']} is being prepared",
            "ready": f"Your order {order['order_no']} is ready!",
            "served": f"Your order {order['order_no']} has been served",
            "cancelled": f"Your order {order['order_no']} was cancelled",
        }
        if status in msg_map:
            await push_notification_user(order["user_id"], msg_map[status], "order-update", {"order_id": order_id})
    return order


@router.get("/bills/{bill_id}")
async def get_bill(bill_id: str, user=Depends(get_current_user)):
    b = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "not found")
    if user["role"] == "customer" and b["user_id"] != user["user_id"]:
        raise HTTPException(403, "forbidden")
    return b
