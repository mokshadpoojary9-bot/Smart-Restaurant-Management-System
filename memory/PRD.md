# Ember & Oak — Smart Restaurant OS (PRD)

## Original problem statement
Build a production-ready in-restaurant Smart Restaurant Management System (no delivery). Core: Live Item Availability, Digital Menu, Smart Reservations, Queue Management, Order/Billing workflows, Staff/Admin Dashboards, AI-powered insights (Gemini). Interactive 3D + flashcard UI. **100% pure vegetarian**. **Strict auth-first gate.**

## Tech stack
- Frontend: React (CRA), Tailwind, shadcn/ui, Framer Motion, react-three-fiber
- Backend: FastAPI, MongoDB (Motor)
- Auth: Custom JWT + Emergent-managed Google OAuth
- AI: Gemini 3 Flash via Emergent Universal LLM Key

## Roles
Admin/Owner · Kitchen · Server (Staff) · Diner (Customer)

## Repo layout (Feb 2026 restructure — judge-friendly)

### Backend (`/app/backend/`)
```
server.py            # FastAPI entry — mounts routers only
db.py                # Motor client + DB_NAME + OWNER_EMAIL
utils.py             # gen_id, now_iso, password + JWT helpers
deps.py              # get_current_user, require_roles
models.py            # Pydantic request/response models
notifications.py     # push_notification helpers + notification routes
ai_service.py        # Gemini logic (chat, forecast, weekly, recs, inv)
seed_data.py         # 37 pure-veg items + demo accounts + tables + inventory
routes/
  auth.py            # signup, login, OAuth session, /me, logout
  menu.py            # list/get/create/update/delete menu items
  orders.py          # orders + bills
  tables.py          # physical tables
  reservations.py    # reservations + walk-in queue
  inventory.py       # inventory + restock
  staff.py           # staff mgmt + customer roster
  analytics.py       # owner analytics summary
  ai.py              # /ai/chat, /ai/recommendations, /ai/forecast, ...
```

### Frontend (`/app/frontend/src/pages/`)
```
auth/       Login.jsx · Register.jsx · AuthCallback.jsx
customer/   Landing.jsx · CustomerMenu.jsx · CartPage.jsx · MyOrders.jsx
            OrderTrack.jsx · BillView.jsx · Reservations.jsx
admin/      AdminLayout + Dashboard/Orders/Tables/Menu/Inventory/Staff/Analytics
staff/      StaffView.jsx
kitchen/    KitchenKDS.jsx
```

## What's implemented
- Auth-first gate (`/` → `/login`), Google OAuth + JWT, RBAC
- 100% pure-veg digital menu (37 items) — 3D flip-cards, category filter, live availability
- Cart, orders, itemised bills (tax + service)
- Smart reservations + waiting queue (auto-table match, cancel flow)
- Admin, Kitchen KDS, Staff dashboards + Diner order tracking
- AI service — chat/recommendations/forecast/inventory-alerts/weekly-insight
- Login page redesign — animated blobs, rotating hero word, glass card
- **Repo restructure (Feb 2026)** — backend split into `routes/` + shared modules; frontend pages grouped by role
- **Dead voice-notes code removed** (Feb 2026) — `VoiceNotesPlayer.jsx`, `ChefVoiceNotes.jsx` deleted, imports scrubbed

## Backlog / Roadmap
### P0
- **Platinum AI Tier UI wiring** — surface Demand Forecast charts, Inventory Risk alerts, Weekly Owner Digest, Preference-based recommendations on the Admin Dashboard
### P1
- QR-code table menu (scan → live menu view)
- PDF receipt / invoice download from Bill view
### P2
- Table-side pay flow, tip splitter, printable KDS ticket

## Constraints (do not violate)
1. 100% pure vegetarian everywhere — no non-veg items/tags/filters
2. Auth-first gate — no public landing page
3. Preserve OAuth fragment strip in `AuthCallback.jsx` (`window.history.replaceState`)
4. Do not reintroduce Voice Notes
5. uvicorn runs from `/app/backend` — inside `routes/*.py` use absolute imports (`from db import db`), never relative (`from ..db`)

## Test credentials
See `/app/memory/test_credentials.md`
