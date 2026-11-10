# Phase 8: Functional Test Report

**Date**: 2026-11-09  
**Execution Environment**: Python 3.11.6, Pytest 8.4.2, Node 20 Native Test Runner, Vite 5  
**Result**: 100% Passed  

---

## 1. Summary of Test Execution

| Suite | Runner | Total Tests | Passed | Failed | Execution Time |
|---|---|---|---|---|---|
| Backend Pytest Suite | `pytest` | 33 | 33 | 0 | 1.24s |
| Frontend Native Unit Suite | `node --test` | 6 | 6 | 0 | 0.08s |
| Frontend Production Build | `vite build` | 1 | 1 | 0 | 10.49s |
| Python Compilation Gate | `compileall` | All modules | All | 0 | 0.20s |
| **Total** | | **40** | **40** | **0** | **~12s** |

---

## 2. Detailed Test Inventory & Results

### Backend Test Suites (`backend/tests/`)

#### 1. Authentication & Authorization (`test_auth.py`, `test_authorization.py`)
- `test_register_login_and_me`: Registers new user, retrieves access token, calls `/api/auth/me`. **PASS**
- `test_duplicate_email_rejected`: Enforces uniqueness on email addresses. **PASS**
- `test_customer_cannot_access_admin_stats`: Validates RBAC; returns HTTP 403 Forbidden for non-admin tokens. **PASS**

#### 2. Checkout & Order Lifecycle (`test_checkout.py`, `test_fulfillment.py`)
- `test_checkout_validates_customization_and_server_total`: Validates required text, date, image constraints, and verifies server calculates accurate subtotal. **PASS**
- `test_demo_razorpay_flow`: Tests order creation, demo Razorpay payment initiation, signature validation bypass in demo mode, and payment completion. **PASS**
- `test_cannot_fulfill_unpaid_online_order`: Enforces state machine rules: online orders cannot be processed until payment status is `PAID`. **PASS**
- `test_cancelling_restores_inventory`: Cancelling an order restores inventory units to product stock. **PASS**

#### 3. Administrative Operations (`test_admin.py`)
- `test_admin_stats_overview`: Verifies summary aggregation of revenue, open orders, customers, and active products. **PASS**

#### 4. Persistent Wishlist (`test_wishlist.py`)
- `test_wishlist_add_list_remove_and_is_user_scoped`: Verifies duplicate prevention, optimistic add, remove, and strict isolation between user accounts. **PASS**

#### 5. Search, Multi-Filter, Sorting & Pagination (`test_product_filters.py`)
- `test_search_by_name_and_keyword`: Verifies search by product title, description keywords, and exclusion of inactive products. **PASS**
- `test_category_filter`: Verifies exact category filtering and `category=all` handling. **PASS**
- `test_price_range_filtering`: Verifies `min_price`, `max_price`, combined range, and rejection of invalid bounds (`min_price > max_price`). **PASS**
- `test_in_stock_filter`: Verifies `in_stock=true` and `in_stock=false` filters. **PASS**
- `test_sorting_options`: Verifies price ascending, price descending, rating, and newest ordering. **PASS**
- `test_pagination_and_combined_filters`: Verifies multi-parameter filtering with safe pagination limits, page offsets, and zero overlap across pages. **PASS**

#### 6. Input Validation & Security Probes (`test_validation.py`)
- `test_valid_email_normalization`: RFC-compliant email acceptance and domain lowercase normalization. **PASS**
- `test_reject_email_excessive_length`: Rejects emails exceeding 320 characters or local parts exceeding 64 characters. **PASS**
- `test_reject_email_whitespace_and_control_chars`: Rejects spaces and ASCII control characters. **PASS**
- `test_reject_email_crlf_injection`: Rejects carriage return and newline characters preventing SMTP header injection. **PASS**
- `test_reject_multiple_emails`: Rejects commas or semicolons in single email fields. **PASS**
- `test_reject_malformed_emails`: Rejects malformed email structures. **PASS**
- `test_valid_indian_and_international_phones`: Validates 10-digit Indian numbers (+91, 0 prefix) and E.164. **PASS**
- `test_reject_invalid_phones`: Rejects alphabetic characters, insufficient digits, and CRLF in phone inputs. **PASS**
- `test_valid_pincodes`: Validates 6-digit Indian PIN codes. **PASS**
- `test_reject_invalid_pincodes`: Rejects leading zeros, non-digits, and invalid lengths. **PASS**
- `test_valid_unicode_names`: Accepts accented letters, Hindi Unicode, apostrophes, and hyphens in names. **PASS**
- `test_reject_text_control_characters_and_crlf`: Rejects control characters and newlines in single-line text inputs. **PASS**
- `test_password_strength`: Enforces uppercase, lowercase, numeric digits, and length bounds (8-128). **PASS**
- `test_register_rejects_crlf_email`: Integration test verifying API returns HTTP 422 for CRLF payloads. **PASS**
- `test_register_rejects_spaces_in_email`: Integration test verifying API returns HTTP 422 for spaced emails. **PASS**
- `test_health_and_readiness_probes`: Tests `/health` (liveness) and `/health/ready` (database connectivity). **PASS**
- `test_rate_limiting_enforcement`: Tests sliding-window rate limiting returning HTTP 429 and `Retry-After`. **PASS**

---

### Frontend Validation Suite (`frontend/src/tests/validators.test.js`)
- `validates correct email addresses`: **PASS**
- `rejects invalid or dangerous email addresses`: **PASS**
- `validates Indian and international phone numbers`: **PASS**
- `validates 6-digit Indian PIN codes`: **PASS**
- `validates password complexity`: **PASS**
- `validates text bounds and controls`: **PASS**
