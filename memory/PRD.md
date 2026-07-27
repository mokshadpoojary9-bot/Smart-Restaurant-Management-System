# Ember & Oak — Smart Restaurant OS (PRD)

## Original problem statement
Build a production-ready in-restaurant Smart Restaurant Management System (no delivery). Core: Live Item Availability, Digital Menu, Smart Reservations, Queue Management, Order/Billing workflows, Staff/Admin Dashboards, AI-powered insights (Gemini). Interactive 3D + flashcard UI. **100% pure vegetarian**. **Strict auth-first gate.**

## Tech stack (adapted from problem statement)
- Frontend: React (CRA), Tailwind, shadcn/ui, Framer Motion, react-three-fiber
- Backend: FastAPI, MongoDB (Motor)
- Auth: Custom JWT + Emergent-managed Google OAuth
- AI: Gemini 3 Flash via Emergent Universal LLM Key

## Roles
Admin/Owner · Kitchen · Server (Staff) · Diner (Customer)

## What's implemented
- Auth-first gate (`/` → `/login`), Google OAuth + JWT, RBAC
- 100% pure-veg digital menu (37 items) with 3D flip-cards, category filter, live availability
- Cart, orders, itemised bills (tax + service)
- Smart reservations + waiting queue (auto-table match, cancel flow)
- Admin, Kitchen KDS, Staff dashboards + Diner order tracking
- Backend AI service (`ai_service.py`) — chat/recommendations/forecast/inventory-alerts/weekly-insight
- Login page redesign with animated blobs, rotating hero word, glass card, **professional feature flashcards (Feb 2026)**

## Backlog / Roadmap
### P0
- **Platinum AI Tier UI wiring** — surface Demand Forecast charts, Inventory Risk alerts, Weekly Owner Digest, Preference-based recommendations on the Admin Dashboard
### P1
- QR-code table menu (scan → live menu view)
- PDF receipt / invoice download from Bill view
- **Folder/file restructuring** for judge-friendly navigation:
  `backend/routes/{auth,menu,orders,reservations,ai,staff,inventory}.py`
  `frontend/src/pages/{auth,customer,admin,staff,kitchen,ai}/`
### P2
- Delete dead files (`VoiceNotesPlayer.jsx`, `ChefVoiceNotes.jsx`) if still present
- Table-side pay flow, tip splitter, printable KDS ticket

## Constraints (do not violate)
1. 100% pure vegetarian everywhere — no non-veg items/tags/filters
2. Auth-first gate — no public landing page
3. Preserve OAuth fragment strip in `AuthCallback.jsx` (`window.history.replaceState`)
4. Do not reintroduce Voice Notes

## Test credentials
See `/app/memory/test_credentials.md`
