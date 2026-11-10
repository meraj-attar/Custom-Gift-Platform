# Master Manual Test Cases Specification: CustomGift Platform

**Date**: 2026-11-09  
**Specification**: End-to-End Test Case Catalog  

---

## 1. Customer Module Test Cases

| Test ID | Module | Component | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|---|---|
| **TC-HOME-001** | Customer | Homepage | Homepage Initial Load & Hero Section | 1. Navigate to `/`<br>2. Inspect headline and visual layout | Page loads in < 1s; hero headline "Gifts that feel like they were made for them" displays; no broken elements |
| **TC-HOME-002** | Customer | Navbar | Header Navigation & Branding | 1. Inspect navigation links (Home, Shop, Studio, About, Contact)<br>2. Check Wishlist and Cart icons | Brand mark links to `/`; all navigation routes are clickable and lead to respective views |
| **TC-HOME-003** | Customer | Homepage | Curated / Featured Products Grid | 1. Scroll to curated collection section<br>2. Inspect product cards | Products render with thumbnail, category badge, rating, title, price (₹), and action links |
| **TC-HOME-004** | Customer | Homepage | Hero Call to Action Navigation | 1. Click "Explore collection" CTA button | Seamless client-side navigation to `/shop` without page reload |
| **TC-REG-001** | Customer | Register | Empty Registration Submission Guard | 1. Navigate to `/register`<br>2. Click "Create account" with empty fields | Browser native and form validation triggers; submission is halted |
| **TC-REG-002** | Customer | Register | Email Validation with Spaces & CRLF | 1. Enter email `bad email@domain.com`<br>2. Enter password `Weak`<br>3. Inspect validation feedback | Real-time / on-blur validation error displayed; submit button blocked |
| **TC-REG-003** | Customer | Register | Registration with Unicode Name & Phone | 1. Enter name `Amélie O'Connor-शर्मा`<br>2. Phone `9876543210`<br>3. Valid email and password<br>4. Submit | Account created with HTTP 201; JWT token stored; user redirected to home with user badge |
| **TC-REG-004** | Customer | Register | Duplicate Email Rejection | 1. Enter already registered email<br>2. Submit form | Server returns HTTP 409 Conflict; toast displays "An account with this email already exists" |
| **TC-AUTH-001** | Customer | Login | Invalid Credentials Rejection | 1. Navigate to `/login`<br>2. Enter wrong email/password<br>3. Submit | Server returns HTTP 401; user remains on login page; error toast displayed |
| **TC-AUTH-002** | Customer | Login | Valid Customer Authentication | 1. Enter valid credentials<br>2. Submit | HTTP 200 returned; access token saved in localStorage; user redirected with personalized greeting |
| **TC-AUTH-003** | Customer | Login | Customer Logout & Protected Route Guard | 1. Click Logout in user menu<br>2. Attempt navigation to `/orders` | Session cleared from localStorage; navigation to `/orders` redirected to `/login` |
| **TC-SHOP-001** | Customer | Shop | Catalog Loading & Initial State | 1. Navigate to `/shop`<br>2. Inspect product grid | Active products rendered in grid; default sorting and category "All gifts" active |
| **TC-SHOP-002** | Customer | Shop | Search by Product Title & Keyword | 1. Enter "Frame" in search box<br>2. Click Search | Catalog filters to items matching "Frame"; result count updates; URL has `?search=Frame` |
| **TC-SHOP-003** | Customer | Shop | Category Filter Pill Interaction | 1. Click category pill (e.g. "Keepsakes") | Products filtered to category; pill highlights with active style; URL has `?category=Keepsakes` |
| **TC-SHOP-004** | Customer | Shop | Price Range Multi-Filter (Min/Max) | 1. Enter Min Price 500<br>2. Enter Max Price 2000<br>3. Submit | Products strictly bounded between ₹500 and ₹2000; URL updates |
| **TC-SHOP-005** | Customer | Shop | In-Stock Only Availability Toggle | 1. Check "In stock only" checkbox | Out-of-stock items (stock=0) hidden; only available inventory shown |
| **TC-SHOP-006** | Customer | Shop | Dynamic Sorting (Price Low to High) | 1. Select "Price: Low to High" in sort dropdown | Items ordered in ascending price order; verified against item price labels |
| **TC-SHOP-007** | Customer | Shop | Reset / Clear All Filters | 1. Apply multiple filters<br>2. Click "Clear" button | All filters cleared; search, price, and category reset; complete catalog reloaded |
| **TC-SHOP-008** | Customer | Shop | Pagination Navigation Controls | 1. Navigate to page 2 via pagination control | Page 2 products rendered; items distinct from page 1; URL has `?page=2` |
| **TC-PROD-001** | Customer | Product Details | Product Details View & Metadata | 1. Click product card in shop | Detail view loads with image, title, price, discount pill, description, and stock indicator |
| **TC-PROD-002** | Customer | Product Details | Quantity Controls & Stock Clamping | 1. Click "+" to increase quantity<br>2. Click "-" to decrease | Quantity cannot exceed available stock or max limit (10); cannot go below 1 |
| **TC-WISH-001** | Customer | Wishlist | Toggle Wishlist from Product Detail | 1. Click heart button on product detail | Heart turns pink; item persisted to user wishlist in PostgreSQL database |
| **TC-WISH-002** | Customer | Wishlist | Wishlist Dedicated Page & Persistence | 1. Navigate to `/wishlist`<br>2. Inspect wishlisted items | Saved products display in wishlist grid; persists after page refresh |
| **TC-WISH-003** | Customer | Wishlist | Wishlist Item Removal | 1. Click active heart button in wishlist view | Item removed from view and deleted from database; badge counter decrements |
| **TC-CUST-001** | Customer | Studio | Personalization Studio & Live Preview | 1. Navigate to `/studio`<br>2. Choose occasion, message, date | Live canvas previews personalized gift with text rendering in real time |
| **TC-CUST-002** | Customer | Studio | Add Personalized Gift to Bag | 1. Complete required customization<br>2. Click "Add to gift bag" | Item added to cart with custom text, occasion, and date recap; redirected to `/cart` |
| **TC-CART-001** | Customer | Cart | Gift Bag Contents & Recap Display | 1. Inspect cart items in `/cart` | Item displays thumbnail, title, customization summary (occasion, message, date), and subtotal |
| **TC-CART-002** | Customer | Cart | Cart Quantity Update & Total Calculation | 1. Increase quantity to 2 | Total amount dynamically recalculates (`unit_price * quantity`) |
| **TC-CHK-001** | Customer | Checkout | Checkout Delivery Form Validation | 1. Navigate to `/checkout`<br>2. Leave required fields blank | Pre-submit validation displays inline field errors for name, phone, address, pincode |
| **TC-CHK-002** | Customer | Checkout | Cash on Delivery (COD) Order Flow | 1. Fill valid Indian delivery address<br>2. Select Cash on Delivery<br>3. Place order | Order created in DB (`payment_status="PENDING"`, `order_status="CONFIRMED"`); redirected to order journey |
| **TC-CHK-003** | Customer | Checkout | Razorpay Online Payment (Demo Mode) | 1. Select Razorpay payment method<br>2. Place order<br>3. Complete demo payment | Order created; demo payment completed; status updated to `PAID` / `CONFIRMED` |
| **TC-ORD-001** | Customer | Orders | Order Details & Fulfillment Journey | 1. Inspect `/orders/{order_id}` | Order journey timeline renders placed/confirmed stage; delivery address and pricing recap shown |
| **TC-ORD-002** | Customer | Orders | Order History Listing | 1. Navigate to `/orders` | All past orders for authenticated user listed with date, item count, and status badge |

---

## 2. Administrator Module Test Cases

| Test ID | Module | Component | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|---|---|
| **TC-ADM-001** | Admin | RBAC | Customer Blocked from `/admin` | 1. Navigate to `/admin` as customer or guest | Access denied; redirected to `/login` |
| **TC-ADM-002** | Admin | Dashboard | Admin Login & Dashboard Overview | 1. Login with `admin@customgift.dev`<br>2. Navigate to `/admin` | Dashboard loads with Revenue (₹), Total Orders, Open Orders, and Customer count |
| **TC-ADM-003** | Admin | Products | Product Catalog Table | 1. Click "Products" tab | Admin table displays products with image thumbnail, category, price, stock, and actions |
| **TC-ADM-004** | Admin | Orders | Orders Management & Status Control | 1. Click "Orders" tab | All store orders listed with customer name, email, payment status, and order status dropdown |
| **TC-ADM-005** | Admin | Orders | Customer Personalization Review Modal | 1. Click Eye icon on order row | Modal opens displaying customer contact info, delivery address, custom text, and uploaded photos |
| **TC-ADM-006** | Admin | Orders | Order Fulfillment Status Transition | 1. Change status from `CONFIRMED` to `PROCESSING` | Status updates in DB; reflected in customer order tracking view |
| **TC-ADM-007** | Admin | Users | User Management Table | 1. Click "Users" tab | Lists registered customer accounts with name, email, phone, role, and active status |

---

## 3. Responsive & Security Test Cases

| Test ID | Module | Component | Test Scenario | Viewport / Vector | Expected Result |
|---|---|---|---|---|---|
| **TC-RESP-1920** | Shared | Responsive | Desktop Ultra-wide Layout | 1920x1080 | Clean 4-column product grid; no stretched hero or misaligned toolbar |
| **TC-RESP-1366** | Shared | Responsive | Standard Laptop Layout | 1366x768 | Proportional container margins; 3-column product grid; full navbar visible |
| **TC-RESP-768** | Shared | Responsive | Tablet Viewport Layout | 768x1024 | Responsive wrapping of filter toolbar; 2-column product grid; mobile toggle |
| **TC-RESP-390** | Shared | Responsive | Mobile Viewport (iPhone 14) | 390x844 | Single-column product grid; full-width buttons; hamburger menu; no horizontal overflow |
| **TC-RESP-320** | Shared | Responsive | Small Mobile (iPhone SE) | 320x568 | Compact typography; inputs fit without clipping; touch targets >= 44px |
| **TC-SEC-001** | Security | IDOR | Cross-User Order Isolation | Customer A accesses `/api/orders/{order_B_id}` | Server returns HTTP 404 / 403; Customer A cannot view Customer B's order |
| **TC-SEC-002** | Security | RateLimit | Login Brute Force Rate Limiting | 16 rapid POST requests to `/api/auth/login` | 16th request receives HTTP 429 Too Many Requests with `Retry-After` header |
| **TC-SEC-003** | Security | XSS | Customer Personalization HTML Escaping | Enter `<script>alert(1)</script>` in custom text | Text rendered as plain string text node; zero script execution |
