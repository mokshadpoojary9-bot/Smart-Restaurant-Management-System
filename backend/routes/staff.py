"""Staff management + customer roster."""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from db import db, OWNER_EMAIL
from utils import now_iso, hash_password
from deps import require_roles
from models import StaffCreateBody

router = APIRouter()


@router.get("/staff")
async def list_staff(user=Depends(require_roles("admin"))):
    return await db.users.find({"role": {"$in": ["staff", "kitchen", "admin"]}}, {"_id": 0, "password_hash": 0}).to_list(500)


@router.post("/staff")
async def create_staff(body: StaffCreateBody, user=Depends(require_roles("admin"))):
    if body.role not in ("staff", "kitchen", "admin"):
        raise HTTPException(400, "invalid role")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "email already exists")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": uid, "email": email, "name": body.name, "role": body.role,
        "password_hash": hash_password(body.password), "picture": "", "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None)
    return {k: v for k, v in doc.items() if k != "password_hash"}


@router.delete("/staff/{uid}")
async def del_staff(uid: str, user=Depends(require_roles("admin"))):
    target = await db.users.find_one({"user_id": uid})
    if target and target.get("email", "").lower() == OWNER_EMAIL:
        raise HTTPException(400, "cannot delete owner")
    await db.users.delete_one({"user_id": uid})
    return {"ok": True}


@router.get("/customers")
async def list_customers(user=Depends(require_roles("admin", "staff"))):
    users = await db.users.find({"role": "customer"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        orders = await db.orders.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(200)
        u["orders_count"] = len(orders)
        u["total_spent"] = round(sum(o["total"] for o in orders), 2)
    return users
