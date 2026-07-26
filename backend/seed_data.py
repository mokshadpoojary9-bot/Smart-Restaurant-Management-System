"""Seed demo data for the restaurant — 100% VEGETARIAN menu."""
import bcrypt, uuid
from datetime import datetime, timezone, timedelta

def _id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def _hash(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

# ALL DISHES ARE VEGETARIAN. is_veg=True hardcoded for every entry.
DEMO_MENU = [
    # ---- Appetizers ----
    {"name": "Paneer Tikka", "category": "Appetizers", "price": 11.5, "spice_level": 2,
     "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
     "description": "Chargrilled cottage cheese cubes marinated in yogurt, ginger and roasted spices, served with mint chutney.",
     "allergens": ["dairy"], "prep_minutes": 10, "rating": 4.8, "tags": ["indian", "north-indian", "paneer", "cuisine:indian", "grilled", "starter"]},
    {"name": "Charred Corn Elote", "category": "Appetizers", "price": 9.5, "spice_level": 2,
     "image_url": "https://images.unsplash.com/photo-1608032077018-c9aad9565d29?w=800",
     "description": "Wood-fired sweet corn brushed with lime crema, cotija & smoked paprika.",
     "allergens": ["dairy"], "prep_minutes": 8, "rating": 4.6, "tags": ["mexican", "cuisine:mexican", "spicy", "smoky", "corn"]},
    {"name": "Truffle Burrata", "category": "Appetizers", "price": 14.0, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1626200419199-391ae4be7f9d?w=800",
     "description": "Creamy Puglian burrata, black truffle honey, heirloom tomato.",
     "allergens": ["dairy"], "prep_minutes": 6, "rating": 4.9, "tags": ["italian", "cuisine:italian", "cheese", "indulgent", "classic"]},
    {"name": "Crispy Halloumi Fries", "category": "Appetizers", "price": 10.5, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800",
     "description": "Golden halloumi batons, honey-lemon glaze, chilli flakes.",
     "allergens": ["dairy", "gluten"], "prep_minutes": 9, "rating": 4.5, "tags": ["mediterranean", "cheese", "cuisine:mediterranean", "crispy"]},

    # ---- Mains ----
    {"name": "Palak Paneer", "category": "Mains", "price": 17.5, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800",
     "description": "Silky spinach curry with hand-cut paneer, garam masala, finished with cream and kasuri methi.",
     "allergens": ["dairy"], "prep_minutes": 18, "rating": 4.8, "tags": ["indian", "north-indian", "cuisine:indian", "paneer", "curry", "spinach"]},
    {"name": "Malai Kofta", "category": "Mains", "price": 18.0, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
     "description": "Cottage-cheese and potato dumplings in a velvety cashew-tomato gravy, saffron drizzle.",
     "allergens": ["dairy", "nuts"], "prep_minutes": 20, "rating": 4.7, "tags": ["indian", "north-indian", "cuisine:indian", "paneer", "curry", "creamy"]},
    {"name": "Veg Dum Biryani", "category": "Mains", "price": 19.0, "spice_level": 2,
     "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800",
     "description": "Long-grain basmati layered with root vegetables, saffron, mint, sealed and slow-cooked in dum style.",
     "allergens": ["dairy", "nuts"], "prep_minutes": 25, "rating": 4.9, "tags": ["indian", "south-indian", "biryani", "cuisine:indian", "signature", "rice", "spicy"]},
    {"name": "Dal Makhani", "category": "Mains", "price": 16.0, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800",
     "description": "Black urad and kidney beans simmered overnight with tomato, butter, and a whisper of smoke.",
     "allergens": ["dairy"], "prep_minutes": 22, "rating": 4.7, "tags": ["indian", "north-indian", "cuisine:indian", "dal", "creamy", "classic"]},
    {"name": "Saffron Risotto", "category": "Mains", "price": 22.0, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
     "description": "Carnaroli rice, saffron milanese, aged parmigiano, gold leaf.",
     "allergens": ["dairy"], "prep_minutes": 18, "rating": 4.7, "tags": ["italian", "cuisine:italian", "creamy", "classic", "risotto"]},
    {"name": "Ash-Roasted Cauliflower", "category": "Mains", "price": 18.0, "spice_level": 2,
     "image_url": "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800",
     "description": "Whole cauliflower charred in oak ash, tahini, pomegranate, dukkah.",
     "allergens": ["sesame", "nuts"], "prep_minutes": 22, "rating": 4.5, "tags": ["mediterranean", "cuisine:mediterranean", "vegan", "smoky"]},
    {"name": "Wild Mushroom Truffle Burger", "category": "Mains", "price": 21.0, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=800",
     "description": "Portobello and shiitake patty, truffle brie, caramelised onion, brioche bun.",
     "allergens": ["dairy", "gluten"], "prep_minutes": 15, "rating": 4.7, "tags": ["american", "cuisine:american", "burger", "mushroom", "indulgent"]},

    # ---- Pasta & Pizza ----
    {"name": "Cacio e Pepe", "category": "Pasta", "price": 19.0, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800",
     "description": "Hand-rolled tonnarelli, pecorino romano, cracked tellicherry pepper.",
     "allergens": ["gluten", "dairy"], "prep_minutes": 12, "rating": 4.8, "tags": ["italian", "cuisine:italian", "classic", "pasta"]},
    {"name": "Wild Mushroom Pizza", "category": "Pasta", "price": 21.0, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
     "description": "Sourdough base, wild mushroom medley, wildflower honey, stracciatella.",
     "allergens": ["gluten", "dairy"], "prep_minutes": 14, "rating": 4.6, "tags": ["italian", "cuisine:italian", "pizza", "mushroom", "cheese"]},

    # ---- Desserts ----
    {"name": "Basque Cheesecake", "category": "Desserts", "price": 11.0, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800",
     "description": "Burnt-top cheesecake, cherry compote, salted caramel.",
     "allergens": ["dairy", "eggs"], "prep_minutes": 5, "rating": 4.9, "tags": ["spanish", "cuisine:spanish", "cheesecake", "indulgent"]},
    {"name": "Dark Chocolate Fondant", "category": "Desserts", "price": 12.0, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800",
     "description": "70% Valrhona molten centre, vanilla bean ice cream.",
     "allergens": ["dairy", "eggs", "gluten"], "prep_minutes": 12, "rating": 4.9, "tags": ["french", "cuisine:french", "chocolate", "classic"]},
    {"name": "Rose Gulab Jamun", "category": "Desserts", "price": 8.5, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
     "description": "Warm milk-solid dumplings soaked in rose-cardamom syrup, saffron cream.",
     "allergens": ["dairy", "gluten"], "prep_minutes": 6, "rating": 4.8, "tags": ["indian", "cuisine:indian", "sweet", "rose", "dessert"]},

    # ---- Drinks ----
    {"name": "Smoked Old Fashioned (Mocktail)", "category": "Drinks", "price": 12.0, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800",
     "description": "Applewood smoke, spiced orange, brandied cherry, non-alcoholic bourbon-style base.",
     "allergens": [], "prep_minutes": 5, "rating": 4.7, "tags": ["mocktail", "signature", "smoky"]},
    {"name": "Masala Chai Latte", "category": "Drinks", "price": 6.5, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800",
     "description": "Assam tea slow-brewed with cardamom, clove, ginger and warm milk froth.",
     "allergens": ["dairy"], "prep_minutes": 4, "rating": 4.8, "tags": ["indian", "cuisine:indian", "tea", "warming"]},
    {"name": "Elderflower Spritz (Zero-proof)", "category": "Drinks", "price": 10.0, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800",
     "description": "Elderflower cordial, sparkling grape, cucumber, mint, soda.",
     "allergens": [], "prep_minutes": 3, "rating": 4.5, "tags": ["mocktail", "light", "refreshing"]},
]

DEMO_INVENTORY = [
    {"name": "Paneer", "unit": "kg", "stock": 10.0, "threshold": 3.0},
    {"name": "Cauliflower", "unit": "kg", "stock": 12.0, "threshold": 4.0},
    {"name": "Burrata", "unit": "pcs", "stock": 20.0, "threshold": 6.0},
    {"name": "Saffron", "unit": "g", "stock": 25.0, "threshold": 10.0},
    {"name": "Halloumi", "unit": "kg", "stock": 5.0, "threshold": 2.0},
    {"name": "Spinach", "unit": "kg", "stock": 8.0, "threshold": 3.0},
    {"name": "Basmati Rice", "unit": "kg", "stock": 18.0, "threshold": 5.0},
    {"name": "Mushroom", "unit": "kg", "stock": 6.0, "threshold": 2.0},
    {"name": "Pasta Dough", "unit": "kg", "stock": 5.5, "threshold": 2.0},
    {"name": "Pizza Dough", "unit": "kg", "stock": 7.0, "threshold": 2.5},
    {"name": "Chocolate", "unit": "kg", "stock": 4.0, "threshold": 1.5},
    {"name": "Corn", "unit": "kg", "stock": 6.5, "threshold": 2.0},
    {"name": "Dal (Urad)", "unit": "kg", "stock": 9.0, "threshold": 3.0},
]

async def seed(db, owner_email: str):
    now = datetime.now(timezone.utc).isoformat()

    # Owner user
    if owner_email:
        existing = await db.users.find_one({"email": owner_email})
        if not existing:
            await db.users.insert_one({
                "user_id": _id("user"), "email": owner_email, "name": "Owner", "role": "admin",
                "password_hash": _hash("owner123"), "picture": "", "created_at": now,
            })
        elif existing.get("role") != "admin":
            await db.users.update_one({"email": owner_email}, {"$set": {"role": "admin"}})

    # Demo staff accounts
    demo_accounts = [
        {"email": "chef@ember.demo", "name": "Chef Marco", "role": "kitchen", "password": "chef123"},
        {"email": "server@ember.demo", "name": "Sofia (Server)", "role": "staff", "password": "staff123"},
        {"email": "guest@ember.demo", "name": "Guest Diner", "role": "customer", "password": "guest123"},
    ]
    for acc in demo_accounts:
        if not await db.users.find_one({"email": acc["email"]}):
            await db.users.insert_one({
                "user_id": _id("user"), "email": acc["email"], "name": acc["name"], "role": acc["role"],
                "password_hash": _hash(acc["password"]), "picture": "", "created_at": now,
            })

    # Migration: force-reseed menu if any non-veg item exists or menu is empty
    non_veg_count = await db.menu_items.count_documents({"is_veg": False})
    total_count = await db.menu_items.count_documents({})
    veg_names = {m["name"] for m in DEMO_MENU}
    existing_names = {d["name"] async for d in db.menu_items.find({}, {"name": 1})}
    if non_veg_count > 0 or total_count == 0 or existing_names != veg_names:
        await db.menu_items.delete_many({})
        for m in DEMO_MENU:
            await db.menu_items.insert_one({
                "id": _id("item"),
                **m,
                "is_veg": True,   # enforce
                "available": True,
            })

    # Tables
    if await db.tables.count_documents({}) == 0:
        for n in range(1, 13):
            await db.tables.insert_one({
                "number": n,
                "seats": 2 if n <= 4 else (4 if n <= 9 else 6),
                "status": "free", "current_order_id": None, "updated_at": now,
            })

    # Inventory — reseed if empty
    if await db.inventory_items.count_documents({}) == 0:
        for inv in DEMO_INVENTORY:
            await db.inventory_items.insert_one({
                "id": _id("inv"), **inv, "updated_at": now,
            })

    return {"seeded": True, "menu_items": len(DEMO_MENU)}
