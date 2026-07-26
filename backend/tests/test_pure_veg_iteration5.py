"""Iteration 5 tests — pure-veg migration + voice notes lifecycle + AI regression."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_VEG_NAMES = {
    "Paneer Tikka", "Charred Corn Elote", "Truffle Burrata", "Crispy Halloumi Fries",
    "Palak Paneer", "Malai Kofta", "Veg Dum Biryani", "Dal Makhani", "Saffron Risotto",
    "Ash-Roasted Cauliflower", "Wild Mushroom Truffle Burger", "Cacio e Pepe",
    "Wild Mushroom Pizza", "Basque Cheesecake", "Dark Chocolate Fondant",
    "Rose Gulab Jamun", "Smoked Old Fashioned (Mocktail)", "Masala Chai Latte",
    "Elderflower Spritz (Zero-proof)",
}
FORBIDDEN_TOKENS = ["ribeye", "wagyu", "cod", "calamari", "nduja", "chicken", "beef", "fish", "mutton", "prawn", "shrimp", "bacon", "pork"]


@pytest.fixture(scope="session")
def s():
    return requests.Session()


def _login(s, email, password):
    return s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)


@pytest.fixture(scope="session")
def customer_token(s):
    r = _login(s, "guest@ember.demo", "guest123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def chef_token(s):
    r = _login(s, "chef@ember.demo", "chef123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def staff_token(s):
    r = _login(s, "server@ember.demo", "staff123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Bug 4 – Pure Veg Seed ----------

def test_menu_is_exactly_19_pure_veg(s):
    r = s.get(f"{API}/menu", timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 19, f"Expected 19 items, got {len(items)}"
    non_veg = [i for i in items if not i.get("is_veg")]
    assert non_veg == [], f"Non-veg leaked: {[i['name'] for i in non_veg]}"
    names = {i["name"] for i in items}
    assert names == EXPECTED_VEG_NAMES, f"Mismatch. Missing={EXPECTED_VEG_NAMES-names}, Extra={names-EXPECTED_VEG_NAMES}"


def test_no_forbidden_nonveg_tokens_in_menu(s):
    items = s.get(f"{API}/menu", timeout=15).json()["items"]
    for it in items:
        blob = (it["name"] + " " + it.get("description", "") + " " + " ".join(it.get("tags", []))).lower()
        for tok in FORBIDDEN_TOKENS:
            assert tok not in blob, f"Forbidden token '{tok}' found in item {it['name']}"


def test_expected_key_veg_items_present(s):
    items = s.get(f"{API}/menu", timeout=15).json()["items"]
    names = {i["name"] for i in items}
    for expected in ["Paneer Tikka", "Palak Paneer", "Malai Kofta", "Veg Dum Biryani",
                     "Dal Makhani", "Rose Gulab Jamun", "Masala Chai Latte"]:
        assert expected in names, f"Missing key veg item: {expected}"


# ---------- Bug 3 – Voice Notes cleared + lifecycle ----------

def test_voice_notes_initially_empty(s):
    r = s.get(f"{API}/voice-notes", timeout=15)
    assert r.status_code == 200
    assert r.json() == [], f"Expected empty voice notes, got {r.json()}"


def test_voice_notes_post_get_delete_lifecycle(chef_token, s):
    # POST — audio_base64 is required by the API
    payload = {
        "audio_base64": "AAAA" * 32,  # 128 bytes of dummy audio
        "mime_type": "audio/webm",
        "message": "TEST — try the paneer tonight",
        "dish_name": "Paneer Tikka",
        "duration_seconds": 12.0,
    }
    r = s.post(f"{API}/voice-notes", json=payload, headers=_h(chef_token), timeout=15)
    assert r.status_code == 200, r.text
    created = r.json()
    vid = created.get("id")
    assert vid, f"No id in response: {created}"

    # GET
    r = s.get(f"{API}/voice-notes", timeout=15)
    assert r.status_code == 200
    ids = [n["id"] for n in r.json()]
    assert vid in ids

    # DELETE
    r = s.delete(f"{API}/voice-notes/{vid}", headers=_h(chef_token), timeout=15)
    assert r.status_code == 200

    # confirm empty again
    r = s.get(f"{API}/voice-notes", timeout=15)
    assert r.status_code == 200
    assert all(n["id"] != vid for n in r.json())


# ---------- AI Recommendations veg only ----------

def test_ai_recommendations_only_veg(customer_token, s):
    r = s.get(f"{API}/ai/recommendations", headers=_h(customer_token), timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    picks = d.get("picks", [])
    assert len(picks) >= 1, f"Expected picks, got {picks}"
    menu_items = s.get(f"{API}/menu", timeout=15).json()["items"]
    veg_names = {m["name"] for m in menu_items}
    for p in picks:
        assert p["name"] in veg_names, f"AI recommended non-menu / non-veg item: {p['name']}"


# ---------- Order flow with 2 veg items ----------

def test_order_two_veg_items(s):
    email = f"TEST_veg_{uuid.uuid4().hex[:8]}@embertest.com"
    r = s.post(f"{API}/auth/signup", json={"name": "TEST Veg", "email": email, "password": "pass1234"}, timeout=30)
    assert r.status_code == 200
    tok = r.json()["token"]

    menu = s.get(f"{API}/menu", timeout=15).json()["items"]
    paneer = next(m for m in menu if m["name"] == "Paneer Tikka")
    biryani = next(m for m in menu if m["name"] == "Veg Dum Biryani")
    payload = {
        "items": [
            {"item_id": paneer["id"], "name": paneer["name"], "price": paneer["price"], "qty": 1},
            {"item_id": biryani["id"], "name": biryani["name"], "price": biryani["price"], "qty": 1},
        ],
        "table_number": 2,
        "notes": "TEST veg order",
    }
    r = s.post(f"{API}/orders", json=payload, headers=_h(tok), timeout=30)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["bill_id"]
    exp_sub = round(paneer["price"] + biryani["price"], 2)
    assert abs(o["subtotal"] - exp_sub) < 0.02


# ---------- Reservations create + cancel ----------

def test_reservation_create_and_cancel(customer_token, staff_token, s):
    payload = {"name": "TEST Rsv", "phone": "9999911111", "party_size": 2, "date": "2026-03-15", "time": "20:00"}
    r = s.post(f"{API}/reservations", json=payload, headers=_h(customer_token), timeout=15)
    assert r.status_code == 200, r.text
    rid = r.json()["id"]

    # cancel via PATCH /reservations/{id}/status (staff/admin only)
    r = s.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"}, headers=_h(staff_token), timeout=15)
    assert r.status_code in (200, 204), f"cancel failed: {r.status_code} {r.text}"
    assert r.json().get("status") == "cancelled"
