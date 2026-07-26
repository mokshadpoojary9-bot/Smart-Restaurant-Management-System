# PRD — Ember & Oak Smart Restaurant OS

## Original Problem Statement
VibeAthon 6.0 Smart Restaurant Management System — a production-ready in-restaurant operations platform (NOT delivery). Solves 7 problems: live availability, digital menu, smart reservations+queue, real-time order flow, auto billing+inventory, unified staff coordination, AI insights & forecasting.

## Architecture (adapted from spec)
- **Frontend**: React 19 (CRA) + Tailwind + shadcn/ui + Framer Motion + @react-three/fiber + react-router
- **Backend**: FastAPI + Motor (async MongoDB)
- **DB**: MongoDB
- **Auth**: Emergent Google OAuth (session_token cookie) + JWT email/password — RBAC (customer, staff, kitchen, admin)
- **AI**: Gemini 3 Flash via Emergent Universal LLM Key (`emergentintegrations` lib) — streaming chat via SSE
- **Realtime**: Polling every 3-5s (Supabase Realtime substitute)

## User Personas
1. **Diner (customer)** — browses menu, books/queues, orders, tracks, pays
2. **Server / Staff** — manages tables, reservations, order queue
3. **Kitchen (KDS)** — receives tickets, marks preparing/ready/served, toggles availability (86 list)
4. **Restaurant Admin / Owner (radharamanmdp@gmail.com)** — full analytics, AI insights, inventory, staff mgmt

## Implemented (v1 — 2026-02)
- Landing with 3D rotating plate (react-three-fiber v9), 7-problem grid, roles section, CTA
- Auth: email/password + Emergent Google OAuth; owner email auto-promoted to admin
- Customer: flip-card menu (front image/price/veg badge/rating; back allergens/prep/story/add), search+category+veg filter, AI recommendations panel (Gemini), cart, place order → live tracking (stepper) → printable bill
- Reservations + walk-in queue with auto table assignment and live ETA
- Staff board: active orders + advance status, table map (flip cards), reservations, queue seating
- Kitchen KDS: 4-column Kanban (Incoming/Preparing/Ready/Served) with urgency flag by prep time, 86-list availability toggles
- Admin dashboard: KPI flip cards, revenue chart, hourly chart, AI weekly insight, AI forecast, AI inventory alerts
- Admin CRUD: menu (add/edit/delete/toggle), inventory (restock/threshold/low-stock alerts), staff & customers CRM
- Analytics page: daily revenue area chart, top items horizontal bar
- Notifications: role-scoped bell with polling, low-stock and order-status pushes
- AI: streaming chat widget (Gemini SSE), recommendations, weekly insight, demand forecast, inventory prediction
- Auto-decrement inventory on order placement + auto-generated bill on every order
- Seed: 14 dishes across 5 categories, 12 tables, 11 inventory items, 3 demo staff accounts

## Deferred / Backlog (P1)
- QR code table menu
- Loyalty/rewards points
- Coupons/promo codes
- Customer reviews & ratings
- Voice search / voice ordering
- Multi-language menu
- PWA + offline support

## Known Compromises
- Realtime is 3-5s polling, not push (Supabase substitute).
- OTP verification for email/password is not implemented (fast MVP; JWT + Google covers login).
