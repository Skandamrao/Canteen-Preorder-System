# Canteen Preorder System — Premium (Material UI Inspired)

## Quick Start
```bash
cd backend
npm install
npm run seed   # creates admin and sample menu
npm start
```
Open: http://localhost:5000 (frontend served statically)

**Demo Admin**: `admin@canteen.local` / `admin123`

## Features
- Role-based auth (JWT)
- Student: browse, cart, place order, mock UPI payment, order history
- Admin: manage menu, update order status, dashboard
- SQLite (embedded) using better-sqlite3 — no external DB needed

## Environment
Duplicate `.env.example` to `.env` if needed.
