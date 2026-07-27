"""Restaurant tables (physical seating)."""
from fastapi import APIRouter, Depends
from db import db
from utils import now_iso
from deps import require_roles
from models import TableUpdate

router = APIRouter()


@router.get("/tables")
async def list_tables():
    return await db.tables.find({}, {"_id": 0}).sort("number", 1).to_list(200)


@router.patch("/tables/{number}")
async def update_table(number: int, body: TableUpdate, user=Depends(require_roles("admin", "staff"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    await db.tables.update_one({"number": number}, {"$set": upd})
    return await db.tables.find_one({"number": number}, {"_id": 0})
