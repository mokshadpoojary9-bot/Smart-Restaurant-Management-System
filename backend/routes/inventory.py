"""Inventory tracking + restocking."""
from fastapi import APIRouter, HTTPException, Depends
from db import db
from utils import gen_id, now_iso
from deps import require_roles
from models import InventoryBody, InventoryRestock

router = APIRouter()


@router.get("/inventory")
async def list_inventory(user=Depends(require_roles("admin", "kitchen", "staff"))):
    return await db.inventory_items.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@router.post("/inventory")
async def add_inventory(body: InventoryBody, user=Depends(require_roles("admin"))):
    doc = {"id": gen_id("inv"), **body.model_dump(), "updated_at": now_iso()}
    await db.inventory_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/inventory/{iid}/restock")
async def restock(iid: str, body: InventoryRestock, user=Depends(require_roles("admin", "kitchen"))):
    inv = await db.inventory_items.find_one({"id": iid})
    if not inv:
        raise HTTPException(404)
    new_stock = inv["stock"] + body.delta
    await db.inventory_items.update_one({"id": iid}, {"$set": {"stock": new_stock, "updated_at": now_iso()}})
    return await db.inventory_items.find_one({"id": iid}, {"_id": 0})


@router.delete("/inventory/{iid}")
async def del_inv(iid: str, user=Depends(require_roles("admin"))):
    await db.inventory_items.delete_one({"id": iid})
    return {"ok": True}
