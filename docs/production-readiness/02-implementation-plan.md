# Phase 2: Implementation Plan

**Date**: 2026-11-09  
**Branch**: `feature/production-readiness`  
**Target**: Complete Production Readiness Transformation  

---

## 1. Objectives

1. Preserve all existing working functionality.
2. Complete all broken, missing, or partially implemented features (especially Product Search, Multi-Filter, Sorting, and Pagination).
3. Implement a complete validation engine across all input fields (Email, Phone, PIN code, Names, Passwords, Product details, File uploads, Customization).
4. Harden security: Rate limiting, HTTP security headers, CORS verification, CRLF prevention, and non-root Docker execution.
5. Upgrade infrastructure: Production Docker Compose (`docker-compose.prod.yml`), Nginx hardening, and GitHub Actions CI with SAST and linting.
6. Build a comprehensive test suite (Backend Pytest + Frontend Vitest) achieving high coverage of critical paths and validation edge cases.
7. Deliver complete documentation artifacts in `docs/production-readiness/`.

---

## 2. Step-by-Step Execution Sequence

### Step 1: Input Validation & Security Engine
- **Backend**:
  - Create `app/core/validators.py`: Strict standards-aware email validation (enforcing <= 320 total, <= 64 local, <= 255 domain, no control chars, no CRLF, no whitespace, valid domain format, normalized domain), Indian phone number format (E.164 and 10-digit formats), Indian PIN codes (6-digit numeric), clean string/Unicode text sanitization, control-character stripping.
  - Update Pydantic schemas in `app/schemas/` (`auth.py`, `order.py`, `product.py`, `common.py`) to utilize these strict validators.
  - Create `app/middleware/rate_limit.py`: In-memory sliding-window rate limiter for sensitive endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`).
  - Create `app/middleware/security.py`: HTTP security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`).
  - Create `app/middleware/request_id.py`: Request correlation ID middleware (`X-Request-ID`).
  - Create `app/core/logging.py`: Structured logging setup.
- **Frontend**:
  - Create `src/utils/validators.js`: Client-side validation mirror (email, phone, pincode, password complexity, text limits).
  - Update forms (`Register.jsx`, `Login.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `Checkout.jsx`, `Contact.jsx`, `AdminDashboard.jsx`) with `maxLength`, on-blur validation, user-friendly field-level error messages, and disabled states during invalid/submitting states.

### Step 2: Search, Multi-Filter, Sorting & Pagination (P0)
- **Backend**:
  - Update `backend/app/api/products.py`:
    - Add query parameters: `min_price: Decimal | None`, `max_price: Decimal | None`, `in_stock: bool | None`, `sort_by: str | None` (allowlist: `newest`, `price_asc`, `price_desc`, `rating`), `page: int`, `page_size: int`.
    - Apply efficient database filters and indexed order clauses.
  - Add Alembic migration `20261109_0003_product_indexes.py`:
    - Indexes on `products.price`, `products.created_at`, `products.rating`.
- **Frontend**:
  - Redesign `frontend/src/pages/Shop.jsx`:
    - Full filter sidebar / toolbar: Search input, Category selector, Price range inputs (min/max), In-stock only checkbox, Sort dropdown (Newest, Price: Low to High, Price: High to Low, Highest Rated), Clear/Reset filters button.
    - Full pagination controls: Previous/Next buttons, page number list, items counter, preserving query parameters in URL (`useSearchParams`).
    - Loading skeletons, empty results state with clear filter reset.

### Step 3: Shopping Cart, Customization & Reliability
- Guard `Cart.jsx` against missing `item.customization`.
- Ensure server-side pricing recalculation is bulletproof.
- Add database-backed readiness probe `/health/ready` that verifies DB connectivity.

### Step 4: Infrastructure & DevSecOps
- Create `backend/Dockerfile` with non-root user `appuser` (UID 10001), healthcheck.
- Harden `frontend/nginx.conf` with security headers, gzip, client body size limit (10M), caching for static assets.
- Create `docker-compose.prod.yml` with secure defaults, persistent volumes, restart policies.
- Update `.github/workflows/ci.yml` and create `.github/workflows/security.yml` (Bandit, Gitleaks).

### Step 5: Testing & Verification
- Backend tests:
  - Add tests for all search and filter combinations (price, category, stock, sorting, pagination).
  - Add tests for input validation (email lengths, whitespace, CRLF injection, Unicode names, phone numbers, PIN codes, negative prices, quantity bounds).
  - Add tests for rate limiting.
- Frontend tests:
  - Configure Vitest + @testing-library/react.
  - Add tests for validation utilities, `ProductCard`, `Shop`, `Cart`, and authentication forms.
- Run complete test suite and record results in `05-functional-test-report.md`.

### Step 6: Documentation Artifacts
Generate all required reports in `docs/production-readiness/`:
- `03-changes-log.md`
- `04-security-assessment.md`
- `05-functional-test-report.md`
- `06-performance-report.md`
- `07-production-deployment-guide.md`
- `08-production-readiness-checklist.md`
- `09-known-limitations.md`
- `10-validation-and-data-integrity.md`
