"""Iteration 6 — reservation status endpoint fix + regression."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


def _login(s, email, password):
    return s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)


def _h(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def guest_token(s):
    r = _login(s, "guest@ember.demo", "guest123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def staff_token(s):
    r = _login(s, "server@ember.demo", "staff123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def chef_token(s):
    r = _login(s, "chef@ember.demo", "chef123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def guest_b_token(s):
    """A second, fresh customer for negative ownership test."""
    email = f"TEST_guestb_{uuid.uuid4().hex[:8]}@embertest.com"
    r = s.post(f"{API}/auth/signup", json={"name": "TEST Guest B", "email": email, "password": "pass1234"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Bug fix: reservation cancel by owner ----------

def test_customer_can_cancel_own_reservation(s, guest_token):
    payload = {"name": "TEST OwnerCancel", "phone": "9999900001", "party_size": 2,
               "date": "2026-04-10", "time": "20:00"}
    r = s.post(f"{API}/reservations", json=payload, headers=_h(guest_token), timeout=15)
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    table_no = r.json().get("table_number")

    r = s.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"},
                headers=_h(guest_token), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "cancelled"

    # Assigned table (if any) should be freed
    if table_no:
        tables = s.get(f"{API}/tables", timeout=15)
        if tables.status_code == 200:
            for t in tables.json():
                if t.get("number") == table_no:
                    assert t.get("status") in ("free", "available"), \
                        f"Table {table_no} not freed: {t}"


def test_customer_cannot_cancel_others_reservation(s, guest_token, guest_b_token):
    payload = {"name": "TEST A_owned", "phone": "9999900002", "party_size": 2,
               "date": "2026-04-11", "time": "20:00"}
    r = s.post(f"{API}/reservations", json=payload, headers=_h(guest_token), timeout=15)
    assert r.status_code == 200
    rid = r.json()["id"]

    r = s.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"},
                headers=_h(guest_b_token), timeout=15)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    # cleanup: owner cancels
    s.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"},
            headers=_h(guest_token), timeout=15)


def test_customer_cannot_seat_own_reservation(s, guest_token):
    payload = {"name": "TEST CustSeat", "phone": "9999900003", "party_size": 2,
               "date": "2026-04-12", "time": "20:00"}
    r = s.post(f"{API}/reservations", json=payload, headers=_h(guest_token), timeout=15)
    assert r.status_code == 200
    rid = r.json()["id"]

    r = s.patch(f"{API}/reservations/{rid}/status", json={"status": "seated"},
                headers=_h(guest_token), timeout=15)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    # cleanup
    s.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"},
            headers=_h(guest_token), timeout=15)


def test_staff_can_seat_reservation_and_table_becomes_occupied(s, guest_token, staff_token):
    payload = {"name": "TEST StaffSeat", "phone": "9999900004", "party_size": 2,
               "date": "2026-04-13", "time": "20:00"}
    r = s.post(f"{API}/reservations", json=payload, headers=_h(guest_token), timeout=15)
    assert r.status_code == 200
    rid = r.json()["id"]
    table_no = r.json().get("table_number")

    r = s.patch(f"{API}/reservations/{rid}/status", json={"status": "seated"},
                headers=_h(staff_token), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "seated"

    if table_no:
        tables = s.get(f"{API}/tables", timeout=15)
        if tables.status_code == 200:
            found = [t for t in tables.json() if t.get("number") == table_no]
            if found:
                assert found[0].get("status") == "occupied", f"Table not occupied: {found[0]}"

    # cleanup — completing frees table
    s.patch(f"{API}/reservations/{rid}/status", json={"status": "completed"},
            headers=_h(staff_token), timeout=15)


# ---------- Regression: pure veg menu ----------

EXPECTED_KEYS = ["Paneer Tikka", "Palak Paneer", "Malai Kofta", "Veg Dum Biryani",
                 "Dal Makhani", "Rose Gulab Jamun", "Masala Chai Latte"]
FORBIDDEN = ["ribeye", "wagyu", "cod", "calamari", "nduja", "chicken", "beef",
             "fish", "mutton", "prawn", "shrimp", "bacon", "pork"]


def test_menu_pure_veg_regression(s):
    r = s.get(f"{API}/menu", timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 19, f"Expected 19 items, got {len(items)}"
    for it in items:
        assert it.get("is_veg") is True, f"non-veg leaked: {it['name']}"
        blob = (it["name"] + " " + it.get("description", "") + " " + " ".join(it.get("tags", []))).lower()
        for tok in FORBIDDEN:
            assert tok not in blob, f"Forbidden token '{tok}' in {it['name']}"
    names = {i["name"] for i in items}
    for exp in EXPECTED_KEYS:
        assert exp in names, f"missing {exp}"


# ---------- Regression: voice notes lifecycle ----------

def test_voice_notes_lifecycle_regression(s, chef_token, guest_token):
    payload = {"audio_base64": "AAAA" * 32, "mime_type": "audio/webm",
               "message": "TEST iter6", "dish_name": "Paneer Tikka",
               "duration_seconds": 8.0}
    # customer POST must 403
    r = s.post(f"{API}/voice-notes", json=payload, headers=_h(guest_token), timeout=15)
    assert r.status_code == 403, f"Customer POST should 403, got {r.status_code}"

    r = s.post(f"{API}/voice-notes", json=payload, headers=_h(chef_token), timeout=15)
    assert r.status_code == 200, r.text
    vid = r.json()["id"]

    r = s.get(f"{API}/voice-notes", timeout=15)
    assert r.status_code == 200
    assert any(n["id"] == vid for n in r.json())

    r = s.delete(f"{API}/voice-notes/{vid}", headers=_h(chef_token), timeout=15)
    assert r.status_code == 200


# ---------- Regression: order flow + bill fetch ----------

def test_order_flow_and_bill(s, guest_token):
    menu = s.get(f"{API}/menu", timeout=15).json()["items"]
    paneer = next(m for m in menu if m["name"] == "Paneer Tikka")
    biryani = next(m for m in menu if m["name"] == "Veg Dum Biryani")
    body = {"items": [
        {"item_id": paneer["id"], "name": paneer["name"], "price": paneer["price"], "qty": 1},
        {"item_id": biryani["id"], "name": biryani["name"], "price": biryani["price"], "qty": 1},
    ], "table_number": 3, "notes": "TEST iter6 order"}
    r = s.post(f"{API}/orders", json=body, headers=_h(guest_token), timeout=30)
    assert r.status_code == 200, r.text
    order = r.json()
    oid = order["id"]
    bill_id = order["bill_id"]

    # advance status placed→preparing→ready→served as admin/staff
    admin_r = _login(s, "server@ember.demo", "staff123")
    staff_tok = admin_r.json()["token"]
    for status in ["preparing", "ready", "served"]:
        r = s.patch(f"{API}/orders/{oid}/status", json={"status": status},
                    headers=_h(staff_tok), timeout=15)
        assert r.status_code == 200, f"advance to {status}: {r.status_code} {r.text}"

    r = s.get(f"{API}/bills/{bill_id}", headers=_h(guest_token), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("id") == bill_id or r.json().get("bill_id") == bill_id or "items" in r.json()


# ---------- AI Recommendations veg regression ----------

def test_ai_recommendations_only_veg(s, guest_token):
    r = s.get(f"{API}/ai/recommendations", headers=_h(guest_token), timeout=90)
    assert r.status_code == 200, r.text
    picks = r.json().get("picks", [])
    if not picks:
        pytest.skip("AI returned no picks")
    veg_names = {m["name"] for m in s.get(f"{API}/menu").json()["items"]}
    for p in picks:
        assert p["name"] in veg_names, f"AI leaked non-veg pick: {p['name']}"
