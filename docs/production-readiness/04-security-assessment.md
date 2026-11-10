# Phase 5: Security Assessment Report

**Date**: 2026-11-09  
**Assessment Standard**: OWASP Top 10 & OWASP API Security Top 10  
**Evaluator**: Application Security & DevSecOps Engineering Team  

---

## 1. Executive Summary

A comprehensive security assessment was conducted across the CustomGift architecture, API layer, data persistence models, and frontend client. Every vulnerability identified during the Phase 1 audit has been analyzed and remediated with defense-in-depth protections.

---

## 2. OWASP Top 10 Assessment & Controls

### A01: Broken Access Control
- **Threat**: Unauthorized access to administrative operations, other users' orders, or customer private photos.
- **Controls Implemented**:
  - Role-based authorization (`require_admin` dependency) strictly gates `/api/admin/*` and `/api/orders/admin/*`.
  - Order details endpoint `/api/orders/{order_id}` enforces customer ownership (`order.user_id == current_user.id` or `current_user.role == "admin"`).
  - Private customer photos are stored in isolated paths (`local:customizations/<user_id>/...`) and accessed exclusively through authenticated endpoint `/api/orders/{order_id}/items/{item_id}/custom-image` with ownership verification.

### A02: Cryptographic Failures
- **Threat**: Weak password hashes or insecure token transmission.
- **Controls Implemented**:
  - Password hashing uses standard `scrypt` (N=16384, r=8, p=1, dklen=64) with cryptographically secure random 16-byte salt (`os.urandom(16)`).
  - Passwords are never logged or stored in plaintext.
  - JWT tokens are signed using HMAC-SHA256 (`PyJWT`) with configurable `SECRET_KEY`.
  - Password reset tokens embed a SHA-256 fingerprint of the user's password hash (`password_reset_fingerprint`), ensuring single-use and automatic invalidation once the password changes.

### A03: Injection (SQL, CRLF, Header Injection)
- **Threat**: SQL injection via search/sort parameters; CRLF injection in email headers.
- **Controls Implemented**:
  - All database queries use SQLAlchemy 2 parameterized queries and type-safe expressions. No raw SQL concatenation.
  - Search queries are parameterized (`ilike(term)`).
  - Sorting parameters (`sort_by`) are strictly validated against an immutable allowlist dictionary (`ALLOWED_SORTS`). Unrecognized values default safely to `featured`.
  - Email addresses, subject lines, and user names reject CRLF characters (`\r`, `\n`) and control characters (`\x00-\x1f\x7f`), preventing SMTP header injection and response splitting.

### A04: Insecure Design & Price Manipulation
- **Threat**: Tampering with product prices or order totals in client requests.
- **Controls Implemented**:
  - The frontend shopping cart stores product references and quantities. During `POST /api/orders`, the server retrieves current product prices directly from the database and recalculates `total_amount = sum(product.price * item.quantity)` on the server. Client-submitted prices are entirely ignored.
  - Database row locks (`with_for_update()`) prevent inventory overselling race conditions.

### A05: Security Misconfiguration
- **Threat**: Running containers as root, missing HTTP security headers, verbose error stack traces.
- **Controls Implemented**:
  - `backend/Dockerfile` creates an unprivileged user `appuser` (UID 10001) and drops root permissions before starting uvicorn.
  - `SecurityHeadersMiddleware` and Nginx inject security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
  - Nginx sets `client_max_body_size 10M` and serves static assets with immutable cache headers.

### A06: Vulnerable and Outdated Components
- **Controls Implemented**:
  - Python dependencies pinned with modern release versions (`fastapi`, `SQLAlchemy 2.0`, `pydantic 2.8+`, `PyJWT 2.9+`, `Pillow 10.4+`).
  - Added weekly automated GitHub Actions security scanning with Bandit SAST and Gitleaks secret detection.

### A07: Identification and Authentication Failures
- **Threat**: Brute-force password guessing, credential stuffing, password reset abuse.
- **Controls Implemented**:
  - In-memory thread-safe sliding window rate limiter (`RateLimitMiddleware`) restricts failed attempts:
    - `/api/auth/login`: 15 requests per minute per IP.
    - `/api/auth/register`: 10 requests per minute per IP.
    - `/api/auth/forgot-password`: 5 requests per minute per IP.
  - Account status check: Inactive accounts (`is_active == False`) are immediately blocked from authentication.

### A08: Software and Data Integrity Failures
- **Threat**: Uploading malicious executable scripts disguised as images.
- **Controls Implemented**:
  - `upload_service.py` performs rigorous multi-layer validation:
    1. Content-Type MIME allowlist (`image/jpeg`, `image/png`, `image/webp`).
    2. File size limit enforced against `settings.max_upload_mb` (5 MB).
    3. PIL `Image.verify()` verifies file signature and integrity.
    4. Image pixel bomb prevention (`MAX_PIXELS = 20_000_000`).
    5. Re-encoding: Every image is decoded and re-saved as fresh JPEG/PNG/WEBP bytes, stripping all EXIF metadata, embedded scripts, and polyglots.
    6. Random UUID filenames preventing directory traversal attacks.

### A09: Security Logging and Monitoring Failures
- **Controls Implemented**:
  - Centralized structured logging configured via `app/core/logging.py`.
  - Unique Request Correlation ID (`X-Request-ID`) attached to every request and response.
  - Sensitive parameters (passwords, JWT secrets, Razorpay secret keys) are excluded from log outputs.

### A10: Server-Side Request Forgery (SSRF)
- **Controls Implemented**:
  - Payment endpoints communicate only with pinned, official Razorpay endpoints (`https://api.razorpay.com/v1/orders`).
  - No user-controlled URLs are fetched server-side.
