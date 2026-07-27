"""Reservations + walk-in waiting queue."""
from fastapi import APIRouter, HTTPException, Depends
from db import db
from utils import gen_id, now_iso
from deps import get_current_user, require_roles
from models import ReservationBody, QueueJoinBody

router = APIRouter()


@router.post("/reservations")
async def create_reservation(body: ReservationBody, user=Depends(get_current_user)):
    tables = await db.tables.find({"status": "free"}, {"_id": 0}).sort("seats", 1).to_list(200)
    tbl = next((t for t in tables if t["seats"] >= body.party_size), None)
    rsv = {
        "id": gen_id("rsv"), "user_id": user["user_id"], "name": body.name,
        "phone": body.phone, "party_size": body.party_size, "date": body.date, "time": body.time,
        "table_number": tbl["number"] if tbl else None, "status": "confirmed", "created_at": now_iso(),
    }
    await db.reservations.insert_one(rsv)
    if tbl:
        await db.tables.update_one({"number": tbl["number"]}, {"$set": {"status": "reserved", "updated_at": now_iso()}})
    return {k: v for k, v in rsv.items() if k != "_id"}


@router.get("/reservations")
async def list_reservations(user=Depends(get_current_user)):
    q = {} if user["role"] in ("admin", "staff") else {"user_id": user["user_id"]}
    return await db.reservations.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.patch("/reservations/{rid}/status")
async def update_res_status(rid: str, body: dict, user=Depends(get_current_user)):
    new_status = body.get("status")
    if new_status not in ("confirmed", "seated", "cancelled", "completed"):
        raise HTTPException(400, "invalid status")
    r = await db.reservations.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "reservation not found")
    # Customers may only cancel their own reservation. Admin/staff can do anything.
    if user["role"] == "customer":
        if r["user_id"] != user["user_id"]:
            raise HTTPException(403, "Not your reservation")
        if new_status != "cancelled":
            raise HTTPException(403, "Customers can only cancel a reservation")
    elif user["role"] not in ("admin", "staff"):
        raise HTTPException(403, "Not allowed")
    await db.reservations.update_one({"id": rid}, {"$set": {"status": new_status}})
    r = await db.reservations.find_one({"id": rid}, {"_id": 0})
    if r and new_status == "seated" and r.get("table_number"):
        await db.tables.update_one({"number": r["table_number"]}, {"$set": {"status": "occupied"}})
    if r and new_status in ("cancelled", "completed") and r.get("table_number"):
        await db.tables.update_one({"number": r["table_number"]}, {"$set": {"status": "free"}})
    return r


@router.post("/queue")
async def join_queue(body: QueueJoinBody, user=Depends(get_current_user)):
    pos = await db.queue_entries.count_documents({"status": "waiting"}) + 1
    entry = {
        "id": gen_id("q"), "user_id": user["user_id"], "name": body.name, "phone": body.phone,
        "party_size": body.party_size, "position": pos, "eta_minutes": pos * 8,
        "status": "waiting", "created_at": now_iso(),
    }
    await db.queue_entries.insert_one(entry)
    return {k: v for k, v in entry.items() if k != "_id"}


@router.get("/queue")
async def get_queue(user=Depends(get_current_user)):
    entries = await db.queue_entries.find({"status": "waiting"}, {"_id": 0}).sort("created_at", 1).to_list(200)
    for i, e in enumerate(entries):
        e["position"] = i + 1
        e["eta_minutes"] = (i + 1) * 8
    return entries


@router.patch("/queue/{qid}/seat")
async def seat_queue(qid: str, user=Depends(require_roles("admin", "staff"))):
    await db.queue_entries.update_one({"id": qid}, {"$set": {"status": "seated"}})
    return {"ok": True}
