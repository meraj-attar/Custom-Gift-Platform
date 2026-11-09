# CustomGift — Full-Stack Personalized E-Commerce Platform

CustomGift is a portfolio-ready e-commerce application for personalized gifts. It is a complete rebuild of an earlier Flask/Jinja prototype using a separated React frontend and FastAPI REST backend, with secure authentication, role-based administration, personalized order items, payment verification, migrations, tests and Docker.

## Tech stack

**Frontend:** React 18, Vite, React Router, Axios, Lucide icons, responsive custom CSS  
**Backend:** FastAPI, Python, SQLAlchemy 2, Pydantic, JWT, scrypt password hashing  
**Database:** PostgreSQL in Docker; SQLite fallback for local backend development  
**Payments:** Razorpay with server-side signature verification; safe demo-payment mode without credentials  
**Media:** Cloudinary when configured; validated local fallback  
**DevOps:** Docker Compose, Nginx, Alembic, pytest, GitHub Actions CI

## Features

- Responsive, polished storefront with featured gifts, categories, search and product details.
- Dynamic personalization fields per product: photo, message, occasion and event date.
- Secure customer photo upload with MIME/content validation, image dimension limits and metadata-stripping re-encoding.
- Persistent gift bag and multi-item checkout.
- JWT authentication, scrypt password hashing and password-reset tokens.
- Customer-only order history and order-detail ownership checks.
- Order lifecycle: confirmed → processing → customizing → shipped → delivered.
- Cash on delivery and Razorpay checkout.
- Razorpay orders created server-side and payments accepted only after signature verification.
- Demo payment mode so reviewers can exercise the payment flow without real credentials.
- Admin dashboard with metrics, product CRUD, image upload, inventory, users, fulfillment controls and protected personalization previews.
- PostgreSQL schema migrations with Alembic.
- Seeded demo catalog using product imagery retained from the original project.
- API tests for authentication and cross-user order authorization.
- Dockerized frontend/backend/database and CI workflow.

## Project structure

```text
CustomGift-Platform/
├── backend/
│   ├── app/
│   │   ├── api/            # REST routers
│   │   ├── core/           # config, database, security
│   │   ├── dependencies/   # auth/RBAC dependencies
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── services/       # uploads, email, payments, slugs
│   │   ├── main.py
│   │   └── seed.py
│   ├── alembic/            # database migrations
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/products/    # curated original product imagery
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
├── docs/ARCHITECTURE.md
├── docker-compose.yml
└── README.md
```


Open:

- Storefront: `http://localhost:5173`
- FastAPI docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

The default demo admin is:



Change those values in `.env` before deploying anywhere public.

## Run without Docker

### Backend

```bash
cd backend
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

For a zero-setup development database, change `DATABASE_URL` in `backend/.env` to:

```text
DATABASE_URL=sqlite:///./customgift.db
APP_ENV=development
```

Then run:

```bash
uvicorn app.main:app --reload
```

Development mode creates the SQLite tables and seeds the catalog/admin idempotently.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## PostgreSQL migrations

Docker runs these automatically. Manually:

```bash
cd backend
alembic upgrade head
python -m app.seed
```

To generate a future migration after changing SQLAlchemy models:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Razorpay modes

### Demo mode

Default:

```text
PAYMENT_DEMO_MODE=true
```

The frontend still exercises the order → payment-order → payment-completion backend flow, but no external payment is collected.

### Live/test Razorpay integration

Set:

```text
PAYMENT_DEMO_MODE=false
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

The backend creates the Razorpay order. The React checkout opens Razorpay Checkout and sends `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature` back to FastAPI. The order is marked `PAID` only after the backend verifies the signature.

## Cloudinary

Add the three Cloudinary values in `.env` to store new product and personalization images in Cloudinary. Without them, product images use the backend media folder while customer customization images are stored outside the publicly mounted static path.

## Password reset

Configure SMTP values for real email delivery. During local `APP_ENV=development`, the API also returns the generated reset URL so the complete flow can be tested without an SMTP account. Production mode does not expose it.

## Tests

```bash
cd backend
pytest -q
```

The included test suite covers authentication, admin authorization, cross-user order isolation, customization validation, server-calculated totals, demo payments and fulfillment/payment state rules.

## Production checklist

- Replace the JWT secret and seeded admin credentials.
- Set strict production CORS origins.
- Configure HTTPS at your reverse proxy or hosting platform.
- Disable payment demo mode only after valid Razorpay credentials are configured.
- Use Cloudinary/S3-style managed storage for persistent customer uploads.
- Configure SMTP and rate limiting.
- Run Alembic migrations as part of deployment.

See [`SECURITY.md`](SECURITY.md) for additional notes.

## Resume description

**CustomGift — Full-Stack Personalized E-Commerce Platform**  
**React.js · FastAPI · PostgreSQL · SQLAlchemy · JWT · Razorpay · Cloudinary · Docker**

- Built a full-stack personalized-gifting e-commerce platform with a React SPA and FastAPI REST API.
- Designed normalized order/item models and dynamic product customization for customer photos, text, occasions and dates.
- Implemented JWT authentication, role-based access control, scrypt password hashing and ownership-protected customer resources.
- Integrated Razorpay with backend order creation and server-side signature verification plus a credential-free demo mode.
- Built an admin dashboard for catalog, inventory, users, payments and fulfillment-status management.
- Used PostgreSQL, SQLAlchemy and Alembic migrations, with optional Cloudinary media storage.
- Added automated API tests, Docker Compose, Nginx and GitHub Actions CI.
