"""Smart Restaurant Management System - FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid, jwt, bcrypt, logging, asyncio, requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
OWNER_EMAIL = os.environ.get('OWNER_EMAIL', '').lower().strip()

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Smart Restaurant API")
api = APIRouter(prefix="/api")

# ---------- utilities ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def gen_id(prefix="id"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_jwt(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

async def resolve_current_user(session_token: Optional[str], authorization: Optional[str]) -> Optional[dict]:
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        payload = decode_jwt(token)
        if payload:
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
    return None

async def get_current_user(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    user = await resolve_current_user(session_token, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

def require_roles(*roles):
    async def _dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {roles}")
        return user
    return _dep

# ---------- models ----------
class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("item"))
    name: str
    description: str = ""
    price: float
    category: str = "Mains"
    image_url: str = ""
    is_veg: bool = True
    rating: float = 4.5
    allergens: List[str] = []
    prep_minutes: int = 15
    available: bool = True
    spice_level: int = 1
    tags: List[str] = []

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_veg: Optional[bool] = None
    rating: Optional[float] = None
    allergens: Optional[List[str]] = None
    prep_minutes: Optional[int] = None
    available: Optional[bool] = None
    spice_level: Optional[int] = None
    tags: Optional[List[str]] = None

class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    notes: str = ""

class OrderCreate(BaseModel):
    items: List[OrderItem]
    table_number: Optional[int] = None
    reservation_id: Optional[str] = None
    notes: str = ""

class ReservationBody(BaseModel):
    name: str
    phone: str
    party_size: int
    date: str
    time: str

class QueueJoinBody(BaseModel):
    name: str
    phone: str
    party_size: int

class TableUpdate(BaseModel):
    status: Optional[str] = None
    current_order_id: Optional[str] = None
    seats: Optional[int] = None

class InventoryBody(BaseModel):
    name: str
    unit: str = "kg"
    stock: float
    threshold: float = 5.0

class InventoryRestock(BaseModel):
    delta: float

class StaffCreateBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str

# ---------- AUTH ROUTES ----------
@api.post("/auth/signup")
async def signup(body: SignupBody):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "admin" if email == OWNER_EMAIL else "customer"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id, "email": email, "name": body.name, "role": role,
        "password_hash": hash_password(body.password), "picture": "", "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = make_jwt(user_id, role)
    return {"token": token, "user": {"user_id": user_id, "email": email, "name": body.name, "role": role, "picture": ""}}

@api.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if email == OWNER_EMAIL and user.get("role") != "admin":
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": "admin"}})
        user["role"] = "admin"
    token = make_jwt(user["user_id"], user["role"])
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "role": user["role"], "picture": user.get("picture", "")}}

@api.post("/auth/oauth/session")
async def oauth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"OAuth verification failed: {e}")

    email = data["email"].lower().strip()
    session_token = data["session_token"]
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        user_id = user["user_id"]; role = user["role"]
        if email == OWNER_EMAIL and role != "admin":
            role = "admin"
            await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin", "picture": data.get("picture", "")}})
        else:
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": data.get("picture", user.get("picture", ""))}})
    else:
        role = "admin" if email == OWNER_EMAIL else "customer"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data.get("name", email.split("@")[0]),
            "role": role, "picture": data.get("picture", ""), "created_at": now_iso(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at, "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(
        key="session_token", value=session_token, max_age=7*24*60*60,
        httponly=True, secure=True, samesite="none", path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user_doc}

@api.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user

@api.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ---------- MENU ROUTES ----------
@api.get("/menu")
async def list_menu(only_available: bool = False):
    q = {"available": True} if only_available else {}
    items = await db.menu_items.find(q, {"_id": 0}).to_list(1000)
    cats = sorted({i["category"] for i in items})
    return {"items": items, "categories": cats}

@api.get("/menu/{item_id}")
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Not found")
    return item

@api.post("/menu")
async def create_menu_item(body: MenuItem, user=Depends(require_roles("admin"))):
    doc = body.model_dump()
    await db.menu_items.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/menu/{item_id}")
async def update_menu_item(item_id: str, body: MenuItemUpdate, user=Depends(require_roles("admin", "kitchen", "staff"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if user["role"] in ("staff", "kitchen"):
        upd = {k: v for k, v in upd.items() if k == "available"}
    if not upd:
        return {"ok": True}
    await db.menu_items.update_one({"id": item_id}, {"$set": upd})
    return await db.menu_items.find_one({"id": item_id}, {"_id": 0})

@api.delete("/menu/{item_id}")
async def del_menu_item(item_id: str, user=Depends(require_roles("admin"))):
    await db.menu_items.delete_one({"id": item_id})
    return {"ok": True}

# ---------- ORDERS ----------
@api.post("/orders")
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

@api.get("/orders")
async def list_orders(status: Optional[str] = None, mine: bool = False, user=Depends(get_current_user)):
    q = {}
    if status:
        q["status"] = status
    if mine or user["role"] == "customer":
        q["user_id"] = user["user_id"]
    return await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    if user["role"] == "customer" and o["user_id"] != user["user_id"]:
        raise HTTPException(403, "Forbidden")
    return o

@api.patch("/orders/{order_id}/status")
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

@api.get("/bills/{bill_id}")
async def get_bill(bill_id: str, user=Depends(get_current_user)):
    b = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "not found")
    if user["role"] == "customer" and b["user_id"] != user["user_id"]:
        raise HTTPException(403, "forbidden")
    return b

# ---------- TABLES ----------
@api.get("/tables")
async def list_tables():
    return await db.tables.find({}, {"_id": 0}).sort("number", 1).to_list(200)

@api.patch("/tables/{number}")
async def update_table(number: int, body: TableUpdate, user=Depends(require_roles("admin", "staff"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    await db.tables.update_one({"number": number}, {"$set": upd})
    return await db.tables.find_one({"number": number}, {"_id": 0})

# ---------- RESERVATIONS + QUEUE ----------
@api.post("/reservations")
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

@api.get("/reservations")
async def list_reservations(user=Depends(get_current_user)):
    q = {} if user["role"] in ("admin", "staff") else {"user_id": user["user_id"]}
    return await db.reservations.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.patch("/reservations/{rid}/status")
async def update_res_status(rid: str, body: dict, user=Depends(require_roles("admin", "staff"))):
    await db.reservations.update_one({"id": rid}, {"$set": {"status": body["status"]}})
    r = await db.reservations.find_one({"id": rid}, {"_id": 0})
    if r and body["status"] == "seated" and r.get("table_number"):
        await db.tables.update_one({"number": r["table_number"]}, {"$set": {"status": "occupied"}})
    if r and body["status"] in ("cancelled", "completed") and r.get("table_number"):
        await db.tables.update_one({"number": r["table_number"]}, {"$set": {"status": "free"}})
    return r

@api.post("/queue")
async def join_queue(body: QueueJoinBody, user=Depends(get_current_user)):
    pos = await db.queue_entries.count_documents({"status": "waiting"}) + 1
    entry = {
        "id": gen_id("q"), "user_id": user["user_id"], "name": body.name, "phone": body.phone,
        "party_size": body.party_size, "position": pos, "eta_minutes": pos * 8,
        "status": "waiting", "created_at": now_iso(),
    }
    await db.queue_entries.insert_one(entry)
    return {k: v for k, v in entry.items() if k != "_id"}

@api.get("/queue")
async def get_queue(user=Depends(get_current_user)):
    entries = await db.queue_entries.find({"status": "waiting"}, {"_id": 0}).sort("created_at", 1).to_list(200)
    for i, e in enumerate(entries):
        e["position"] = i + 1
        e["eta_minutes"] = (i + 1) * 8
    return entries

@api.patch("/queue/{qid}/seat")
async def seat_queue(qid: str, user=Depends(require_roles("admin", "staff"))):
    await db.queue_entries.update_one({"id": qid}, {"$set": {"status": "seated"}})
    return {"ok": True}

# ---------- INVENTORY ----------
@api.get("/inventory")
async def list_inventory(user=Depends(require_roles("admin", "kitchen", "staff"))):
    return await db.inventory_items.find({}, {"_id": 0}).sort("name", 1).to_list(500)

@api.post("/inventory")
async def add_inventory(body: InventoryBody, user=Depends(require_roles("admin"))):
    doc = {"id": gen_id("inv"), **body.model_dump(), "updated_at": now_iso()}
    await db.inventory_items.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.post("/inventory/{iid}/restock")
async def restock(iid: str, body: InventoryRestock, user=Depends(require_roles("admin", "kitchen"))):
    inv = await db.inventory_items.find_one({"id": iid})
    if not inv:
        raise HTTPException(404)
    new_stock = inv["stock"] + body.delta
    await db.inventory_items.update_one({"id": iid}, {"$set": {"stock": new_stock, "updated_at": now_iso()}})
    return await db.inventory_items.find_one({"id": iid}, {"_id": 0})

@api.delete("/inventory/{iid}")
async def del_inv(iid: str, user=Depends(require_roles("admin"))):
    await db.inventory_items.delete_one({"id": iid})
    return {"ok": True}

# ---------- STAFF ----------
@api.get("/staff")
async def list_staff(user=Depends(require_roles("admin"))):
    return await db.users.find({"role": {"$in": ["staff", "kitchen", "admin"]}}, {"_id": 0, "password_hash": 0}).to_list(500)

@api.post("/staff")
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

@api.delete("/staff/{uid}")
async def del_staff(uid: str, user=Depends(require_roles("admin"))):
    target = await db.users.find_one({"user_id": uid})
    if target and target.get("email", "").lower() == OWNER_EMAIL:
        raise HTTPException(400, "cannot delete owner")
    await db.users.delete_one({"user_id": uid})
    return {"ok": True}

@api.get("/customers")
async def list_customers(user=Depends(require_roles("admin", "staff"))):
    users = await db.users.find({"role": "customer"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        orders = await db.orders.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(200)
        u["orders_count"] = len(orders)
        u["total_spent"] = round(sum(o["total"] for o in orders), 2)
    return users

# ---------- NOTIFICATIONS ----------
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

@api.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    q = {"$or": [{"target_user_id": user["user_id"]}, {"target_role": user["role"]}]}
    return await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)

@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- ANALYTICS ----------
@api.get("/analytics/summary")
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

# ---------- AI ROUTES ----------
from ai_service import (
    ai_chat_stream, ai_recommendations, ai_forecast_demand,
    ai_inventory_prediction, ai_weekly_insight,
)

@api.post("/ai/chat")
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

@api.get("/ai/recommendations")
async def ai_recs(user=Depends(get_current_user)):
    items = await db.menu_items.find({"available": True}, {"_id": 0}).to_list(500)
    orders = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return await ai_recommendations(user, items, orders)

@api.get("/ai/forecast")
async def ai_forecast(user=Depends(require_roles("admin"))):
    orders = await db.orders.find({}, {"_id": 0}).to_list(5000)
    return await ai_forecast_demand(orders)

@api.get("/ai/inventory-alerts")
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

@api.get("/ai/weekly-insight")
async def ai_weekly(user=Depends(require_roles("admin"))):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return await ai_weekly_insight(orders)

# ---------- HEALTH ----------
@api.get("/")
async def root():
    return {"service": "Smart Restaurant API", "status": "ok"}

@api.post("/dev/seed")
async def seed_endpoint():
    from seed_data import seed
    return await seed(db, OWNER_EMAIL)

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    from seed_data import seed
    await seed(db, OWNER_EMAIL)
    logger.info("Startup seed complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()
