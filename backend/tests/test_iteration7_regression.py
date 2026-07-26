"""Iteration 7 regression tests: menu, search, reservation cancel by owner."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://restaurant-flow-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def guest_token():
    r = requests.post(f"{API}/auth/login", json={"email": "guest@ember.demo", "password": "guest123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _items(resp):
    j = resp.json()
    return j["items"] if isinstance(j, dict) and "items" in j else j


def test_pure_veg_menu_19_items():
    r = requests.get(f"{API}/menu", timeout=15)
    assert r.status_code == 200
    items = _items(r)
    assert len(items) == 19, f"expected 19, got {len(items)}"
    assert all(i.get("is_veg") is True for i in items)


def test_search_paneer_cuisines():
    r = requests.get(f"{API}/menu", params={"q": "paneer"}, timeout=15)
    assert r.status_code == 200
    assert len(_items(r)) >= 3


def test_search_italian():
    r = requests.get(f"{API}/menu", params={"q": "italian"}, timeout=15)
    assert r.status_code == 200
    assert len(_items(r)) >= 4


def test_reservation_owner_can_cancel(guest_token):
    h = {"Authorization": f"Bearer {guest_token}"}
    payload = {
        "name": "TEST_ReservOwner",
        "guest_name": "TEST_ReservOwner",
        "phone": "5551234567",
        "party_size": 2,
        "date": "2026-02-14",
        "time": "19:00",
        "time_slot": "19:00",
    }
    c = requests.post(f"{API}/reservations", json=payload, headers=h, timeout=15)
    assert c.status_code in (200, 201), c.text
    rid = c.json()["id"]
    d = requests.patch(f"{API}/reservations/{rid}/status", json={"status": "cancelled"}, headers=h, timeout=15)
    assert d.status_code == 200, d.text
    body = d.json()
    assert body.get("status") == "cancelled", body


def test_auth_me_unauthenticated():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code in (401, 403)


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": "guest@ember.demo", "password": "wrong"}, timeout=15)
    assert r.status_code in (400, 401, 403)
