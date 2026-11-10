# Phase 3 & 4: Changes Log

**Date**: 2026-11-09  
**Branch**: `feature/production-readiness`  

---

## 1. Summary of Changes

This log documents every architectural, functional, security, and infrastructure modification applied during the production readiness transformation of CustomGift.

---

## 2. Modified and Created Files

### Backend
| File | Action | Purpose / Reason |
|---|---|---|
| `backend/app/core/validators.py` | **Created** | Centralized validation engine enforcing RFC 5321/5322 email constraints, CRLF protection, control-character stripping, Indian/international phone formats, 6-digit Indian PIN codes, Unicode text bounds, and password complexity. |
| `backend/app/middleware/rate_limit.py` | **Created** | Thread-safe sliding-window rate limiter protecting sensitive authentication and inquiry endpoints (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/contact`). |
| `backend/app/middleware/security.py` | **Created** | Standard HTTP security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`). |
| `backend/app/middleware/request_id.py` | **Created** | Request correlation ID (`X-Request-ID`) propagation for distributed observability. |
| `backend/app/core/logging.py` | **Created** | Centralized structured logging configuration. |
| `backend/app/main.py` | **Modified** | Wired custom middlewares, initialized logging, added `/health/ready` database readiness probe. |
| `backend/app/models/entities.py` | **Modified** | Added indexes to `Product.price`, `Product.created_at`, and `Product.rating` for fast query performance. |
| `backend/app/schemas/auth.py` | **Modified** | Bound Pydantic validators for email, phone, name, and address to strict validation engine. |
| `backend/app/schemas/order.py` | **Modified** | Applied field validators on customer name, phone, email, address, city, state, pincode, custom text, and occasion. |
| `backend/app/schemas/common.py` | **Modified** | Applied field validators on contact name, email, subject, and message. |
| `backend/app/api/products.py` | **Modified** | Added query parameters for `min_price`, `max_price`, `in_stock`, `sort_by` (allowlisted: `featured`, `newest`, `price_asc`, `price_desc`, `rating`), and integrated database ordering/pagination. |
| `backend/app/services/email_service.py` | **Modified** | Hardened email recipient and sender handling against CRLF injection. |
| `backend/alembic/versions/20261109_0003_product_indexes.py` | **Created** | Database migration for `products.price`, `products.created_at`, `products.rating` indexes with forward and rollback support. |
| `backend/tests/test_validation.py` | **Created** | Automated unit and integration tests for email lengths, whitespaces, CRLF injection, phone formats, PIN codes, password strength, health probes, and rate limiting. |
| `backend/tests/test_product_filters.py` | **Created** | Automated tests for title/description/category search, price range filtering, stock filtering, sorting options, and combined pagination. |

### Frontend
| File | Action | Purpose / Reason |
|---|---|---|
| `frontend/src/utils/validators.js` | **Created** | Client-side validation mirror enforcing regex, max lengths, on-blur checks, and sanitization before API submission. |
| `frontend/src/pages/Register.jsx` | **Modified** | Added `maxLength` attributes, on-blur validation, inline field error messages, and submit guards. |
| `frontend/src/pages/Login.jsx` | **Modified** | Added `maxLength`, email format validation, and on-blur error messages. |
| `frontend/src/pages/ForgotPassword.jsx` | **Modified** | Added email format validation, `maxLength`, and on-blur error feedback. |
| `frontend/src/pages/Checkout.jsx` | **Modified** | Added delivery address field-level validation, on-blur errors, `maxLength` attributes, and pre-submit validation. |
| `frontend/src/pages/Contact.jsx` | **Modified** | Added field-level validation, on-blur error messages, and bounds. |
| `frontend/src/pages/Cart.jsx` | **Modified** | Protected against potential null/undefined pointer on `item.customization`. |
| `frontend/src/pages/Shop.jsx` | **Modified** | Complete overhaul: added search by keyword, category selector, min/max price inputs, in-stock checkbox, sort dropdown, filter reset button, and full page pagination controls synced with URL search parameters. |
| `frontend/src/styles/main.css` | **Modified** | Added styles for `.field-error`, `.shop-filters-row`, `.price-inputs`, `.in-stock-label`, `.sort-dropdown`, `.reset-btn`, and `.pagination-wrap`. |
| `frontend/src/tests/validators.test.js` | **Created** | Node test suite covering all client validation rules. |
| `frontend/package.json` | **Modified** | Added `"test": "node --test src/tests/*.test.js"` script. |

### Infrastructure & DevSecOps
| File | Action | Purpose / Reason |
|---|---|---|
| `backend/Dockerfile` | **Modified** | Hardened container to run as unprivileged `appuser` (UID 10001), added healthcheck probe. |
| `frontend/Dockerfile` | **Modified** | Added healthcheck probe. |
| `frontend/nginx.conf` | **Modified** | Added security headers, gzip compression, client body limits (10M), and static asset caching. |
| `docker-compose.prod.yml` | **Created** | Production compose specification with service healthchecks, network isolation, restart policies, and volume mounts. |
| `.github/workflows/ci.yml` | **Modified** | Added Python compileall check, pytest with environment configuration, and frontend test runner. |
| `.github/workflows/security.yml` | **Created** | Added Bandit SAST and Gitleaks secret scanning workflow. |
