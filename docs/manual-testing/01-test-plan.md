# Manual Testing Master Test Plan: CustomGift Platform

**Date**: 2026-11-09  
**Role**: Senior Manual QA Engineer, Functional Tester, UI/UX Tester & Security Tester  
**Application**: CustomGift Personalized E-Commerce Platform  
**Testing Scope**: Complete End-to-End Manual Testing across Customer, Administrator, and Shared Components  

---

## 1. Objectives

To perform an exhaustive, interactive browser-based manual testing cycle of the CustomGift platform following its production readiness hardening. Every component, page, user flow, boundary condition, and administrative operation will be verified via real browser automation (Microsoft Edge / Chromium via Playwright), capturing network activity, console logs, DOM state, and visual screenshots.

---

## 2. Test Environment & System Configuration

| Component | Target URL / Address | Configuration | Health Check Status |
|---|---|---|---|
| **Frontend Web App** | `http://localhost:5173` | React 18, Vite 5, React Router 6 | **HTTP 200 OK** |
| **Backend API** | `http://127.0.0.1:8000` | FastAPI, Python 3.11, Uvicorn | **HTTP 200 OK** (`/health/ready`) |
| **Primary Database** | `localhost:5432` | PostgreSQL 16 (`customgift`) | **Connected & Migrated** |
| **Payment Gateway** | Integrated (Mode: Demo) | Razorpay Demo Mode | **Configured** |
| **Media Root** | `backend/media/` | Local private/public storage | **Active & Mounted** |
| **Test Browser** | Microsoft Edge 131+ (Chromium) | Viewports: 1920x1080, 1366x768, 768x1024, 390x844, 320x568 | **Verified** |

---

## 3. Test Accounts

| Account Role | Email Address | Password | Permissions |
|---|---|---|---|
| **System Administrator** | `admin@customgift.dev` | `Admin@123` | Full administrative control, catalog, orders, users, stats |
| **Test Customer A** | `qa.customer.a@customgift.dev` | `Password@123` | Standard consumer, cart, wishlist, orders |
| **Test Customer B** | `qa.customer.b@customgift.dev` | `Password@123` | Isolation testing, private order review verification |

---

## 4. Execution Sequence

1. **Setup & Verification**: Service availability, DB health, and frontend proxy.
2. **Customer Module**:
   - Homepage (A)
   - Registration (B)
   - Login & Session Handling (C)
   - Product Listing / Shop & Filters (D)
   - Product Details (E)
   - Gift Customization & Studio (F)
   - Shopping Cart (G)
   - Persistent Wishlist (H)
   - Checkout & Address Validation (I)
   - Payment Verification (J)
   - Order Tracking & Journey (K)
3. **Administrator Module**:
   - Admin Login & Protection (A)
   - Dashboard Metrics (B)
   - Product Management CRUD & Image Upload (C)
   - User Management (D)
   - Order Lifecycle & Personalization Review (E)
4. **Global UI Components & Design System**: Modals, toasts, forms, buttons, dropdowns, empty states.
5. **Responsive Matrix**: 1920px (Desktop), 1366px (Laptop), 768px (Tablet), 390px (Mobile), 320px (Small Mobile).
6. **Security-Oriented Checks**: IDOR, access control, JWT tampering, stored XSS escaping, file upload guards.
7. **Defect Tracking & Final Summary**: Reporting, classification, and verdict.
