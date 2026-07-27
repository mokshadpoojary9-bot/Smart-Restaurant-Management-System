"""Menu: list, get, create, update, delete."""
from fastapi import APIRouter, HTTPException, Depends
from db import db
from deps import get_current_user, require_roles
from models import MenuItem, MenuItemUpdate

router = APIRouter()


@router.get("/menu")
async def list_menu(only_available: bool = False):
    q = {"available": True} if only_available else {}
    items = await db.menu_items.find(q, {"_id": 0}).to_list(1000)
    cats = sorted({i["category"] for i in items})
    return {"items": items, "categories": cats}


@router.get("/menu/{item_id}")
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Not found")
    return item


@router.post("/menu")
async def create_menu_item(body: MenuItem, user=Depends(require_roles("admin"))):
    doc = body.model_dump()
    await db.menu_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/menu/{item_id}")
async def update_menu_item(item_id: str, body: MenuItemUpdate, user=Depends(require_roles("admin", "kitchen", "staff"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if user["role"] in ("staff", "kitchen"):
        upd = {k: v for k, v in upd.items() if k == "available"}
    if not upd:
        return {"ok": True}
    await db.menu_items.update_one({"id": item_id}, {"$set": upd})
    return await db.menu_items.find_one({"id": item_id}, {"_id": 0})


@router.delete("/menu/{item_id}")
async def del_menu_item(item_id: str, user=Depends(require_roles("admin"))):
    await db.menu_items.delete_one({"id": item_id})
    return {"ok": True}
