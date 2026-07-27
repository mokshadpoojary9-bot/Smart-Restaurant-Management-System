"""Iteration 12: Menu expansion validation (37 pure-veg items across 5 categories) + search regression."""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

BANNED = ["ribeye", "wagyu", "cod", "calamari", "nduja", "chicken", "beef", "fish", "mutton", "prawn", "shrimp", "bacon", "pork"]

REQUIRED_NAMES = [
    "Bruschetta Pomodoro", "Cauliflower Buffalo Wings", "Chana Chaat",
    "Paneer Butter Masala", "Chole Bhature", "Masala Dosa", "Buddha Bowl",
    "Shakshuka Vegetariana", "Falafel Mezze Platter", "Tofu Katsu Curry",
    "Aglio e Olio", "Margherita DOP Pizza", "Truffle Alfredo Fettuccine",
    "Mango Kulfi Falooda", "Tres Leches Cake", "Passion Fruit Cooler",
    "Lavender Honey Lemonade", "Cold Brew Coffee",
]

EXPECTED_CATS = {"Appetizers", "Desserts", "Drinks", "Mains", "Pasta"}


@pytest.fixture(scope="module")
def menu():
    r = requests.get(f"{BASE_URL}/api/menu", timeout=15)
    assert r.status_code == 200, f"GET /api/menu -> {r.status_code}"
    data = r.json()
    assert "items" in data and "categories" in data
    return data


def test_menu_has_37_items(menu):
    assert len(menu["items"]) == 37, f"Expected 37 items, got {len(menu['items'])}"


def test_menu_five_categories(menu):
    cats = set(menu["categories"])
    assert cats == EXPECTED_CATS, f"Categories mismatch: {cats} vs {EXPECTED_CATS}"


def test_all_items_are_veg(menu):
    non_veg = [i["name"] for i in menu["items"] if not i.get("is_veg", False)]
    assert not non_veg, f"Non-veg items present: {non_veg}"


def test_no_banned_tokens(menu):
    for it in menu["items"]:
        hay = " ".join([
            it.get("name", ""),
            it.get("description", ""),
            " ".join(it.get("tags", []) or []),
        ]).lower()
        for bad in BANNED:
            assert not re.search(rf"\b{bad}\b", hay), f"Banned token '{bad}' found in item: {it.get('name')} / {hay}"


def test_required_new_items_present(menu):
    names = {i["name"] for i in menu["items"]}
    missing = [n for n in REQUIRED_NAMES if n not in names]
    assert not missing, f"Missing required new items: {missing}"


def test_search_paneer(menu):
    q = "paneer"
    hits = [i for i in menu["items"] if q in (i["name"] + " " + i.get("description", "")).lower()
            or q in " ".join(i.get("tags", []) or []).lower()]
    assert len(hits) >= 4, f"'paneer' should match >=4 items, matched {len(hits)}: {[h['name'] for h in hits]}"


def test_search_italian(menu):
    q = "italian"
    hits = []
    for i in menu["items"]:
        hay = (i["name"] + " " + i.get("description", "") + " " + i.get("category", "") + " " +
               " ".join(i.get("tags", []) or [])).lower()
        if q in hay:
            hits.append(i["name"])
    assert len(hits) >= 7, f"'italian' should match >=7, matched {len(hits)}: {hits}"


def test_search_indian(menu):
    q = "indian"
    hits = []
    for i in menu["items"]:
        hay = (i["name"] + " " + i.get("description", "") + " " + i.get("category", "") + " " +
               " ".join(i.get("tags", []) or [])).lower()
        if q in hay:
            hits.append(i["name"])
    assert len(hits) >= 8, f"'indian' should match >=8, matched {len(hits)}: {hits}"


def test_demo_logins():
    """Regression: 3 demo accounts can log in."""
    creds = [
        ("guest@ember.demo", "guest123", "customer"),
        ("chef@ember.demo", "chef123", "kitchen"),
        ("server@ember.demo", "staff123", "staff"),
    ]
    for email, pwd, role in creds:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd}, timeout=10)
        assert r.status_code == 200, f"Login {email} -> {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data
        assert data["user"]["role"] == role, f"{email} role={data['user']['role']} expected {role}"
