# Migration notes: original Flask project → CustomGift v2

The original uploaded project was used as the functional reference and source of selected product imagery. The new project is a clean architecture rebuild rather than a line-by-line conversion.

| Original | Rebuilt version |
| --- | --- |
| Single `1.py` Flask application | Modular FastAPI routers, services, dependencies, schemas and models |
| Jinja templates | React SPA with React Router |
| Static CSS/JS pages | Reusable React components and responsive design system |
| Flask sessions | JWT bearer authentication |
| Plaintext passwords | scrypt password hashes with random salts |
| MySQL + `create_all()` | PostgreSQL + SQLAlchemy + Alembic migrations |
| One product per order | Multi-item orders with per-item personalization snapshots |
| Public order upload folder | Private local customization media, optional Cloudinary |
| Client-trusted payment success | Razorpay order creation + server-side HMAC signature verification |
| No CSRF-safe API separation | JSON REST API with bearer auth and backend authorization checks |
| Order ownership bugs | Ownership enforced in all customer order-detail access |
| Simple admin template | React admin dashboard with stats, catalog CRUD, users and fulfillment |
| No tests | pytest API authorization/auth/checkout/payment tests |
| Manual local setup | Docker Compose + Nginx + PostgreSQL + GitHub Actions CI |

## Features intentionally redesigned

- Product customization is data-driven (`needs_image`, `needs_text`, `needs_date`, `max_text_length`).
- Order items preserve product title, image and price snapshots so historical orders do not change when the catalog changes.
- Customer totals are derived from database prices on the server.
- Image uploads are validated as real image content and re-encoded to remove metadata.
- Cancelled orders restore inventory; delivered COD orders are marked paid automatically.
- The default payment flow is a safe demo mode until real Razorpay credentials are supplied.
