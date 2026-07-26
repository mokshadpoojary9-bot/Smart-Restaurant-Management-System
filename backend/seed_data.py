"""Seed demo data for the restaurant."""
import bcrypt, uuid
from datetime import datetime, timezone, timedelta

def _id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def _hash(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

DEMO_MENU = [
    # Appetizers
    {"name": "Charred Corn Elote", "category": "Appetizers", "price": 9.5, "is_veg": True, "spice_level": 2,
     "image_url": "https://images.unsplash.com/photo-1608032077018-c9aad9565d29?w=800",
     "description": "Wood-fired sweet corn brushed with lime crema, cotija & smoked paprika.",
     "allergens": ["dairy"], "prep_minutes": 8, "rating": 4.6, "tags": ["spicy", "smoky"]},
    {"name": "Truffle Burrata", "category": "Appetizers", "price": 14.0, "is_veg": True, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1626200419199-391ae4be7f9d?w=800",
     "description": "Creamy Puglian burrata, black truffle honey, heirloom tomato.",
     "allergens": ["dairy"], "prep_minutes": 6, "rating": 4.9, "tags": ["indulgent", "classic"]},
    {"name": "Crispy Calamari", "category": "Appetizers", "price": 12.0, "is_veg": False, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800",
     "description": "Golden squid rings, lemon aioli, pickled chilli.",
     "allergens": ["shellfish", "gluten"], "prep_minutes": 10, "rating": 4.4, "tags": ["crispy"]},

    # Mains
    {"name": "Ember Ribeye 12oz", "category": "Mains", "price": 38.0, "is_veg": False, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
     "description": "Dry-aged ribeye, bone marrow butter, charred shallot, red-wine jus.",
     "allergens": ["dairy"], "prep_minutes": 25, "rating": 4.9, "tags": ["signature", "indulgent"]},
    {"name": "Saffron Risotto", "category": "Mains", "price": 22.0, "is_veg": True, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
     "description": "Carnaroli rice, saffron milanese, aged parmigiano, gold leaf.",
     "allergens": ["dairy"], "prep_minutes": 18, "rating": 4.7, "tags": ["creamy", "classic"]},
    {"name": "Miso Glazed Cod", "category": "Mains", "price": 29.0, "is_veg": False, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800",
     "description": "72-hour miso marinated black cod, pickled radish, dashi broth.",
     "allergens": ["fish", "soy"], "prep_minutes": 20, "rating": 4.8, "tags": ["umami"]},
    {"name": "Ash-Roasted Cauliflower", "category": "Mains", "price": 18.0, "is_veg": True, "spice_level": 2,
     "image_url": "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800",
     "description": "Whole cauliflower charred in oak ash, tahini, pomegranate, dukkah.",
     "allergens": ["sesame", "nuts"], "prep_minutes": 22, "rating": 4.5, "tags": ["smoky", "vegan"]},
    {"name": "Wagyu Truffle Burger", "category": "Mains", "price": 26.0, "is_veg": False, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
     "description": "A5 wagyu patty, truffle brie, caramelised onion, brioche.",
     "allergens": ["dairy", "gluten"], "prep_minutes": 15, "rating": 4.7, "tags": ["indulgent"]},

    # Pasta & Pizza
    {"name": "Cacio e Pepe", "category": "Pasta", "price": 19.0, "is_veg": True, "spice_level": 1,
     "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800",
     "description": "Hand-rolled tonnarelli, pecorino romano, cracked tellicherry pepper.",
     "allergens": ["gluten", "dairy"], "prep_minutes": 12, "rating": 4.8, "tags": ["classic"]},
    {"name": "Nduja & Honey Pizza", "category": "Pasta", "price": 21.0, "is_veg": False, "spice_level": 3,
     "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
     "description": "Sourdough base, spicy nduja, wildflower honey, stracciatella.",
     "allergens": ["gluten", "dairy"], "prep_minutes": 14, "rating": 4.6, "tags": ["spicy", "sweet-heat"]},

    # Desserts
    {"name": "Basque Cheesecake", "category": "Desserts", "price": 11.0, "is_veg": True, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800",
     "description": "Burnt-top cheesecake, cherry compote, salted caramel.",
     "allergens": ["dairy", "eggs"], "prep_minutes": 5, "rating": 4.9, "tags": ["indulgent"]},
    {"name": "Dark Chocolate Fondant", "category": "Desserts", "price": 12.0, "is_veg": True, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800",
     "description": "70% Valrhona molten centre, vanilla bean ice cream.",
     "allergens": ["dairy", "eggs", "gluten"], "prep_minutes": 12, "rating": 4.9, "tags": ["classic"]},

    # Drinks
    {"name": "Smoked Old Fashioned", "category": "Drinks", "price": 15.0, "is_veg": True, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800",
     "description": "Woodford Reserve, applewood smoke, orange bitters, brandied cherry.",
     "allergens": [], "prep_minutes": 5, "rating": 4.8, "tags": ["signature"]},
    {"name": "Elderflower Spritz", "category": "Drinks", "price": 12.0, "is_veg": True, "spice_level": 0,
     "image_url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800",
     "description": "St-Germain, prosecco, cucumber, mint, soda.",
     "allergens": [], "prep_minutes": 3, "rating": 4.5, "tags": ["light"]},
]

DEMO_INVENTORY = [
    {"name": "Ribeye", "unit": "kg", "stock": 8.0, "threshold": 3.0},
    {"name": "Cod", "unit": "kg", "stock": 4.5, "threshold": 2.0},
    {"name": "Cauliflower", "unit": "kg", "stock": 12.0, "threshold": 4.0},
    {"name": "Burrata", "unit": "pcs", "stock": 20.0, "threshold": 6.0},
    {"name": "Saffron", "unit": "g", "stock": 25.0, "threshold": 10.0},
    {"name": "Calamari", "unit": "kg", "stock": 6.0, "threshold": 2.0},
    {"name": "Wagyu", "unit": "kg", "stock": 3.0, "threshold": 2.0},
    {"name": "Pasta Dough", "unit": "kg", "stock": 5.5, "threshold": 2.0},
    {"name": "Pizza Dough", "unit": "kg", "stock": 7.0, "threshold": 2.5},
    {"name": "Chocolate", "unit": "kg", "stock": 4.0, "threshold": 1.5},
    {"name": "Corn", "unit": "kg", "stock": 6.5, "threshold": 2.0},
]

async def seed(db, owner_email: str):
    now = datetime.now(timezone.utc).isoformat()

    # Owner user
    if owner_email:
        existing = await db.users.find_one({"email": owner_email})
        if not existing:
            await db.users.insert_one({
                "user_id": _id("user"),
                "email": owner_email,
                "name": "Owner",
                "role": "admin",
                "password_hash": _hash("owner123"),
                "picture": "",
                "created_at": now,
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
                "user_id": _id("user"),
                "email": acc["email"],
                "name": acc["name"],
                "role": acc["role"],
                "password_hash": _hash(acc["password"]),
                "picture": "",
                "created_at": now,
            })

    # Menu
    if await db.menu_items.count_documents({}) == 0:
        for m in DEMO_MENU:
            doc = {
                "id": _id("item"),
                **m,
                "available": True,
            }
            await db.menu_items.insert_one(doc)

    # Tables
    if await db.tables.count_documents({}) == 0:
        for n in range(1, 13):
            await db.tables.insert_one({
                "number": n,
                "seats": 2 if n <= 4 else (4 if n <= 9 else 6),
                "status": "free",
                "current_order_id": None,
                "updated_at": now,
            })

    # Inventory
    if await db.inventory_items.count_documents({}) == 0:
        for inv in DEMO_INVENTORY:
            await db.inventory_items.insert_one({
                "id": _id("inv"),
                **inv,
                "updated_at": now,
            })

    return {"seeded": True}
