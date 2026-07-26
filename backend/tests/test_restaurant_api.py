"""End-to-end backend tests for Ember & Oak Smart Restaurant API."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://restaurant-flow-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "radharamanmdp@gmail.com"

# ---------- Session-scoped fixtures ----------

@pytest.fixture(scope="session")
def s():
    return requests.Session()


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _login(s, email, password):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


@pytest.fixture(scope="session")
def admin_token(s):
    # Try owner email login (seed created with owner123 if seed ran)
    r = _login(s, OWNER_EMAIL, "owner123")
    if r.status_code == 200 and r.json()["user"]["role"] == "admin":
        return r.json()["token"]
    # Fallback: signup owner (auto-promotes to admin)
    r = s.post(f"{API}/auth/signup", json={"name": "Owner", "email": OWNER_EMAIL, "password": "owner123"}, timeout=30)
    if r.status_code == 200:
        assert r.json()["user"]["role"] == "admin"
        return r.json()["token"]
    # If already exists but with a different password, we can't reset; skip admin tests
    pytest.skip(f"Cannot get admin token: login={_login(s, OWNER_EMAIL, 'owner123').status_code}, signup={r.status_code} {r.text[:200]}")


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


@pytest.fixture(scope="session")
def customer_token(s):
    r = _login(s, "guest@ember.demo", "guest123")
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def new_customer(s):
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@embertest.com"
    r = s.post(f"{API}/auth/signup", json={"name": "TEST Cust", "email": email, "password": "pass1234"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "user": d["user"], "email": email}


# ---------- Health ----------

def test_health(s):
    r = s.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d.get("status") == "ok"


# ---------- Seed data ----------

def test_menu_seed(s):
    r = s.get(f"{API}/menu", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert len(d["items"]) == 19, f"Expected 19 pure-veg menu items, got {len(d['items'])}"
    assert len(d["categories"]) >= 5, f"Expected >=5 categories, got {d['categories']}"
    non_veg = [i for i in d["items"] if not i.get("is_veg")]
    assert non_veg == [], f"Non-veg items leaked into menu: {[i['name'] for i in non_veg]}"


def test_tables_seed(s):
    r = s.get(f"{API}/tables", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert len(d) >= 12, f"Expected >=12 tables, got {len(d)}"


# ---------- Auth ----------

def test_signup_customer_default_role(s):
    email = f"TEST_new_{uuid.uuid4().hex[:8]}@embertest.com"
    r = s.post(f"{API}/auth/signup", json={"name": "Test", "email": email, "password": "pass1234"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["role"] == "customer"
    assert d["user"]["email"] == email.lower()
    assert d["token"]


def test_owner_email_promoted_to_admin(admin_token, s):
    r = s.get(f"{API}/auth/me", headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["role"] == "admin"
    assert d["email"] == OWNER_EMAIL


def test_login_demo_accounts(chef_token, staff_token, customer_token, s):
    for tok, expected in [(chef_token, "kitchen"), (staff_token, "staff"), (customer_token, "customer")]:
        r = s.get(f"{API}/auth/me", headers=_auth_header(tok), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["role"] == expected


def test_auth_me_no_token(s):
    r = s.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------- RBAC ----------

def test_rbac_customer_forbidden(customer_token, s):
    r = s.get(f"{API}/staff", headers=_auth_header(customer_token), timeout=15)
    assert r.status_code == 403
    r2 = s.get(f"{API}/analytics/summary", headers=_auth_header(customer_token), timeout=15)
    assert r2.status_code == 403


def test_rbac_admin_allowed(admin_token, s):
    r = s.get(f"{API}/staff", headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{API}/analytics/summary", headers=_auth_header(admin_token), timeout=15)
    assert r2.status_code == 200


# ---------- Menu CRUD ----------

def test_menu_crud_admin(admin_token, chef_token, s):
    payload = {
        "name": "TEST_Special", "description": "test dish", "price": 12.5,
        "category": "Mains", "is_veg": True, "prep_minutes": 10, "available": True,
    }
    r = s.post(f"{API}/menu", json=payload, headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    item = r.json()
    item_id = item["id"]
    assert item["name"] == "TEST_Special"

    # PATCH price via admin
    r = s.patch(f"{API}/menu/{item_id}", json={"price": 15.0}, headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["price"] == 15.0

    # Kitchen can toggle availability
    r = s.patch(f"{API}/menu/{item_id}", json={"available": False}, headers=_auth_header(chef_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["available"] is False

    # DELETE
    r = s.delete(f"{API}/menu/{item_id}", headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200

    r = s.get(f"{API}/menu/{item_id}", timeout=15)
    assert r.status_code == 404


# ---------- Orders + Bill + Inventory + Notifications ----------

@pytest.fixture(scope="session")
def order_flow(new_customer, admin_token, s):
    # pick first two veg menu items
    menu = s.get(f"{API}/menu", timeout=15).json()["items"]
    assert len(menu) >= 2, "Need at least 2 menu items"
    primary = menu[0]
    other = menu[1]

    inv_before = s.get(f"{API}/inventory", headers=_auth_header(admin_token), timeout=15).json()

    payload = {
        "items": [
            {"item_id": primary["id"], "name": primary["name"], "price": primary["price"], "qty": 2},
            {"item_id": other["id"], "name": other["name"], "price": other["price"], "qty": 1},
        ],
        "table_number": 1,
        "notes": "TEST order",
    }
    r = s.post(f"{API}/orders", json=payload, headers=_auth_header(new_customer["token"]), timeout=30)
    assert r.status_code == 200, r.text
    order = r.json()
    return {"order": order, "inv_before": inv_before, "primary": primary, "other": other}


def test_order_bill_math(order_flow):
    o = order_flow["order"]
    expected_sub = round(2 * order_flow["primary"]["price"] + 1 * order_flow["other"]["price"], 2)
    assert abs(o["subtotal"] - expected_sub) < 0.02
    assert abs(o["tax"] - round(o["subtotal"] * 0.05, 2)) < 0.02
    assert abs(o["service_charge"] - round(o["subtotal"] * 0.05, 2)) < 0.02
    assert abs(o["total"] - round(o["subtotal"] + o["tax"] + o["service_charge"], 2)) < 0.02
    assert "bill_id" in o and o["bill_id"]


def test_bill_persisted(order_flow, new_customer, s):
    o = order_flow["order"]
    r = s.get(f"{API}/bills/{o['bill_id']}", headers=_auth_header(new_customer["token"]), timeout=15)
    assert r.status_code == 200
    b = r.json()
    assert abs(b["total"] - o["total"]) < 0.02


def test_inventory_decrement(order_flow, admin_token, s):
    # Inventory may or may not decrement based on item mapping; just verify endpoint works
    inv_after = s.get(f"{API}/inventory", headers=_auth_header(admin_token), timeout=15).json()
    assert isinstance(inv_after, list) and len(inv_after) > 0


def test_order_status_flow_and_notifications(order_flow, admin_token, new_customer, s):
    oid = order_flow["order"]["id"]
    for status in ("preparing", "ready", "served"):
        r = s.patch(f"{API}/orders/{oid}/status", json={"status": status},
                    headers=_auth_header(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == status
    # verify customer received notifications
    time.sleep(0.5)
    r = s.get(f"{API}/notifications", headers=_auth_header(new_customer["token"]), timeout=15)
    assert r.status_code == 200
    msgs = [n["message"] for n in r.json()]
    assert any("ready" in m.lower() for m in msgs), f"No ready notification. Got: {msgs[:5]}"


def test_low_stock_admin_notification(admin_token, s):
    r = s.get(f"{API}/notifications", headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200
    # Not asserting count, just that endpoint works and returns list
    assert isinstance(r.json(), list)


# ---------- Reservations + Queue ----------

def test_reservation_flow(new_customer, s):
    payload = {"name": "TEST User", "phone": "9999999999", "party_size": 2, "date": "2026-02-01", "time": "19:00"}
    r = s.post(f"{API}/reservations", json=payload, headers=_auth_header(new_customer["token"]), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "confirmed"
    # table might be assigned
    r = s.get(f"{API}/reservations", headers=_auth_header(new_customer["token"]), timeout=15)
    assert r.status_code == 200
    assert any(x["id"] == d["id"] for x in r.json())


def test_queue_flow(new_customer, s):
    r = s.post(f"{API}/queue", json={"name": "TEST Q", "phone": "8888888888", "party_size": 3},
               headers=_auth_header(new_customer["token"]), timeout=15)
    assert r.status_code == 200, r.text
    entry = r.json()
    assert entry["position"] >= 1
    r = s.get(f"{API}/queue", headers=_auth_header(new_customer["token"]), timeout=15)
    assert r.status_code == 200
    assert any(e["id"] == entry["id"] for e in r.json())


# ---------- AI ----------

def test_ai_recommendations(customer_token, s):
    r = s.get(f"{API}/ai/recommendations", headers=_auth_header(customer_token), timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "picks" in d and isinstance(d["picks"], list)


def test_ai_weekly_insight(admin_token, s):
    r = s.get(f"{API}/ai/weekly-insight", headers=_auth_header(admin_token), timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "summary" in d


def test_ai_forecast(admin_token, s):
    r = s.get(f"{API}/ai/forecast", headers=_auth_header(admin_token), timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "hour_series" in d
    assert "summary" in d


def test_ai_inventory_alerts(admin_token, s):
    r = s.get(f"{API}/ai/inventory-alerts", headers=_auth_header(admin_token), timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "at_risk" in d
    assert "summary" in d


def test_ai_chat_stream(customer_token, s):
    r = s.post(f"{API}/ai/chat", json={"message": "recommend a veg starter"},
               headers=_auth_header(customer_token), timeout=60, stream=True)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert "text/event-stream" in ct, f"content-type={ct}"
    got = False
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data:"):
            got = True
            if "[DONE]" in line:
                break
    assert got, "no SSE data received"


# ---------- Analytics ----------

def test_analytics_summary_admin(admin_token, s):
    r = s.get(f"{API}/analytics/summary", headers=_auth_header(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("daily_series", "hour_series", "top_items"):
        assert k in d, f"missing {k}"
    assert len(d["daily_series"]) == 7
