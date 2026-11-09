# Architecture

```text
React SPA / Nginx
      |
      | JSON + JWT
      v
FastAPI REST API
  |      |       |
  |      |       +--> Razorpay (optional live mode)
  |      +----------> Cloudinary (optional cloud uploads)
  +-----------------> PostgreSQL
```

## Security boundaries

- Passwords are stored only as scrypt hashes.
- JWT access tokens are required for customer and admin API operations.
- Admin routes enforce the `admin` role in the backend, not only in React.
- Order lookups require ownership unless the authenticated user is an administrator.
- Product prices and order totals are calculated from database values on the server.
- Razorpay live payments are marked paid only after server-side signature verification.
- Local customer customization uploads are not mounted as public static files.
- Product uploads are restricted to validated JPG/PNG/WEBP content, bounded dimensions and a configurable size limit; images are re-encoded to remove metadata.

## Data model

- `users`: customers and administrators with role-based access.
- `products`: catalog, stock, personalization requirements and merchandising metadata.
- `orders`: customer/shipping/payment/fulfillment state.
- `order_items`: immutable product snapshots plus per-item personalization.
- `contact_messages`: contact form submissions.

## Environments

Development can use SQLite automatically for a zero-setup backend. Docker Compose uses PostgreSQL and runs Alembic migrations before starting FastAPI.
