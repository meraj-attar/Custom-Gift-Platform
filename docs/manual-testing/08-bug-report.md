# Comprehensive QA Bug Report & Defect Log

**Project**: CustomGift Personalized E-Commerce Platform  
**Testing Phase**: End-to-End Manual QA Audit  
**Date of Audit**: November 10, 2026  
**Lead QA Engineer**: Senior QA Automation & Manual Testing Engineer  
**Status**: **ALL DEFECTS RESOLVED & VERIFIED (0 OPEN DEFECTS)**

---

## 1. Defect Summary Dashboard

| Severity Level | Total Identified | Resolved / Mitigated | Open / Deferred |
| :--- | :---: | :---: | :---: |
| **Critical (Blocker)** | 0 | 0 | 0 |
| **High** | 1 | 1 | 0 |
| **Medium** | 1 | 1 | 0 |
| **Low / Cosmetic** | 2 | 2 | 0 |
| **Total** | **4** | **4** | **0** |

---

## 2. Detailed Bug Log & Resolution History

### Bug ID: BUG-QA-001
- **Title**: Vite Dev Proxy Port Target Mismatch (`8004` vs `8000`)
- **Severity**: **High**
- **Component**: Frontend Environment Configuration (`frontend/.env`)
- **Description**: The Vite development server environment configuration (`frontend/.env`) specified `VITE_API_PROXY_TARGET=http://localhost:8004`. However, the active production-ready PostgreSQL FastAPI backend was listening on `http://127.0.0.1:8000`. A legacy Python process from a prior session was idling on port 8004 with an outdated SQLite catalog, causing queries for featured products to return 0 items.
- **Steps to Reproduce**:
  1. Start backend on port 8000 with PostgreSQL.
  2. Launch frontend on port 5173.
  3. Load homepage and observe that featured product cards failed to render due to proxying to port 8004.
- **Root Cause**: Stale development proxy setting in `frontend/.env`.
- **Resolution**: Updated `frontend/.env` to `VITE_API_PROXY_TARGET=http://localhost:8000` and terminated the stale process on port 8004. Verified that Vite seamlessly proxied all 9 featured catalog items.
- **Status**: **RESOLVED & VERIFIED**

---

### Bug ID: BUG-QA-002
- **Title**: Delivery Recipient Name Placeholder Mismatch in Checkout
- **Severity**: **Low**
- **Component**: Checkout Form (`Checkout.jsx`)
- **Description**: During test automation, the recipient name field was looked up using placeholder `"Your full name"`, whereas the production-hardened design system implemented `"Receiver's full name"` to distinguish the gift sender from the recipient.
- **Steps to Reproduce**:
  1. Navigate to `/checkout` with items in cart.
  2. Attempt to locate recipient input using `"Your full name"`.
- **Root Cause**: Design specification difference between account registration (`Your full name`) and gift delivery recipient (`Receiver's full name`).
- **Resolution**: Aligned test automation harness and verified that `"Receiver's full name"` renders correctly, accepts Unicode names, and enforces min 2 / max 100 character constraints.
- **Status**: **RESOLVED & VERIFIED**

---

### Bug ID: BUG-QA-003
- **Title**: Brand Selector Ambiguity Across Header and Footer
- **Severity**: **Low**
- **Component**: Header & Footer Navigation (`Navbar.jsx` & `Footer.jsx`)
- **Description**: Inspecting `.brand strong` resolved to 2 elements (one in `.main-header` and one in `.main-footer`), triggering strict-mode locator ambiguity in browser automation scripts.
- **Steps to Reproduce**:
  1. Load homepage.
  2. Query `page.locator(".brand strong")`.
- **Root Cause**: Identical class names used for branding typography in both header and footer.
- **Resolution**: Scoped header brand inspection to `.main-header .brand strong`. Both header and footer render the brand name `"CustomGift"` consistently.
- **Status**: **RESOLVED & VERIFIED**

---

### Bug ID: BUG-QA-004
- **Title**: Customization Studio File Upload Element Conditionally Rendered
- **Severity**: **Medium**
- **Component**: Customization Studio (`CustomizationStudio.jsx`)
- **Description**: In the gift studio, selecting a product that only requires text (e.g. `personalized-self-care-quote-mug`) correctly omits `<input type="file">` from the DOM because `needs_image` is false. However, test scripts expecting a universal file input encountered a timeout when a text-only gift was pre-selected.
- **Steps to Reproduce**:
  1. Navigate to `/studio` where the default selected item is `personalized-self-care-quote-mug`.
  2. Observe that photo upload zone is hidden.
- **Root Cause**: Intentional product-specific customization behavior—products requiring only text do not prompt customers for unnecessary photo uploads.
- **Resolution**: Documented expected behavior in test plan; updated test runner to select image-requiring gifts (e.g. `couple-memory-frame`, `family-tree-photo-frame`) when evaluating photo upload, and text-only gifts when evaluating quote personalization.
- **Status**: **RESOLVED & VERIFIED**

---

## 3. Bug Report Conclusion

All four identified edge cases and environmental discrepancies have been completely resolved, validated in the browser, and verified against the live PostgreSQL backend. There are **zero blocking, high, or medium defects remaining**.
