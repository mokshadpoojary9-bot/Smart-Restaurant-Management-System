"""Iteration 2 targeted tests: reservation update+memory, order flow, chef voice notes."""
import os
import time
import pytest
import requests

def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if not val:
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        val = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    assert val, "REACT_APP_BACKEND_URL not configured"
    return val.rstrip("/")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="module")
def chef():
    tok, u = _login("chef@ember.demo", "chef123")
    return {"token": tok, "user": u}


@pytest.fixture(scope="module")
def staff():
    tok, u = _login("server@ember.demo", "staff123")
    return {"token": tok, "user": u}


@pytest.fixture(scope="module")
def customer():
    tok, u = _login("guest@ember.demo", "guest123")
    return {"token": tok, "user": u}


# ------------------------ RESERVATION FLOW (Bug 1) ------------------------

def test_reservation_create_get_and_memory(customer):
    payload1 = {"name": "TEST_Res_A", "phone": "9111111111", "party_size": 2,
                "date": "2026-02-05", "time": "19:30"}
    r1 = requests.post(f"{API}/reservations", json=payload1, headers=_hdr(customer["token"]), timeout=15)
    assert r1.status_code == 200, r1.text
    res1 = r1.json()
    assert res1["status"] == "confirmed"
    assert res1["name"] == "TEST_Res_A"
    assert "id" in res1

    # Immediate GET must reflect it
    r_list = requests.get(f"{API}/reservations", headers=_hdr(customer["token"]), timeout=15)
    assert r_list.status_code == 200
    ids_1 = [x["id"] for x in r_list.json()]
    assert res1["id"] in ids_1, "Reservation not present in list immediately after POST"

    # Second reservation
    payload2 = {"name": "TEST_Res_B", "phone": "9222222222", "party_size": 4,
                "date": "2026-02-06", "time": "20:00"}
    r2 = requests.post(f"{API}/reservations", json=payload2, headers=_hdr(customer["token"]), timeout=15)
    assert r2.status_code == 200, r2.text
    res2 = r2.json()

    # Memory: both should persist
    r_list2 = requests.get(f"{API}/reservations", headers=_hdr(customer["token"]), timeout=15)
    assert r_list2.status_code == 200
    ids_2 = [x["id"] for x in r_list2.json()]
    assert res1["id"] in ids_2 and res2["id"] in ids_2, "Reservations memory lost"


def test_reservation_cancel_status_update_and_table_free(customer, staff):
    # Create fresh reservation
    payload = {"name": "TEST_Cancel", "phone": "9333333333", "party_size": 2,
               "date": "2026-02-07", "time": "18:00"}
    r = requests.post(f"{API}/reservations", json=payload, headers=_hdr(customer["token"]), timeout=15)
    assert r.status_code == 200
    res = r.json()
    rid = res["id"]
    tbl_num = res.get("table_number")

    # Cancel via PATCH (staff role required)
    r_cancel = requests.patch(f"{API}/reservations/{rid}/status",
                              json={"status": "cancelled"},
                              headers=_hdr(staff["token"]), timeout=15)
    assert r_cancel.status_code == 200, r_cancel.text
    updated = r_cancel.json()
    assert updated["status"] == "cancelled"

    # Verify assigned table (if any) is freed
    if tbl_num:
        r_tables = requests.get(f"{API}/tables", timeout=15)
        assert r_tables.status_code == 200
        t = next((x for x in r_tables.json() if x["number"] == tbl_num), None)
        assert t is not None
        assert t["status"] == "free", f"Table {tbl_num} not freed after cancel: {t['status']}"


def test_reservation_customer_cannot_patch_status(customer):
    # Create
    r = requests.post(f"{API}/reservations", json={"name": "TEST_NoPatch", "phone": "9444444444",
                                                    "party_size": 2, "date": "2026-02-08", "time": "18:30"},
                      headers=_hdr(customer["token"]), timeout=15)
    rid = r.json()["id"]
    # Customer trying to patch -> 403
    r2 = requests.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"},
                        headers=_hdr(customer["token"]), timeout=15)
    assert r2.status_code == 403


# ------------------------ MENU (Bug 2 informational) ------------------------

def test_menu_returns_14_items_and_5_categories():
    r = requests.get(f"{API}/menu", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert len(d["items"]) >= 14
    assert len(d["categories"]) >= 5


# ------------------------ ORDER FLOW (Bug 3) ------------------------

@pytest.fixture(scope="module")
def order_ctx(customer):
    menu = requests.get(f"{API}/menu", timeout=15).json()["items"]
    picks = [m for m in menu if m.get("available", True)][:2]
    assert len(picks) >= 2
    payload = {
        "items": [
            {"item_id": picks[0]["id"], "name": picks[0]["name"], "price": picks[0]["price"], "qty": 1},
            {"item_id": picks[1]["id"], "name": picks[1]["name"], "price": picks[1]["price"], "qty": 2},
        ],
        "table_number": 5,
        "notes": "TEST iter2 order",
    }
    r = requests.post(f"{API}/orders", json=payload, headers=_hdr(customer["token"]), timeout=30)
    assert r.status_code == 200, r.text
    return {"order": r.json(), "picks": picks}


def test_order_response_shape(order_ctx):
    o = order_ctx["order"]
    for k in ("id", "order_no", "subtotal", "tax", "service_charge", "total", "status", "bill_id"):
        assert k in o, f"missing key {k}"
    assert o["status"] == "placed"
    # Math
    expected_sub = round(
        order_ctx["picks"][0]["price"] * 1 + order_ctx["picks"][1]["price"] * 2, 2
    )
    assert abs(o["subtotal"] - expected_sub) < 0.02


def test_order_get_by_id(order_ctx, customer):
    oid = order_ctx["order"]["id"]
    r = requests.get(f"{API}/orders/{oid}", headers=_hdr(customer["token"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == oid


def test_order_status_advance_by_chef(order_ctx, chef):
    oid = order_ctx["order"]["id"]
    for status in ("preparing", "ready", "served"):
        r = requests.patch(f"{API}/orders/{oid}/status", json={"status": status},
                           headers=_hdr(chef["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == status


def test_bill_retrievable(order_ctx, customer):
    bill_id = order_ctx["order"]["bill_id"]
    r = requests.get(f"{API}/bills/{bill_id}", headers=_hdr(customer["token"]), timeout=15)
    assert r.status_code == 200
    b = r.json()
    assert b["order_id"] == order_ctx["order"]["id"]
    assert isinstance(b["items"], list) and len(b["items"]) == 2
    assert abs(b["total"] - order_ctx["order"]["total"]) < 0.02


# ------------------------ VOICE NOTES (Bug 4) ------------------------

def test_voice_note_create_by_chef(chef):
    payload = {
        "audio_base64": "aGVsbG8=",
        "mime_type": "audio/webm",
        "message": "Try the paneer tikka today!",
        "dish_name": "Paneer Tikka",
        "duration_seconds": 5.2,
    }
    r = requests.post(f"{API}/voice-notes", json=payload, headers=_hdr(chef["token"]), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["id"].startswith("vn_")
    assert d["message"].startswith("Try the paneer")
    assert d["dish_name"] == "Paneer Tikka"
    assert d["chef_name"]
    # Save for other tests via module scope-ish attribute
    pytest.voice_note_id = d["id"]


def test_voice_note_customer_forbidden(customer):
    r = requests.post(f"{API}/voice-notes",
                      json={"audio_base64": "aGVsbG8=", "mime_type": "audio/webm", "message": "hi"},
                      headers=_hdr(customer["token"]), timeout=15)
    assert r.status_code == 403


def test_voice_note_list_public_sorted_desc(chef):
    # Create a second, newer note
    time.sleep(1.1)
    r_new = requests.post(f"{API}/voice-notes",
                          json={"audio_base64": "aGVsbG8y", "mime_type": "audio/webm",
                                "message": "Latest tip", "dish_name": "Special"},
                          headers=_hdr(chef["token"]), timeout=15)
    assert r_new.status_code == 200
    newest_id = r_new.json()["id"]

    r = requests.get(f"{API}/voice-notes", timeout=15)  # public, no auth
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 2
    # sorted by created_at desc
    ts = [it["created_at"] for it in items]
    assert ts == sorted(ts, reverse=True), f"Voice notes not sorted desc: {ts}"
    assert items[0]["id"] == newest_id


def test_voice_note_size_guard(chef):
    big = "A" * 2_500_001
    r = requests.post(f"{API}/voice-notes",
                      json={"audio_base64": big, "mime_type": "audio/webm", "message": "big"},
                      headers=_hdr(chef["token"]), timeout=30)
    assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text[:200]}"


def test_voice_note_notification_broadcast_to_customer(chef, customer):
    # Create a note
    r_new = requests.post(f"{API}/voice-notes",
                          json={"audio_base64": "aGVsbG8z", "mime_type": "audio/webm",
                                "message": "Notice me", "dish_name": "TestDish"},
                          headers=_hdr(chef["token"]), timeout=15)
    assert r_new.status_code == 200
    vn_id = r_new.json()["id"]

    time.sleep(0.5)
    r_notif = requests.get(f"{API}/notifications", headers=_hdr(customer["token"]), timeout=15)
    assert r_notif.status_code == 200
    notes = r_notif.json()
    match = [n for n in notes if n.get("kind") == "voice-note" and n.get("meta", {}).get("voice_note_id") == vn_id]
    assert match, f"No voice-note notification for customer found. sample={notes[:3]}"


def test_voice_note_customer_delete_forbidden(customer):
    vn_id = getattr(pytest, "voice_note_id", None)
    if not vn_id:
        pytest.skip("no voice_note_id captured")
    r = requests.delete(f"{API}/voice-notes/{vn_id}", headers=_hdr(customer["token"]), timeout=15)
    assert r.status_code == 403


def test_voice_note_chef_delete_ok(chef):
    vn_id = getattr(pytest, "voice_note_id", None)
    if not vn_id:
        pytest.skip("no voice_note_id captured")
    r = requests.delete(f"{API}/voice-notes/{vn_id}", headers=_hdr(chef["token"]), timeout=15)
    assert r.status_code == 200
    # Verify not in list
    r_list = requests.get(f"{API}/voice-notes", timeout=15).json()
    assert not any(x["id"] == vn_id for x in r_list)
