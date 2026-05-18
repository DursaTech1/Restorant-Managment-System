# Restaurant Management System (RMS)

A full-stack restaurant management application with a Django REST API backend and a React frontend.

---

## Features

- **Menu** — browse available items with images, descriptions, and prices
- **Order management** — place orders, track kitchen status (Pending → Confirmed → Preparing → Ready → Served), and view order history
- **Reservations** — create and manage table reservations with overlap detection
- **Inventory** — track stock levels, define recipes per menu item, and get low-stock alerts
- **Tables** — manage dining tables and check availability for a given time window
- **Reports** — daily sales summary and stock alert dashboard
- **Admin panel** — modern Django admin powered by [django-unfold](https://unfoldadmin.com) with a custom sidebar and reports dashboard
- **Dark / light theme** — persisted per browser via `localStorage`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 6, Django REST Framework, SQLite |
| Admin UI | django-unfold |
| Image handling | Pillow |
| CORS | django-cors-headers |
| Frontend | React 19, React Router 6, Vite 6 |

---

## Project Structure

```
rms/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── db.sqlite3
│   ├── media/              # Uploaded menu item images
│   ├── templates/
│   │   └── admin/          # Custom admin templates (reports dashboard)
│   ├── restaurant/         # Main Django app (models, views, serializers, services)
│   └── rms_project/        # Django project settings and URL config
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── pages/          # MenuPage, PlaceOrderPage, OrdersPage, OrderDetailPage, ReservationsPage
        ├── components/     # Shared UI components
        ├── hooks/          # Custom React hooks
        └── utils/          # Formatting helpers
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Create a superuser for the admin panel
python manage.py createsuperuser

# Start the development server (runs on http://127.0.0.1:8000)
python manage.py runserver
```

### Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# (Optional) configure the API origin if not using the Vite proxy
cp .env.example .env
# Edit .env if needed

# Start the dev server (runs on http://localhost:5173)
npm run dev
```

---

## Environment Variables

The frontend reads one optional variable from `.env`:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_ORIGIN` | *(empty)* | Django server origin when not using the Vite proxy (e.g. `http://127.0.0.1:8000`) |

---

## API Endpoints

All endpoints are prefixed with `/api/`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/` | API root — links to all resources |
| GET | `/api/menu/` | List menu items (`?available_only=1` to filter) |
| GET | `/api/orders/` | List all orders |
| POST | `/api/orders/place/` | Place a new order |
| GET | `/api/orders/<id>/` | Order detail |
| PATCH | `/api/orders/<id>/status/` | Advance or cancel an order |
| GET / POST | `/api/reservations/` | List / create reservations |
| GET / PATCH | `/api/reservations/<id>/` | Retrieve or update a reservation |
| GET | `/api/inventory/` | List inventory items |
| GET / PATCH | `/api/inventory/<id>/` | Retrieve or update an inventory item |
| GET | `/api/tables/` | List tables |
| GET | `/api/tables/<id>/availability/` | Check table availability (`?starts_at=&ends_at=&party_size=`) |
| GET | `/api/reports/daily-sales/` | Daily revenue report (`?date=YYYY-MM-DD`) |
| GET | `/api/reports/stock-alerts/` | Items at or below low-stock threshold |

---

## Admin Panel

Access the admin at `http://127.0.0.1:8000/admin/` after creating a superuser.

The sidebar is organized into three sections:

- **Service** — Tables, Reservations, Orders, Reports dashboard
- **Menu & stock** — Menu items, Recipes, Inventory
- **Access** — Users, Groups

---

## Order Status Flow

```
PENDING → CONFIRMED → PREPARING → READY → SERVED
                                        ↘
                                      CANCELLED (from any state)
```

---

## Building for Production

```bash
# Frontend
cd frontend
npm run build
# Output is in frontend/dist/

# Backend — set DEBUG=False and configure ALLOWED_HOSTS in settings.py before deploying
```
