"""Notification helpers + routes.

Kept as a top-level module (not a route file) so other routers can push notifications
without cross-router imports.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from db import db
from utils import gen_id, now_iso
from deps import get_current_user


router = APIRouter()


async def push_notification(target_role: str, message: str, kind: str = "info", meta: dict = None):
    await db.notifications.insert_one({
        "id": gen_id("ntf"), "target_role": target_role, "target_user_id": None,
        "message": message, "kind": kind, "meta": meta or {},
        "created_at": now_iso(), "read": False,
    })


async def push_notification_user(user_id: str, message: str, kind: str = "info", meta: dict = None):
    await db.notifications.insert_one({
        "id": gen_id("ntf"), "target_role": None, "target_user_id": user_id,
        "message": message, "kind": kind, "meta": meta or {},
        "created_at": now_iso(), "read": False,
    })


@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    q = {"$or": [{"target_user_id": user["user_id"]}, {"target_role": user["role"]}]}
    return await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}
