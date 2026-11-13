import os
import sys
from pathlib import Path
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from playwright.sync_api import sync_playwright

DOCS_DIR = Path("docs/architecture")
DOCS_DIR.mkdir(parents=True, exist_ok=True)

DOCX_PATH = DOCS_DIR / "CustomGift_Complete_Project_Architecture.docx"
HTML_PATH = DOCS_DIR / "CustomGift_Complete_Project_Architecture.html"
PDF_PATH = DOCS_DIR / "CustomGift_Complete_Project_Architecture.pdf"

print("Generating CustomGift Complete Project Architecture Documentation...")

# ==============================================================================
# DOCX BUILDER WITH PYTHON-DOCX
# ==============================================================================

doc = docx.Document()

# Page Margins: 1 inch all around
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.different_first_page_header_footer = True
    
    # Header & Footer for subsequent pages
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run("CustomGift Platform — Complete Project Architecture Documentation")
    hrun.font.size = Pt(8.5)
    hrun.font.color.rgb = RGBColor(120, 120, 120)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    frun = fp.add_run("Confidential & Proprietary — CustomGift Engineering")
    frun.font.size = Pt(8.5)
    frun.font.color.rgb = RGBColor(120, 120, 120)

# Colors
COLOR_PRIMARY = RGBColor(43, 27, 77)     # #2B1B4D Deep Violet
COLOR_SECONDARY = RGBColor(109, 40, 217) # #6D28D9 Royal Purple
COLOR_TEXT = RGBColor(45, 55, 72)        # #2D3748 Dark Slate
COLOR_MUTED = RGBColor(100, 116, 139)    # #64748B Slate Grey
COLOR_BG_LIGHT = "F8F7FB"
COLOR_LINE = "E2E8F0"

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def add_title(text, subtitle=""):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(80)
    p.paragraph_format.space_after = Pt(12)
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(28)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY

    if subtitle:
        sp = doc.add_paragraph()
        sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sp.paragraph_format.space_after = Pt(40)
        srun = sp.add_run(subtitle)
        srun.font.name = "Arial"
        srun.font.size = Pt(14)
        srun.font.color.rgb = COLOR_SECONDARY

def add_h1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(22)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(18)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY
    return p

def add_h2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(13.5)
    run.font.bold = True
    run.font.color.rgb = COLOR_SECONDARY
    return p

def add_h3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = COLOR_TEXT
    return p

def add_p(text, bold_prefix="", italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        brun = p.add_run(bold_prefix)
        brun.font.name = "Arial"
        brun.font.size = Pt(10)
        brun.font.bold = True
        brun.font.color.rgb = COLOR_TEXT
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(10)
    run.font.italic = italic
    run.font.color.rgb = COLOR_TEXT
    return p

def add_bullet(text, bold_prefix=""):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        brun = p.add_run(bold_prefix)
        brun.font.name = "Arial"
        brun.font.size = Pt(10)
        brun.font.bold = True
        brun.font.color.rgb = COLOR_TEXT
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(10)
    run.font.color.rgb = COLOR_TEXT
    return p

def add_callout(text, title="NOTE / ARCHITECTURE PRINCIPLE"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, "F1EDF9") # Soft purple
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

    # Left border highlight
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="6D28D9"/>\n'
        f'  <w:top w:val="none"/>\n'
        f'  <w:right w:val="none"/>\n'
        f'  <w:bottom w:val="none"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)

    cp = cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(2)
    crun_t = cp.add_run(f"[{title}]\n")
    crun_t.font.name = "Arial"
    crun_t.font.size = Pt(9.5)
    crun_t.font.bold = True
    crun_t.font.color.rgb = COLOR_SECONDARY

    crun = cp.add_run(text)
    crun.font.name = "Arial"
    crun.font.size = Pt(9.5)
    crun.font.color.rgb = COLOR_TEXT
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_code_block(code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, "F8FAFC") # Soft slate
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)

    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'  <w:left w:val="single" w:sz="12" w:space="0" w:color="CBD5E1"/>\n'
        f'  <w:top w:val="single" w:sz="12" w:space="0" w:color="CBD5E1"/>\n'
        f'  <w:right w:val="single" w:sz="12" w:space="0" w:color="CBD5E1"/>\n'
        f'  <w:bottom w:val="single" w:sz="12" w:space="0" w:color="CBD5E1"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)

    cp = cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    crun = cp.add_run(code_text)
    crun.font.name = "Consolas"
    crun.font.size = Pt(8.5)
    crun.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_table_data(headers, rows_data, col_widths=None):
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    # Header Row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_shading(hdr_cells[i], "2B1B4D")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = "Arial"
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_col = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].text = str(val)
            set_cell_shading(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=90, bottom=90, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = "Arial"
                run.font.size = Pt(9)
                run.font.color.rgb = COLOR_TEXT

    # Apply widths if provided
    if col_widths:
        for row in tbl.rows:
            for c_idx, w in enumerate(col_widths):
                row.cells[c_idx].width = Inches(w)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

# ==============================================================================
# DOCUMENT CONTENT ASSEMBLY
# ==============================================================================

# --- COVER PAGE ---
add_title(
    "CustomGift E-Commerce Platform",
    "Complete Technical Architecture & System Design Documentation"
)

meta_p = doc.add_paragraph()
meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta_p.paragraph_format.space_after = Pt(120)
mrun = meta_p.add_run(
    "Version: 2.0.0 (Production-Ready Architecture)\n"
    "Author: Senior Software Architect & Technical Lead\n"
    "Stack: React 18, Vite, FastAPI 0.115, PostgreSQL, SQLAlchemy 2.0, Alembic, Razorpay SDK\n"
    "Date: November 2026\n"
    "Verified Test Coverage: 81 Backend Tests (100% Pass) | 105 Frontend Tests (100% Pass)\n"
    "Status: Audited, Hardened & Production Verified"
)
mrun.font.name = "Arial"
mrun.font.size = Pt(10)
mrun.font.color.rgb = COLOR_MUTED

doc.add_page_break()

# --- TABLE OF CONTENTS ---
add_h1("Table of Contents")
toc_items = [
    "1. Executive Overview & Core Objectives",
    "2. Verified Technology Stack & Dependency Matrix",
    "3. High-Level Multi-Tier Architecture & Layer Responsibilities",
    "4. Frontend Client Architecture (React 18 & Vite)",
    "5. Backend Server Architecture (FastAPI & Services)",
    "6. Database Architecture, Schema Design & Alembic Migrations",
    "7. Customer Application Workflow & WhatsApp Customization Channel",
    "8. Multi-Step Checkout & Razorpay Payment Architecture",
    "9. Admin Panel Operations Suite & Back-Office Controls",
    "10. Comprehensive REST API Specifications",
    "11. Security Architecture & Threat Protection Mechanisms",
    "12. DevOps, Environment Configuration & Deployment Topology",
    "13. Detailed System Workflow Diagrams",
    "14. QA Testing Audit & Current Verification Status",
    "15. Future Technical Roadmap & Strategic Improvements",
    "16. Appendix: Inspected Repository Scope & File Manifest"
]
for item in toc_items:
    add_p(item)

doc.add_page_break()

# --- CHAPTER 1 ---
add_h1("1. Executive Overview & Core Objectives")
add_p(
    "CustomGift is an enterprise-grade personalized e-commerce application engineered to deliver handcrafted and customized gifts across India. "
    "Unlike generic retail platforms, CustomGift is tailored specifically to the nuances of gifting, where customers seek meaningful emotional keepsakes, "
    "anniversary frames, engraved keychains, customized mugs, and curated celebration hampers."
)
add_h2("1.1 Purpose and Problem Statement")
add_p(
    "Traditional e-commerce platforms struggle with personalized gifting due to rigid product configurators, fragile web-based design canvas tools that crash on mobile devices, "
    "and impersonal checkout flows. CustomGift solves this by decoupling standard catalog purchasing from personalized consultation. Customers can seamlessly buy gifts "
    "through a frictionless Indian e-commerce checkout while collaborating directly with human artisans via WhatsApp for custom photo engraving, name stamping, and bespoke requirements."
)
add_h2("1.2 Core Architectural Objectives")
add_bullet(" High Performance & Responsiveness: Sub-50ms backend API responses powered by asynchronous FastAPI and efficient PostgreSQL indexing.", "1.")
add_bullet(" Strict Financial Integrity: Zero-trust server-side pricing, Razorpay payment verification using HMAC-SHA256 signatures, and atomic inventory management.", "2.")
add_bullet(" Real-World Indian Checkout Standards: Multi-step checkout with canonical 36 Indian States/UTs, 6-digit PIN validation, and optional address persistence.", "3.")
add_bullet(" Decoupled Personalization: Direct WhatsApp integration (8485089678) eliminating obsolete canvas bugs and fragile file upload gates.", "4.")
add_bullet(" Comprehensive Back-Office Operations: Complete administrative control over catalog, stock alerts, orders, payment audits, and customer support triage.", "5.")
add_bullet(" Military-Grade Defense: Sliding-window rate limiting, anti-tampering verification, timing-safe credential comparisons, and strict role-based access control.", "6.")

# --- CHAPTER 2 ---
add_h1("2. Verified Technology Stack & Dependency Matrix")
add_p("The table below details the actual technologies and verified software package versions actively powering the CustomGift repository.")

stack_data = [
    ["Tier / Domain", "Technology", "Verified Version", "Architectural Role"],
    ["Frontend Core", "React", "18.3.1", "Component-based declarative UI library"],
    ["Build Tool", "Vite", "5.4.10 / 5.4.21", "Ultra-fast ESM bundler with hot module replacement"],
    ["Client Routing", "React Router DOM", "6.28.0", "Declarative client-side routing & protected route guards"],
    ["HTTP Client", "Axios", "1.7.7", "Promise-based API client with Bearer token interceptors"],
    ["UI Icons", "Lucide React", "0.468.0", "Tree-shakable clean SVG vector icon library"],
    ["Notifications", "React Hot Toast", "2.4.1", "Accessible toast notifications for client feedback"],
    ["Backend Framework", "FastAPI", "0.115.0", "Asynchronous ASGI web framework with OpenAPI generation"],
    ["ASGI Server", "Uvicorn", "0.30.6", "High-performance production ASGI runner"],
    ["Data Validation", "Pydantic & Settings", "2.10.6 / 2.4.0", "Strict request/response schema modeling and environment parsing"],
    ["ORM", "SQLAlchemy", "2.0.36", "Enterprise object-relational mapping with selectin eager loading"],
    ["Database Driver", "Psycopg (v3)", "3.2.2", "High-performance binary PostgreSQL database driver"],
    ["Schema Migrations", "Alembic", "1.13.0", "Deterministic relational database schema revision control"],
    ["Database Engine", "PostgreSQL", "14+ / 16", "Acid-compliant relational database management system"],
    ["Auth / Security", "PyJWT & Passlib", "2.13.0 / 1.7.4", "Stateless HS256 JWT tokens and Bcrypt/PBKDF2 password hashing"],
    ["Payment Gateway", "Razorpay Python SDK", "2.0.1", "Official SDK for Razorpay Orders and HMAC signature checks"],
    ["Image Processing", "Pillow (PIL)", "12.3.0", "Server-side image verification and dimension processing"],
    ["Testing Engine", "Pytest & Node Test", "8.3.4 / Node 20+", "Full automated test runners for backend APIs and frontend flows"]
]
add_table_data(stack_data[0], stack_data[1:], [1.4, 1.4, 1.2, 2.5])

# --- CHAPTER 3 ---
add_h1("3. High-Level Multi-Tier Architecture & Layer Responsibilities")
add_p(
    "CustomGift follows a clean multi-tier architectural pattern. The system cleanly separates presentation, business orchestration, persistence, "
    "and third-party external integrations."
)

arch_diagram = (
    "+-----------------------------------------------------------------------------------+\n"
    "|                              CLIENT LAYER (Browser)                               |\n"
    "|   +---------------------------------------------------------------------------+   |\n"
    "|   |   React 18 SPA (Vite)                                                     |   |\n"
    "|   |   - Pages: Home, Shop, ProductDetails, Cart, Checkout, Profile, Admin     |   |\n"
    "|   |   - State: AuthContext (JWT/User), CartContext (Isolated Bag State)       |   |\n"
    "|   |   - Services: Axios API Interceptors, Toast Feedback, WhatsApp Utilities  |   |\n"
    "|   +---------------------------------------------------------------------------+   |\n"
    "+-----------------------------------------+-----------------------------------------+\n"
    "                                          | HTTPS / REST Calls (JSON)\n"
    "+-----------------------------------------v-----------------------------------------+\n"
    "|                         API GATEWAY & BACKEND LAYER (FastAPI)                     |\n"
    "|   +---------------------------------------------------------------------------+   |\n"
    "|   |   Middleware Pipeline:                                                    |   |\n"
    "|   |   [1] RequestIdMiddleware (X-Request-ID Tracking)                         |   |\n"
    "|   |   [2] SecurityHeadersMiddleware (HSTS, CSP, X-Frame, X-Content-Type)      |   |\n"
    "|   |   [3] RateLimitMiddleware (Sliding-window IP Throttling)                  |   |\n"
    "|   |   [4] CORSMiddleware (Origin Whitelisting)                                |   |\n"
    "|   +---------------------------------------------------------------------------+   |\n"
    "|   |   API Routers (/api):                                                     |\n"
    "|   |   /auth | /products | /cart | /wishlist | /orders | /payments | /admin    |   |\n"
    "|   +---------------------------------------------------------------------------+   |\n"
    "|   |   Business Services:                                                      |   |\n"
    "|   |   - PaymentService (Razorpay Orders & HMAC Verification)                  |   |\n"
    "|   |   - SettingsService (Dynamic WhatsApp & Store Configurations)             |   |\n"
    "|   |   - UploadService (Image Validation & Media Root Storage)                 |   |\n"
    "|   |   - EmailService (Password Reset OTP Dispatching)                         |   |\n"
    "|   +---------------------------------------------------------------------------+   |\n"
    "|   |   Data Access Layer: SQLAlchemy 2.0 ORM + Alembic Migrations              |   |\n"
    "+-------------------+---------------------+---------------------+-------------------+\n"
    "                    |                     |                     |\n"
    "                    v                     v                     v\n"
    "+------------------------+ +------------------------+ +-----------------------------+\n"
    "|      DATABASE          | |    PAYMENT GATEWAY     | |     WHATSAPP CHANNEL        |\n"
    "|   PostgreSQL 14+ / 16  | |    Razorpay (Test Mode)| |     Business WhatsApp       |\n"
    "|   - users, products    | |    - Order Generation  | |     +91 84850 89678         |\n"
    "|   - orders, payments   | |    - Checkout Modal    | |     - Live artisan chat     |\n"
    "|   - addresses, cart    | |    - HMAC Verification | |     - Custom photo sharing  |\n"
    "|   - store_settings     | |    - Anti-tampering    | |     - Dynamic template links|\n"
    "+------------------------+ +------------------------+ +-----------------------------+"
)
add_code_block(arch_diagram)

add_h2("3.1 Layer Responsibilities")
add_bullet("Client Layer: Renders responsive user interfaces, enforces client-side input masking, manages user session tokens in localStorage, and computes cart subtotals.", "Presentation: ")
add_bullet("API & Middleware Layer: Intercepts every inbound request to enforce security headers, generate distributed tracing IDs, throttle aggressive bot traffic, and authenticate Bearer tokens.", "Security Gateway: ")
add_bullet("Business Services Layer: Encapsulates pure business rules: server-side subtotal calculation, delivery fee computation (Standard Free vs Express Rs 99), Razorpay order creation, and atomic inventory updates.", "Domain Logic: ")
add_bullet("Persistence Layer: Manages ACID transactions via PostgreSQL, using pessimistic row locking ('with_for_update') during order placement to prevent inventory overselling race conditions.", "Data Store: ")
add_bullet("External Integrations: Integrates seamlessly with Razorpay APIs via official SDK in Test Mode, and dispatches customer inquiries to WhatsApp with prefilled product metadata.", "Third-Party Services: ")

# --- CHAPTER 4 ---
add_h1("4. Frontend Client Architecture (React 18 & Vite)")
add_p(
    "The frontend is architected as a modern Single-Page Application (SPA) using React 18, bundled with Vite for maximum developer productivity "
    "and optimized static production assets."
)
add_h2("4.1 Component & Page Organization")
add_p("The client codebase in `frontend/src` is structured logically across routes, shared components, global contexts, and services:")
add_bullet("src/pages/: Contains full-page route components: Home, Shop, ProductDetails, Cart, Checkout, Profile, About, Contact, Login, Register, ForgotPassword, ResetPassword, OrderDetails, and AdminDashboard.", "Pages: ")
add_bullet("src/components/: Reusable design system primitives: Navbar, Footer, ProductCard, WhatsAppIcon, PasswordStrengthMeter, SignOutConfirmationModal, and search controls.", "Components: ")
add_bullet("src/context/: React Context providers: AuthContext (session, login, register, logout, token management) and CartContext (gift bag state, buy-now bypass, quantity adjustment).", "State Management: ")
add_bullet("src/services/api.js: Centralized Axios instance preconfigured with baseURL, default JSON headers, and dynamic Authorization Bearer token attachment.", "API Integration: ")
add_bullet("src/utils/: Helper libraries: indianStates.js (canonical 36 States/UTs), validators.js (strict regex engines), and whatsapp.js (dynamic link generators).", "Utilities: ")

add_h2("4.2 State Management & Client Security")
add_p(
    "Application state is managed cleanly without bulky third-party libraries like Redux. `AuthContext` holds the authenticated user profile and token. "
    "Crucially, upon user logout or session expiration, the cart state is strictly purged from memory and localStorage, preventing multi-tenant data leakage on shared computers."
)
add_callout(
    "Profile Page Navigation Architecture: As per the latest UI refinement, the redundant 'My Profile' text links were removed from the header navigation bar "
    "and footer. Profile access is now strictly provided via the interactive User Profile Icon in the header, which includes accessible aria labels, hover states, "
    "and seamless routing to '/profile'.",
    "UI REFINEMENT SPECIFICATION"
)

# --- CHAPTER 5 ---
add_h1("5. Backend Server Architecture (FastAPI & Services)")
add_p(
    "The CustomGift backend is built on FastAPI, leveraging Python 3.11 asynchronous capabilities, Pydantic type validation, and SQLAlchemy ORM."
)
add_h2("5.1 Lifespan & Application Entry Point")
add_p(
    "The application entry point resides in `backend/app/main.py`. During application startup, the `lifespan` context manager initializes the media directory structure "
    "(`media/products` and `media/customizations`), ensures database tables are initialized, and loads the initial administrative seed data if running in development mode."
)

add_h2("5.2 Middleware Pipeline")
add_p("Every HTTP request traverses an ordered middleware pipeline before reaching router endpoints:")
add_bullet("RequestIdMiddleware: Generates or propagates a unique UUID4 'X-Request-ID' header, appending it to request context and backend logs for end-to-end traceability.", "1. ")
add_bullet("SecurityHeadersMiddleware: Injects enterprise security headers: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection: 1; mode=block, and Strict-Transport-Security.", "2.")
add_bullet("RateLimitMiddleware: An in-memory sliding-window limiter protecting sensitive routes (e.g. /api/auth/login, /api/auth/register, /api/contact) against brute-force and DDoS attacks.", "3.")
add_bullet("CORSMiddleware: Restricts cross-origin resource sharing strictly to configured frontend origins (e.g. http://localhost:5173, http://127.0.0.1:5173).", "4.")

add_h2("5.3 Request Lifecycle Walkthrough")
add_p(
    "1. Client triggers an HTTP POST to `/api/orders` with delivery address and item payload.\n"
    "2. Middleware pipeline inspects IP rate limits, attaches X-Request-ID, and checks CORS.\n"
    "3. Dependency injection invokes `get_current_user`, decoding the JWT Bearer token and fetching the verified `User` record.\n"
    "4. Pydantic schema `OrderCreate` validates payload syntax, ensuring delivery option and address lines meet minimum boundaries.\n"
    "5. Business logic begins an atomic database transaction, applying `with_for_update()` on product records to verify stock levels.\n"
    "6. Server re-calculates subtotals and shipping fees independently, rejecting client-submitted prices.\n"
    "7. Order entity is persisted in PostgreSQL, stock counts are decremented, and the created `OrderPublic` schema is returned."
)

# --- CHAPTER 6 ---
add_h1("6. Database Architecture, Schema Design & Alembic Migrations")
add_p(
    "The data layer is hosted on PostgreSQL and managed using SQLAlchemy 2.0 declarative models with Alembic schema migration tracking."
)
add_h2("6.1 Entity-Relationship (ER) Overview")

er_diagram = (
    "+-------------------+       +-----------------------+       +------------------------+\n"
    "|      users        |       |       addresses       |       |        products        |\n"
    "+-------------------+       +-----------------------+       +------------------------+\n"
    "| PK  id            |<---+  | PK  id                |       | PK  id                 |\n"
    "|     name          |    |  | FK  user_id           |       |     title              |\n"
    "|     email (UQ)    |    +--|     full_name         |       |     slug (UQ)          |\n"
    "|     password_hash |    |  |     phone, email      |       |     category           |\n"
    "|     role          |    |  |     address_line1     |       |     price              |\n"
    "|     is_active     |    |  |     city, state, PIN  |       |     stock              |\n"
    "+-------------------+    |  +-----------------------+       |     is_active          |\n"
    "       |                 |                                  +------------------------+\n"
    "       | 1:N             | 1:N                                           | 1:N\n"
    "       v                 |                                               v\n"
    "+-------------------+    |                                  +------------------------+\n"
    "|      orders       |----+                                  |      order_items       |\n"
    "+-------------------+                                       +------------------------+\n"
    "| PK  id            |<--------------------------------------| PK  id                 |\n"
    "| FK  user_id       | 1:N                                   | FK  order_id           |\n"
    "|     order_number  |                                       | FK  product_id         |\n"
    "|     subtotal      |                                       |     unit_price         |\n"
    "|     shipping_fee  |                                       |     quantity           |\n"
    "|     total_amount  |                                       +------------------------+\n"
    "|     order_status  |                                                    ^\n"
    "|     payment_status|                                                    |\n"
    "+-------------------+                                                    |\n"
    "       |                                                                 |\n"
    "       | 1:N                                                             |\n"
    "       v                                                                 |\n"
    "+-------------------+       +-----------------------+       +------------------------+\n"
    "|     payments      |       |      cart_items       |       |       wishlists        |\n"
    "+-------------------+       +-----------------------+       +------------------------+\n"
    "| PK  id            |       | PK  id                |       | PK  id                 |\n"
    "| FK  order_id      |       | FK  user_id           |       | FK  user_id            |\n"
    "| FK  user_id       |       | FK  product_id        |       | FK  product_id         |\n"
    "|     razorpay_order|       |     quantity          |       |     created_at         |\n"
    "|     razorpay_pay_id       +-----------------------+       +------------------------+\n"
    "|     amount, status|       \n"
    "+-------------------+       +-----------------------+       +------------------------+\n"
    "                            |   contact_messages    |       |     store_settings     |\n"
    "                            +-----------------------+       +------------------------+\n"
    "                            | PK  id                |       | PK  id                 |\n"
    "                            |     name, email       |       |     key (UQ)           |\n"
    "                            |     subject, message  |       |     value              |\n"
    "                            |     status, is_read   |       |     updated_at         |\n"
    "                            +-----------------------+       +------------------------+"
)
add_code_block(er_diagram)

add_h2("6.2 Database Entities & Specifications")
tables_data = [
    ["Entity Name", "Primary Key", "Key Attributes & Types", "Foreign Keys & Relationships"],
    ["users", "id (INT)", "email (VARCHAR 254, UQ), password_hash, role, is_active", "1:N with orders, addresses, cart_items, payments, wishlists"],
    ["products", "id (INT)", "title, slug (UQ), category, price (NUMERIC), stock, is_active", "1:N with order_items, cart_items, wishlists"],
    ["orders", "id (INT)", "order_number (UQ), subtotal, shipping_fee, total_amount, order_status", "FK user_id -> users.id; 1:N with order_items, payments"],
    ["order_items", "id (INT)", "unit_price (NUMERIC), quantity (INT), occasion, custom_text", "FK order_id -> orders.id; FK product_id -> products.id"],
    ["payments", "id (INT)", "razorpay_order_id, razorpay_payment_id, amount, status, method", "FK order_id -> orders.id; FK user_id -> users.id"],
    ["addresses", "id (INT)", "full_name, phone, address_line1, address_line2, city, state, pincode", "FK user_id -> users.id"],
    ["cart_items", "id (INT)", "quantity (INT), created_at", "FK user_id -> users.id; FK product_id -> products.id"],
    ["wishlists", "id (INT)", "created_at", "FK user_id -> users.id; FK product_id -> products.id"],
    ["contact_messages", "id (INT)", "name, email, subject, message, status (New/In Progress/Resolved)", "Standalone support communications"],
    ["store_settings", "id (INT)", "key (VARCHAR 100, UQ), value (TEXT), updated_at", "Key-value persistent store configurations (WhatsApp, Store info)"]
]
add_table_data(tables_data[0], tables_data[1:], [1.2, 1.0, 2.3, 2.0])

add_h2("6.3 Verified Alembic Migration History")
add_p("The database migration stream is strictly tracked through Alembic revisions up to the current head:")
add_bullet("20261111_0004_contact_status: Added lifecycle status (New, In Progress, Resolved) and is_read tracking to contact submissions.", "Rev 0004: ")
add_bullet("20261111_0005_password_recovery: Introduced emergency recovery code hashes and reset token expiration timestamps.", "Rev 0005: ")
add_bullet("20261112_0006_password_reset_otps: Added secure 6-digit email OTP fields with 10-minute expiry windows.", "Rev 0006: ")
add_bullet("20261112_0007_checkout_and_addresses: Created customer address book table and expanded order shipping attributes.", "Rev 0007: ")
add_bullet("20261112_0008_payments_table: Added dedicated relational payments table for Razorpay audit tracking.", "Rev 0008: ")
add_bullet("20261112_0009_store_settings: Created key-value store_settings table for dynamic WhatsApp and store metadata.", "Rev 0009 (HEAD): ")

# --- CHAPTER 7 ---
add_h1("7. Customer Application Workflow & WhatsApp Customization Channel")
add_p(
    "CustomGift provides an intuitive, end-to-end purchasing journey tailored for personalized gifts."
)
add_h2("7.1 Complete Customer Journey")
add_bullet("Customer signs up with validated email, phone, and password; authenticates and receives JWT token.", "1. Registration & Authentication: ")
add_bullet("Customer discovers gifts organized by curated categories (Mugs, Frames, Hampers, Keepsakes, Decor, Photo Gifts, Accessories).", "2. Discovery & Browsing: ")
add_bullet("Customer inspects product imagery, pricing, discounts, and material specifications.", "3. Product Inspection: ")
add_bullet("Customer can save favorite gifts to their private Wishlist or add them to their Gift Bag (Cart).", "4. Wishlist & Carting: ")
add_bullet("Customer can initiate a dedicated Order Now action, bypassing cart items directly to checkout.", "5. Order Now Quick Purchase: ")
add_bullet("Multi-step checkout: Address Input -> Delivery Options -> Payment Method -> Order Review.", "6. Multi-Step Checkout: ")
add_bullet("Secure Razorpay checkout modal or Cash on Delivery selection.", "7. Payment Fulfillment: ")
add_bullet("Real-time order confirmation with order number, estimated delivery date, and tracking status.", "8. Confirmation & Tracking: ")

add_h2("7.2 WhatsApp Customization Channel (Decoupled Architecture)")
add_p(
    "A major architectural milestone in CustomGift 2.0 is the complete elimination of obsolete online canvas editors and mandatory custom text validation at checkout. "
    "In real-world gift crafting, customers prefer direct human communication to verify photo quality, font styles, and placement proofs."
)
add_callout(
    "WhatsApp Customization Implementation Details:\n"
    "- Target Business Number: +91 84850 89678 (configured via store_settings and settings_service).\n"
    "- Customer Access Points: Dedicated WhatsApp button on every Product Card, Product Details page, and Navigation bar.\n"
    "- Dynamic Link Encoding: Clicking WhatsApp opens wa.me with a prefilled message containing Product Title, Product ID, and direct URL.\n"
    "- Checkout Freedom: Customers can complete product orders online without entering any mandatory customization text.",
    "OFFICIAL CUSTOMIZATION ARCHITECTURE"
)

# --- CHAPTER 8 ---
add_h1("8. Multi-Step Checkout & Razorpay Payment Architecture")
add_p(
    "The checkout workflow conforms strictly to Indian e-commerce standards, dividing checkout into 4 distinct steps with client and server validations."
)

checkout_diagram = (
    "[Customer Bag / Order Now]\n"
    "          |\n"
    "          v\n"
    "STEP 1: Delivery Address ──────> Validates Full Name, Indian Mobile (10 digits starting 6-9),\n"
    "          |                      Address Line 1, City, Canonical State/UT, 6-digit PIN code.\n"
    "          v\n"
    "STEP 2: Delivery Options ──────> Standard Delivery (Free, 4-6 Days) OR Express (Rs 99, 2-3 Days).\n"
    "          |                      Server updates shipping fee and estimated delivery timeline.\n"
    "          v\n"
    "STEP 3: Payment Method   ──────> Online Payment (Razorpay Gateway) OR Cash on Delivery (COD).\n"
    "          |                      Calls POST /api/payments/create-order to generate Razorpay Order ID.\n"
    "          v\n"
    "STEP 4: Order Review     ──────> Final breakdown of Subtotal, Shipping, and Total Payable.\n"
    "          |\n"
    "          v\n"
    "[Trigger Razorpay Modal] ──────> Customer completes UPI / NetBanking / Card in Test Mode.\n"
    "          |\n"
    "          v\n"
    "[Backend Verification]   ──────> POST /api/payments/verify-payment executes HMAC-SHA256 check.\n"
    "          |\n"
    "          v\n"
    "[Order Confirmed]        ──────> Payment marked PAID, Order marked CONFIRMED, Cart cleared."
)
add_code_block(checkout_diagram)

add_h2("8.1 Financial Precision & Integrity")
add_bullet("Server-Side Recomputation: Subtotal and total amounts are calculated strictly on the backend from database product prices. Client-submitted prices are ignored.", "Price Authority: ")
add_bullet("INR to Integer Paise: Razorpay requires transaction amounts in the smallest currency unit (paise). CustomGift converts decimal rupees using int(Decimal * 100), eliminating floating-point rounding errors.", "Currency Precision: ")
add_bullet("Cryptographic Signature Verification: Upon successful completion in the Razorpay Checkout modal, the frontend submits razorpay_order_id, razorpay_payment_id, and razorpay_signature. The backend computes hmac_sha256(order_id + '|' + payment_id, secret) using timing-safe comparison.", "Anti-Tampering HMAC: ")
add_bullet("Audit Persistence: Every transaction is permanently recorded in the `payments` table with full IDs, status, amount, and timestamp.", "Transaction Ledger: ")

# --- CHAPTER 9 ---
add_h1("9. Admin Panel Operations Suite & Back-Office Controls")
add_p(
    "The upgraded Admin Dashboard (/admin) provides a production-grade operations center for store owners. It connects directly to live database models "
    "and features 9 dedicated operational modules."
)

admin_data = [
    ["Module", "Core Features & Operational Capabilities", "Associated APIs"],
    ["Overview Analytics", "Paid revenue totals, open order counts, order status distribution bars, payment method breakdown, top-5 best sellers.", "GET /api/admin/stats, GET /api/admin/analytics"],
    ["Product Catalog", "Clean catalog grid, search/filter, image uploads, featured toggles, and edit/create modals completely free of obsolete studio checkboxes.", "GET, POST, PATCH, DELETE /api/products"],
    ["Order Fulfillment", "Full order book, customer shipping details, items breakdown, payment status badges, and lifecycle transitions (PLACED -> DELIVERED).", "GET /api/orders/admin/all, PATCH /api/orders/{id}/status"],
    ["Razorpay Payments", "Dedicated Razorpay Test Mode audit banner, real-time transaction ledger with Payment IDs, Order IDs, customer email, amount, and status.", "GET /api/admin/payments"],
    ["Inventory Control", "Stock monitor with yellow low-stock alert pills (<5 units), red out-of-stock pills (0 units), and modal for instant stock adjustment.", "GET /api/admin/inventory, PATCH /api/admin/inventory/{id}"],
    ["Category Taxonomy", "Catalog taxonomy overview showing total and active item counts per category, with tool to atomically rename categories across all products.", "GET /api/admin/categories, PATCH /api/admin/categories/rename"],
    ["User Management", "Customer accounts directory with active status toggling (Activate / Suspend) and admin-assisted emergency recovery code generator.", "GET /api/admin/users, PATCH /api/admin/users/{id}/status"],
    ["Contact Inquiries", "Customer inquiry triage with status filters (New, In Progress, Resolved), search, read flags, detail view, and direct email reply.", "GET, PATCH, DELETE /api/admin/contact-messages"],
    ["WhatsApp & Settings", "Centralized store configuration: WhatsApp number (8485089678), country code (91), enquiry message template with dynamic tags, store email.", "GET, PATCH /api/admin/settings, GET /api/settings/whatsapp"]
]
add_table_data(admin_data[0], admin_data[1:], [1.3, 3.2, 2.0])

# --- CHAPTER 10 ---
add_h1("10. Comprehensive REST API Specifications")
add_p("The table below documents the verified RESTful API routes provided by the CustomGift backend.")

api_data = [
    ["HTTP", "Endpoint", "Purpose / Description", "Auth Required"],
    ["POST", "/api/auth/register", "Registers a new customer account with validation", "Public"],
    ["POST", "/api/auth/login", "Authenticates credentials and returns JWT access token", "Public"],
    ["POST", "/api/auth/forgot-password", "Dispatches a 6-digit email OTP for password reset", "Public"],
    ["POST", "/api/auth/reset-password", "Validates OTP and updates password", "Public"],
    ["POST", "/api/auth/recover-with-code", "Emergency password reset using 16-char recovery code", "Public"],
    ["GET", "/api/auth/me", "Retrieves current authenticated user profile", "Bearer Token"],
    ["GET", "/api/products", "Paginated, filtered, and sorted storefront catalog", "Public"],
    ["GET", "/api/products/categories", "Returns list of canonical deduplicated categories", "Public"],
    ["GET", "/api/products/{id}", "Retrieves single product details by ID or slug", "Public"],
    ["POST", "/api/products", "Creates a new product in catalog", "Admin Only"],
    ["PATCH", "/api/products/{id}", "Updates product details, price, or stock", "Admin Only"],
    ["DELETE", "/api/products/{id}", "Soft-deletes product from active catalog", "Admin Only"],
    ["GET", "/api/cart", "Retrieves isolated shopping cart for logged-in user", "Bearer Token"],
    ["POST", "/api/cart", "Adds a product item to customer cart", "Bearer Token"],
    ["PATCH", "/api/cart/{id}", "Updates item quantity in cart", "Bearer Token"],
    ["DELETE", "/api/cart/{id}", "Removes an item from cart", "Bearer Token"],
    ["DELETE", "/api/cart/clear", "Empties all items from customer cart", "Bearer Token"],
    ["GET", "/api/addresses", "Lists saved shipping addresses for current user", "Bearer Token"],
    ["POST", "/api/addresses", "Adds a new address to customer address book", "Bearer Token"],
    ["POST", "/api/orders", "Creates an order from cart or buy-now payload", "Bearer Token"],
    ["GET", "/api/orders/me", "Lists order history for current customer", "Bearer Token"],
    ["GET", "/api/orders/admin/all", "Lists all customer orders across platform", "Admin Only"],
    ["PATCH", "/api/orders/{id}/status", "Updates order lifecycle fulfillment status", "Admin Only"],
    ["POST", "/api/payments/create-order", "Initiates Razorpay order in paise for payment modal", "Bearer Token"],
    ["POST", "/api/payments/verify-payment", "Verifies Razorpay HMAC signature and confirms order", "Bearer Token"],
    ["GET", "/api/admin/stats", "Quick statistical counts for dashboard widgets", "Admin Only"],
    ["GET", "/api/admin/analytics", "Comprehensive revenue, order, and best seller analytics", "Admin Only"],
    ["GET", "/api/admin/payments", "Paginated Razorpay payment audit records", "Admin Only"],
    ["GET", "/api/admin/inventory", "Real-time stock monitor with low stock filtering", "Admin Only"],
    ["PATCH", "/api/admin/inventory/{id}", "Updates product inventory stock units directly", "Admin Only"],
    ["GET", "/api/admin/categories", "Lists categories with total and active product counts", "Admin Only"],
    ["PATCH", "/api/admin/categories/rename", "Atomically renames a category across entire catalog", "Admin Only"],
    ["PATCH", "/api/admin/users/{id}/status", "Toggles customer account active / suspended status", "Admin Only"],
    ["POST", "/api/admin/users/{id}/reset-recovery-code", "Generates emergency recovery code for locked user", "Admin Only"],
    ["GET", "/api/admin/contact-messages", "Paginated customer contact submissions", "Admin Only"],
    ["PATCH", "/api/admin/contact-messages/{id}/status", "Updates inquiry status (New, In Progress, Resolved)", "Admin Only"],
    ["GET", "/api/admin/settings", "Retrieves store and WhatsApp contact settings", "Admin Only"],
    ["PATCH", "/api/admin/settings", "Updates store and WhatsApp configuration", "Admin Only"],
    ["GET", "/api/settings/whatsapp", "Public endpoint providing active WhatsApp contact info", "Public"]
]
add_table_data(api_data[0], api_data[1:], [0.9, 2.5, 2.3, 0.8])

# --- CHAPTER 11 ---
add_h1("11. Security Architecture & Threat Protection Mechanisms")
add_p(
    "CustomGift employs a defense-in-depth model, enforcing authentication, authorization, cryptographic verification, "
    "and input sanitization at every layer."
)
add_h2("11.1 Authentication & Password Security")
add_bullet("Password Hashing: Passwords are encrypted using Passlib with Bcrypt and PBKDF2 algorithms with automatic salt generation.", "Hashing Algorithm: ")
add_bullet("Stateless JWT Tokens: User identity is encapsulated in signed HS256 JSON Web Tokens with embedded user ID, role, and expiration timestamp.", "Token Architecture: ")
add_bullet("Account Recovery Dual-Track: Provides 6-digit email OTPs (10-minute expiry) and 16-character emergency recovery codes (one-time use, SHA-256 hashed in database).", "Password Reset: ")
add_bullet("Admin Self-Lockout Protection: Administrative accounts are strictly blocked from deactivating their own administrative user record.", "Privilege Safety: ")

add_h2("11.2 Attack Surface Hardening")
add_bullet("Sliding-Window Rate Limiting: Sensitive endpoints (/api/auth/login, /api/auth/register, /api/contact) enforce IP-based rate limiting to thwart credential stuffing.", "Rate Limiting: ")
add_bullet("HMAC-SHA256 Signature Verification: Razorpay payment callbacks require valid HMAC signatures using the backend secret key before an order is marked as paid.", "Payment Anti-Tampering: ")
add_bullet("Timing-Safe Comparison: Cryptographic comparisons utilize `hmac.compare_digest` to prevent side-channel timing analysis attacks.", "Timing Protection: ")
add_bullet("Strict File Upload Validation: Media uploads are strictly verified for MIME type (image/jpeg, image/png, image/webp), file extension, and file size limits (5MB).", "Upload Sanitization: ")

# --- CHAPTER 12 ---
add_h1("12. DevOps, Environment Configuration & Deployment Topology")
add_p(
    "CustomGift is designed for seamless containerized or bare-metal deployment on modern cloud platforms."
)
add_h2("12.1 Environment Variable Configuration")
add_p("The application configuration is parsed using Pydantic Settings from `.env` files:")
add_bullet("APP_ENV: 'development', 'test', or 'production' (controls CORS strictness and error stack trace disclosure).", "Runtime Mode: ")
add_bullet("SECRET_KEY: Minimum 32-byte high-entropy string used for signing JWT tokens.", "JWT Cryptography: ")
add_bullet("DATABASE_URL: PostgreSQL connection string formatted as `postgresql+psycopg://user:password@host:port/database`.", "Database Connection: ")
add_bullet("RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET: API credentials generated from the Razorpay Dashboard (configured in Test Mode).", "Payment Gateway: ")
add_bullet("PAYMENT_DEMO_MODE: Boolean toggle (`false` for live Razorpay checkout, `true` for simulated local sandbox testing).", "Payment Mode: ")

add_h2("12.2 Production Deployment Topology")
add_bullet("Frontend Build: Vite compiles JSX and CSS into minified, hash-versioned static HTML/JS/CSS assets (`npm run build`). Assets are served via Nginx or Cloudflare CDN.", "Static Distribution: ")
add_bullet("Backend Execution: FastAPI runs on Python 3.11 with Uvicorn ASGI workers managed via systemd or Docker container runners.", "Application Server: ")
add_bullet("Database Management: Managed PostgreSQL instance with connection pooling and regular automated snapshot backups.", "Persistence Engine: ")

# --- CHAPTER 13 ---
add_h1("13. Detailed System Workflow Diagrams")

add_h2("13.1 Authentication & Session Lifecycle")
auth_wf = (
    "Customer               React Frontend                  FastAPI Backend                PostgreSQL\n"
    "   |                         |                                |                            |\n"
    "   |--- 1. Enter Credentials |                                |                            |\n"
    "   |------------------------>|                                |                            |\n"
    "   |                         |--- 2. POST /api/auth/login --->|                            |\n"
    "   |                         |                                |--- 3. Query User record -->|\n"
    "   |                         |                                |<-- 4. Return password_hash |\n"
    "   |                         |                                |                            |\n"
    "   |                         |                                |-- 5. Verify Bcrypt hash    |\n"
    "   |                         |                                |-- 6. Generate JWT (HS256)  |\n"
    "   |                         |<-- 7. 200 OK + access_token ---|                            |\n"
    "   |                         |                                |                            |\n"
    "   |<-- 8. Store token in    |                                |                            |\n"
    "   |       localStorage &    |                                |                            |\n"
    "   |       set Auth state ---|                                |                            |"
)
add_code_block(auth_wf)

add_h2("13.2 Order Placement & Razorpay Verification Flow")
pay_wf = (
    "Customer               Frontend Checkout               FastAPI Orders API             Razorpay API\n"
    "   |                         |                                |                            |\n"
    "   |--- 1. Place Order ----->|                                |                            |\n"
    "   |                         |--- 2. POST /api/orders ------->|                            |\n"
    "   |                         |   (Address, items, delivery)   |-- 3. Lock stock rows       |\n"
    "   |                         |                                |-- 4. Compute subtotal/fee  |\n"
    "   |                         |                                |-- 5. Persist Order PENDING |\n"
    "   |                         |<-- 6. Order Created (ID) ------|                            |\n"
    "   |                         |                                |                            |\n"
    "   |                         |--- 7. POST /create-order ----->|                            |\n"
    "   |                         |                                |--- 8. Create Order (paise)>|\n"
    "   |                         |                                |<-- 9. razorpay_order_id ---|\n"
    "   |                         |<-- 10. Return razorpay_order --|                            |\n"
    "   |                         |                                |                            |\n"
    "   |<-- 11. Open Checkout ---|                                |                            |\n"
    "   |    Razorpay Modal       |                                |                            |\n"
    "   |--- 12. Complete UPI --->|                                |                            |\n"
    "   |                         |--- 13. POST /verify-payment -->|                            |\n"
    "   |                         |   (order_id, pay_id, signature)|-- 14. Compute HMAC-SHA256  |\n"
    "   |                         |                                |-- 15. Verify signature OK  |\n"
    "   |                         |                                |-- 16. Mark Payment SUCCESS |\n"
    "   |                         |                                |-- 17. Mark Order CONFIRMED |\n"
    "   |                         |<-- 18. Verification Success ---|                            |\n"
    "   |<-- 19. Show Confirmation|                                |                            |"
)
add_code_block(pay_wf)

# --- CHAPTER 14 ---
add_h1("14. QA Testing Audit & Current Verification Status")
add_p(
    "The CustomGift codebase has undergone comprehensive automated testing and manual operational verification."
)
add_h2("14.1 Backend Test Suite (Pytest)")
add_p("Full test execution yielded 81 passing automated tests with zero failures:")
add_bullet("test_addresses_and_checkout_flow.py: 3 tests (Address book validation, multi-step checkout calculations).", "Addresses & Checkout: ")
add_bullet("test_admin.py: 7 tests (Analytics breakdown, payments audit, inventory updates, category renaming, user status toggle, store settings).", "Admin Operations: ")
add_bullet("test_auth.py: 9 tests (Registration, login, duplicate email handling, JWT authorization).", "Authentication: ")
add_bullet("test_authorization.py: 1 test (RBAC enforcement protecting administrative resources).", "Authorization: ")
add_bullet("test_cart_and_profile.py: 3 tests (User-isolated cart storage, profile data updates).", "Cart & Profile: ")
add_bullet("test_checkout.py: 4 tests (Pessimistic row locking, stock depletion, delivery fee pricing).", "Checkout Flow: ")
add_bullet("test_contact_api.py: 6 tests (Anti-spam honeypot, contact submissions, admin triage).", "Contact System: ")
add_bullet("test_fulfillment.py: 2 tests (Order lifecycle state transitions).", "Order Fulfillment: ")
add_bullet("test_password_recovery.py: 9 tests (Email OTPs, recovery codes, token invalidation).", "Password Recovery: ")
add_bullet("test_product_filters.py: 8 tests (Canonical category deduplication, price bounds, sorting).", "Product Catalog: ")
add_bullet("test_razorpay_integration.py: 8 tests (Order creation, HMAC verification, payment persistence).", "Razorpay Integration: ")
add_bullet("test_validation.py: 19 tests (Strict regex validation for Indian phone, email, name, password).", "Input Validation: ")
add_bullet("test_wishlist.py: 2 tests (Wishlist toggle and persistence).", "Wishlist: ")

add_h2("14.2 Frontend Test Suite (Node Test Runner)")
add_p("Full test execution yielded 105 passing automated tests across 19 test suites with zero failures:")
add_bullet("Multi-step checkout progression and Indian PIN / State dropdown validation.", "Checkout Suite: ")
add_bullet("Razorpay rupee-to-paise conversion and checkout options formatting.", "Payment Suite: ")
add_bullet("Product card three-button horizontal alignment (WhatsApp, Order Now, Gift Bag).", "Product Card: ")
add_bullet("Secure sign-out modal flow with session clearance.", "Sign-Out Suite: ")
add_bullet("Header profile navigation icon accessibility and removal of obsolete text links.", "Navigation: ")

# --- CHAPTER 15 ---
add_h1("15. Future Technical Roadmap & Strategic Improvements")
add_p(
    "While CustomGift is fully functional and production-ready in Razorpay Test Mode, the following enhancements represent logical next steps "
    "for scale and operational maturity:"
)
add_bullet("Transition Razorpay API keys from Test Mode (rzp_test_...) to Live Mode (rzp_live_...) following banking KYC activation.", "1. Razorpay Live Mode Activation: ")
add_bullet("Integrate automated Razorpay refund APIs directly into the Admin Order Management panel for cancelled orders.", "2. Automated Refund Processing: ")
add_bullet("Integrate Twilio or Gupshup SMS gateways to send automated WhatsApp order tracking updates to customers upon dispatch.", "3. Automated WhatsApp Order Notifications: ")
add_bullet("Connect real transactional email provider (SendGrid / AWS SES) for production email OTP delivery.", "4. Cloud SMTP Integration: ")
add_bullet("Offload media storage from local disk to Cloudinary or AWS S3 with CDN edge caching for ultra-fast product image delivery.", "5. Cloud Object Storage: ")

# --- CHAPTER 16 ---
add_h1("16. Appendix: Inspected Repository Scope & File Manifest")
add_p("The following repository directories and files were independently inspected and verified as the authoritative source of truth:")

scope_data = [
    ["Module / Directory", "Key Files Inspected", "Responsibility"],
    ["backend/app/api/", "admin.py, auth.py, orders.py, payments.py, products.py, settings.py, cart.py, addresses.py, contact.py", "REST API endpoint implementations"],
    ["backend/app/core/", "config.py, database.py, security.py, validators.py, logging.py", "Core application settings, hashing, and database engine"],
    ["backend/app/middleware/", "rate_limit.py, request_id.py, security.py", "Request security pipeline and rate limiting"],
    ["backend/app/models/", "entities.py, __init__.py", "SQLAlchemy relational entities and table mappings"],
    ["backend/app/schemas/", "admin.py, auth.py, order.py, payment.py, product.py, address.py, cart.py", "Pydantic validation and serialization schemas"],
    ["backend/app/services/", "payment_service.py, settings_service.py, upload_service.py, email_service.py", "Core business logic and third-party SDK wrappers"],
    ["backend/alembic/", "env.py, versions/ 20261111_0004 through 20261112_0009", "Database migration history up to latest head"],
    ["backend/tests/", "test_admin.py, test_razorpay_integration.py, test_checkout.py, etc.", "81 automated backend test cases"],
    ["frontend/src/pages/", "AdminDashboard.jsx, Checkout.jsx, ProductDetails.jsx, Profile.jsx, Shop.jsx, Home.jsx", "Client-side page views and workflows"],
    ["frontend/src/components/", "ProductCard.jsx, Navbar.jsx, Footer.jsx, WhatsAppIcon.jsx, SignOutConfirmationModal.jsx", "Reusable UI design components"],
    ["frontend/src/context/", "AuthContext.jsx, CartContext.jsx", "Client application state providers"],
    ["frontend/src/utils/", "whatsapp.js, indianStates.js, validators.js", "Client helper functions and phone formatting"],
    ["frontend/src/tests/", "complete_checkout_workflow.test.js, razorpay_payment_workflow.test.js, etc.", "105 automated frontend test cases"]
]
add_table_data(scope_data[0], scope_data[1:], [1.5, 2.5, 2.5])

# Save DOCX
doc.save(str(DOCX_PATH))
print(f"DOCX created successfully at: {DOCX_PATH}")

# ==============================================================================
# HTML BUILDER & PLAYWRIGHT PDF GENERATION
# ==============================================================================

print("Generating HTML template for PDF conversion...")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CustomGift Platform — Complete Project Architecture Documentation</title>
<style>
  @page {{
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @top-right {{
      content: "CustomGift Platform Architecture";
      font-size: 8pt;
      color: #64748b;
      font-family: Arial, sans-serif;
    }}
    @bottom-right {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #64748b;
      font-family: Arial, sans-serif;
    }}
  }}
  @page:first {{
    @top-right {{ content: normal; }}
    @bottom-right {{ content: normal; }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #2d3748;
    line-height: 1.5;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }}
  .cover-page {{
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    text-align: center;
    padding-top: 60px;
  }}
  .cover-badge {{
    display: inline-block;
    background: #f1edf9;
    color: #6d28d9;
    font-size: 10pt;
    font-weight: 700;
    padding: 6px 16px;
    border-radius: 999px;
    margin-bottom: 24px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }}
  .cover-title {{
    color: #2b1b4d;
    font-size: 28pt;
    font-weight: 800;
    margin: 0 0 12px;
    line-height: 1.2;
  }}
  .cover-subtitle {{
    color: #6d28d9;
    font-size: 15pt;
    font-weight: 600;
    margin: 0 0 50px;
  }}
  .cover-meta {{
    color: #64748b;
    font-size: 10pt;
    line-height: 1.8;
    max-width: 600px;
    border-top: 1px solid #e2e8f0;
    padding-top: 24px;
  }}
  h1 {{
    color: #2b1b4d;
    font-size: 17pt;
    font-weight: 800;
    margin-top: 32px;
    margin-bottom: 12px;
    border-bottom: 2px solid #f1edf9;
    padding-bottom: 6px;
    page-break-after: avoid;
  }}
  h2 {{
    color: #6d28d9;
    font-size: 13pt;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }}
  h3 {{
    color: #2d3748;
    font-size: 11pt;
    font-weight: 700;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}
  p {{
    margin: 0 0 8px;
    text-align: justify;
  }}
  ul {{
    margin: 0 0 12px 20px;
    padding: 0;
  }}
  li {{
    margin-bottom: 4px;
  }}
  .callout {{
    background: #f8f6fc;
    border-left: 4px solid #6d28d9;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 4px;
  }}
  .callout-title {{
    font-weight: 800;
    color: #6d28d9;
    font-size: 9.5pt;
    margin-bottom: 4px;
    text-transform: uppercase;
  }}
  pre {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 8pt;
    line-height: 1.35;
    overflow-x: auto;
    color: #1e293b;
    margin: 12px 0;
    page-break-inside: avoid;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}
  th, td {{
    border: 1px solid #e2e8f0;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }}
  th {{
    background: #2b1b4d;
    color: white;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 8pt;
    letter-spacing: 0.03em;
  }}
  tr:nth-child(even) td {{
    background: #f8fafc;
  }}
  .page-break {{
    page-break-after: always;
  }}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover-page">
  <div class="cover-badge">Enterprise E-Commerce System Design</div>
  <div class="cover-title">CustomGift Platform</div>
  <div class="cover-subtitle">Complete Technical Architecture & System Design Documentation</div>
  <div class="cover-meta">
    <strong>Author:</strong> Senior Software Architect & Technical Lead<br>
    <strong>Version:</strong> 2.0.0 (Production-Ready Architecture)<br>
    <strong>Technology Stack:</strong> React 18, Vite, FastAPI 0.115, PostgreSQL, SQLAlchemy 2.0, Alembic, Razorpay SDK<br>
    <strong>Verification:</strong> 81 Backend Tests (100% Pass) | 105 Frontend Tests (100% Pass)<br>
    <strong>Date:</strong> November 2026<br>
    <em>Confidential & Proprietary — CustomGift Platform</em>
  </div>
</div>

<!-- CHAPTER 1 -->
<h1>1. Executive Overview & Core Objectives</h1>
<p>
  CustomGift is an enterprise-grade personalized e-commerce application engineered to deliver handcrafted and customized gifts across India. 
  Unlike generic retail platforms, CustomGift is tailored specifically to the nuances of gifting, where customers seek meaningful emotional keepsakes, 
  anniversary frames, engraved keychains, customized mugs, and curated celebration hampers.
</p>
<h2>1.1 Purpose and Problem Statement</h2>
<p>
  Traditional e-commerce platforms struggle with personalized gifting due to rigid product configurators, fragile web-based design canvas tools that crash on mobile devices, 
  and impersonal checkout flows. CustomGift solves this by decoupling standard catalog purchasing from personalized consultation. Customers can seamlessly buy gifts 
  through a frictionless Indian e-commerce checkout while collaborating directly with human artisans via WhatsApp for custom photo engraving, name stamping, and bespoke requirements.
</p>
<h2>1.2 Core Architectural Objectives</h2>
<ul>
  <li><strong>High Performance:</strong> Sub-50ms backend API responses powered by asynchronous FastAPI and efficient PostgreSQL indexing.</li>
  <li><strong>Strict Financial Integrity:</strong> Zero-trust server-side pricing, Razorpay payment verification using HMAC-SHA256 signatures, and atomic inventory management.</li>
  <li><strong>Real-World Indian Checkout Standards:</strong> Multi-step checkout with canonical 36 Indian States/UTs, 6-digit PIN validation, and optional address persistence.</li>
  <li><strong>Decoupled Personalization:</strong> Direct WhatsApp integration (8485089678) eliminating obsolete canvas bugs and fragile file upload gates.</li>
  <li><strong>Comprehensive Back-Office Operations:</strong> Complete administrative control over catalog, stock alerts, orders, payment audits, and customer support triage.</li>
  <li><strong>Military-Grade Defense:</strong> Sliding-window rate limiting, anti-tampering verification, timing-safe credential comparisons, and strict role-based access control.</li>
</ul>

<!-- CHAPTER 2 -->
<h1>2. Verified Technology Stack & Dependency Matrix</h1>
<p>The table below details the actual technologies and verified software package versions actively powering the CustomGift repository.</p>
<table>
  <thead>
    <tr>
      <th>Tier / Domain</th>
      <th>Technology</th>
      <th>Verified Version</th>
      <th>Architectural Role</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Frontend Core</td><td>React</td><td>18.3.1</td><td>Component-based declarative UI library</td></tr>
    <tr><td>Build Tool</td><td>Vite</td><td>5.4.10 / 5.4.21</td><td>Ultra-fast ESM bundler with hot module replacement</td></tr>
    <tr><td>Client Routing</td><td>React Router DOM</td><td>6.28.0</td><td>Declarative client-side routing & protected route guards</td></tr>
    <tr><td>HTTP Client</td><td>Axios</td><td>1.7.7</td><td>Promise-based API client with Bearer token interceptors</td></tr>
    <tr><td>UI Icons</td><td>Lucide React</td><td>0.468.0</td><td>Tree-shakable clean SVG vector icon library</td></tr>
    <tr><td>Notifications</td><td>React Hot Toast</td><td>2.4.1</td><td>Accessible toast notifications for client feedback</td></tr>
    <tr><td>Backend Framework</td><td>FastAPI</td><td>0.115.0</td><td>Asynchronous ASGI web framework with OpenAPI generation</td></tr>
    <tr><td>ASGI Server</td><td>Uvicorn</td><td>0.30.6</td><td>High-performance production ASGI runner</td></tr>
    <tr><td>Data Validation</td><td>Pydantic & Settings</td><td>2.10.6 / 2.4.0</td><td>Strict request/response schema modeling and environment parsing</td></tr>
    <tr><td>ORM</td><td>SQLAlchemy</td><td>2.0.36</td><td>Enterprise object-relational mapping with selectin eager loading</td></tr>
    <tr><td>Database Driver</td><td>Psycopg (v3)</td><td>3.2.2</td><td>High-performance binary PostgreSQL database driver</td></tr>
    <tr><td>Schema Migrations</td><td>Alembic</td><td>1.13.0</td><td>Deterministic relational database schema revision control</td></tr>
    <tr><td>Database Engine</td><td>PostgreSQL</td><td>14+ / 16</td><td>Acid-compliant relational database management system</td></tr>
    <tr><td>Auth / Security</td><td>PyJWT & Passlib</td><td>2.13.0 / 1.7.4</td><td>Stateless HS256 JWT tokens and Bcrypt/PBKDF2 password hashing</td></tr>
    <tr><td>Payment Gateway</td><td>Razorpay Python SDK</td><td>2.0.1</td><td>Official SDK for Razorpay Orders and HMAC signature checks</td></tr>
    <tr><td>Image Processing</td><td>Pillow (PIL)</td><td>12.3.0</td><td>Server-side image verification and dimension processing</td></tr>
    <tr><td>Testing Engine</td><td>Pytest & Node Test</td><td>8.3.4 / Node 20+</td><td>Full automated test runners for backend APIs and frontend flows</td></tr>
  </tbody>
</table>

<!-- CHAPTER 3 -->
<h1>3. High-Level Multi-Tier Architecture & Layer Responsibilities</h1>
<p>
  CustomGift follows a clean multi-tier architectural pattern. The system cleanly separates presentation, business orchestration, persistence, 
  and third-party external integrations.
</p>
<pre>
+-----------------------------------------------------------------------------------+
|                              CLIENT LAYER (Browser)                               |
|   +---------------------------------------------------------------------------+   |
|   |   React 18 SPA (Vite)                                                     |   |
|   |   - Pages: Home, Shop, ProductDetails, Cart, Checkout, Profile, Admin     |   |
|   |   - State: AuthContext (JWT/User), CartContext (Isolated Bag State)       |   |
|   |   - Services: Axios API Interceptors, Toast Feedback, WhatsApp Utilities  |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST Calls (JSON)
+-----------------------------------------v-----------------------------------------+
|                         API GATEWAY & BACKEND LAYER (FastAPI)                     |
|   +---------------------------------------------------------------------------+   |
|   |   Middleware Pipeline:                                                    |   |
|   |   [1] RequestIdMiddleware (X-Request-ID Tracking)                         |   |
|   |   [2] SecurityHeadersMiddleware (HSTS, CSP, X-Frame, X-Content-Type)      |   |
|   |   [3] RateLimitMiddleware (Sliding-window IP Throttling)                  |   |
|   |   [4] CORSMiddleware (Origin Whitelisting)                                |   |
|   +---------------------------------------------------------------------------+   |
|   |   API Routers (/api):                                                     |   |
|   |   /auth | /products | /cart | /wishlist | /orders | /payments | /admin    |   |
|   +---------------------------------------------------------------------------+   |
|   |   Business Services:                                                      |   |
|   |   - PaymentService (Razorpay Orders & HMAC Verification)                  |   |
|   |   - SettingsService (Dynamic WhatsApp & Store Configurations)             |   |
|   |   - UploadService (Image Validation & Media Root Storage)                 |   |
|   |   - EmailService (Password Reset OTP Dispatching)                         |   |
|   +---------------------------------------------------------------------------+   |
|   |   Data Access Layer: SQLAlchemy 2.0 ORM + Alembic Migrations              |   |
+-------------------+---------------------+---------------------+-------------------+
                    |                     |                     |
                    v                     v                     v
+------------------------+ +------------------------+ +-----------------------------+
|      DATABASE          | |    PAYMENT GATEWAY     | |     WHATSAPP CHANNEL        |
|   PostgreSQL 14+ / 16  | |    Razorpay (Test Mode)| |     Business WhatsApp       |
|   - users, products    | |    - Order Generation  | |     +91 84850 89678         |
|   - orders, payments   | |    - Checkout Modal    | |     - Live artisan chat     |
|   - addresses, cart    | |    - HMAC Verification | |     - Custom photo sharing  |
|   - store_settings     | |    - Anti-tampering    | |     - Dynamic template links|
+------------------------+ +------------------------+ +-----------------------------+
</pre>

<!-- CHAPTER 4 -->
<h1>4. Frontend Client Architecture (React 18 & Vite)</h1>
<p>
  The frontend is architected as a modern Single-Page Application (SPA) using React 18, bundled with Vite for maximum developer productivity 
  and optimized static production assets.
</p>
<h2>4.1 Component & Page Organization</h2>
<ul>
  <li><strong>src/pages/:</strong> Contains full-page route components: Home, Shop, ProductDetails, Cart, Checkout, Profile, About, Contact, Login, Register, ForgotPassword, ResetPassword, OrderDetails, and AdminDashboard.</li>
  <li><strong>src/components/:</strong> Reusable design system primitives: Navbar, Footer, ProductCard, WhatsAppIcon, PasswordStrengthMeter, SignOutConfirmationModal, and search controls.</li>
  <li><strong>src/context/:</strong> React Context providers: AuthContext (session, login, register, logout, token management) and CartContext (gift bag state, buy-now bypass, quantity adjustment).</li>
  <li><strong>src/services/api.js:</strong> Centralized Axios instance preconfigured with baseURL, default JSON headers, and dynamic Authorization Bearer token attachment.</li>
  <li><strong>src/utils/:</strong> Helper libraries: indianStates.js (canonical 36 States/UTs), validators.js (strict regex engines), and whatsapp.js (dynamic link generators).</li>
</ul>
<div class="callout">
  <div class="callout-title">UI Refinement Specification</div>
  <strong>Profile Page Navigation Architecture:</strong> As per the latest UI refinement, the redundant 'My Profile' text links were removed from the header navigation bar 
  and footer. Profile access is now strictly provided via the interactive User Profile Icon in the header, which includes accessible aria labels, hover states, 
  and seamless routing to '/profile'.
</div>

<!-- CHAPTER 5 -->
<h1>5. Backend Server Architecture (FastAPI & Services)</h1>
<p>
  The CustomGift backend is built on FastAPI, leveraging Python 3.11 asynchronous capabilities, Pydantic type validation, and SQLAlchemy ORM.
</p>
<h2>5.1 Middleware Pipeline & Execution Order</h2>
<ul>
  <li><strong>1. RequestIdMiddleware:</strong> Generates or propagates a unique UUID4 'X-Request-ID' header, appending it to request context and backend logs for end-to-end traceability.</li>
  <li><strong>2. SecurityHeadersMiddleware:</strong> Injects enterprise security headers: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection: 1; mode=block, and Strict-Transport-Security.</li>
  <li><strong>3. RateLimitMiddleware:</strong> An in-memory sliding-window limiter protecting sensitive routes (e.g. /api/auth/login, /api/auth/register, /api/contact) against brute-force and DDoS attacks.</li>
  <li><strong>4. CORSMiddleware:</strong> Restricts cross-origin resource sharing strictly to configured frontend origins (e.g. http://localhost:5173, http://127.0.0.1:5173).</li>
</ul>

<!-- CHAPTER 6 -->
<h1>6. Database Architecture, Schema Design & Alembic Migrations</h1>
<p>
  The data layer is hosted on PostgreSQL and managed using SQLAlchemy 2.0 declarative models with Alembic schema migration tracking.
</p>
<pre>
+-------------------+       +-----------------------+       +------------------------+
|      users        |       |       addresses       |       |        products        |
+-------------------+       +-----------------------+       +------------------------+
| PK  id            |&lt;---+  | PK  id                |       | PK  id                 |
|     name          |    |  | FK  user_id           |       |     title              |
|     email (UQ)    |    +--|     full_name         |       |     slug (UQ)          |
|     password_hash |    |  |     phone, email      |       |     category           |
|     role          |    |  |     address_line1     |       |     price              |
|     is_active     |    |  |     city, state, PIN  |       |     stock              |
+-------------------+    |  +-----------------------+       |     is_active          |
       |                 |                                  +------------------------+
       | 1:N             | 1:N                                           | 1:N
       v                 |                                               v
+-------------------+    |                                  +------------------------+
|      orders       |----+                                  |      order_items       |
+-------------------+                                       +------------------------+
| PK  id            |&lt;--------------------------------------| PK  id                 |
| FK  user_id       | 1:N                                   | FK  order_id           |
|     order_number  |                                       | FK  product_id         |
|     subtotal      |                                       |     unit_price         |
|     shipping_fee  |                                       |     quantity           |
|     total_amount  |                                       +------------------------+
|     order_status  |                                                    ^
|     payment_status|                                                    |
+-------------------+                                                    |
       |                                                                 |
       | 1:N                                                             |
       v                                                                 |
+-------------------+       +-----------------------+       +------------------------+
|     payments      |       |      cart_items       |       |       wishlists        |
+-------------------+       +-----------------------+       +------------------------+
| PK  id            |       | PK  id                |       | PK  id                 |
| FK  order_id      |       | FK  user_id           |       | FK  user_id            |
| FK  user_id       |       | FK  product_id        |       | FK  product_id         |
|     razorpay_order|       |     quantity          |       |     created_at         |
|     razorpay_pay_id       +-----------------------+       +------------------------+
|     amount, status|       
+-------------------+       +-----------------------+       +------------------------+
                            |   contact_messages    |       |     store_settings     |
                            +-----------------------+       +------------------------+
                            | PK  id                |       | PK  id                 |
                            |     name, email       |       |     key (UQ)           |
                            |     subject, message  |       |     value              |
                            |     status, is_read   |       |     updated_at         |
                            +-----------------------+       +------------------------+
</pre>

<!-- CHAPTER 7 -->
<h1>7. Customer Application Workflow & WhatsApp Customization Channel</h1>
<p>
  CustomGift provides an intuitive, end-to-end purchasing journey tailored for personalized gifts.
</p>
<div class="callout">
  <div class="callout-title">Official Customization Architecture</div>
  <strong>Decoupled Personalization Workflow:</strong><br>
  - Online Studio and Canvas editors have been completely decommissioned.<br>
  - Target Business Number: +91 84850 89678 (configured via store_settings and settings_service).<br>
  - Customer Access Points: Dedicated WhatsApp button on every Product Card, Product Details page, and Navigation bar.<br>
  - Dynamic Link Encoding: Clicking WhatsApp opens wa.me with a prefilled message containing Product Title, Product ID, and direct URL.<br>
  - Checkout Freedom: Customers can complete product orders online without entering any mandatory customization text.
</div>

<!-- CHAPTER 8 -->
<h1>8. Multi-Step Checkout & Razorpay Payment Architecture</h1>
<p>
  The checkout workflow conforms strictly to Indian e-commerce standards, dividing checkout into 4 distinct steps with client and server validations.
</p>
<pre>
[Customer Bag / Order Now]
          |
          v
STEP 1: Delivery Address ──────> Validates Full Name, Indian Mobile (10 digits starting 6-9),
          |                      Address Line 1, City, Canonical State/UT, 6-digit PIN code.
          v
STEP 2: Delivery Options ──────> Standard Delivery (Free, 4-6 Days) OR Express (Rs 99, 2-3 Days).
          |                      Server updates shipping fee and estimated delivery timeline.
          v
STEP 3: Payment Method   ──────> Online Payment (Razorpay Gateway) OR Cash on Delivery (COD).
          |                      Calls POST /api/payments/create-order to generate Razorpay Order ID.
          v
STEP 4: Order Review     ──────> Final breakdown of Subtotal, Shipping, and Total Payable.
          |
          v
[Trigger Razorpay Modal] ──────> Customer completes UPI / NetBanking / Card in Test Mode.
          |
          v
[Backend Verification]   ──────> POST /api/payments/verify-payment executes HMAC-SHA256 check.
          |
          v
[Order Confirmed]        ──────> Payment marked PAID, Order marked CONFIRMED, Cart cleared.
</pre>

<!-- CHAPTER 9 -->
<h1>9. Admin Panel Operations Suite & Back-Office Controls</h1>
<p>
  The upgraded Admin Dashboard (/admin) provides a production-grade operations center for store owners. It connects directly to live database models 
  and features 9 dedicated operational modules.
</p>
<table>
  <thead>
    <tr>
      <th>Module</th>
      <th>Core Features & Operational Capabilities</th>
      <th>Associated APIs</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Overview Analytics</td><td>Paid revenue totals, open order counts, order status distribution bars, payment method breakdown, top-5 best sellers.</td><td>GET /api/admin/stats, GET /api/admin/analytics</td></tr>
    <tr><td>Product Catalog</td><td>Clean catalog grid, search/filter, image uploads, featured toggles, and edit/create modals completely free of obsolete studio checkboxes.</td><td>GET, POST, PATCH, DELETE /api/products</td></tr>
    <tr><td>Order Fulfillment</td><td>Full order book, customer shipping details, items breakdown, payment status badges, and lifecycle transitions (PLACED -> DELIVERED).</td><td>GET /api/orders/admin/all, PATCH /api/orders/{id}/status</td></tr>
    <tr><td>Razorpay Payments</td><td>Dedicated Razorpay Test Mode audit banner, real-time transaction ledger with Payment IDs, Order IDs, customer email, amount, and status.</td><td>GET /api/admin/payments</td></tr>
    <tr><td>Inventory Control</td><td>Stock monitor with yellow low-stock alert pills (&lt;5 units), red out-of-stock pills (0 units), and modal for instant stock adjustment.</td><td>GET /api/admin/inventory, PATCH /api/admin/inventory/{id}</td></tr>
    <tr><td>Category Taxonomy</td><td>Catalog taxonomy overview showing total and active item counts per category, with tool to atomically rename categories across all products.</td><td>GET /api/admin/categories, PATCH /api/admin/categories/rename</td></tr>
    <tr><td>User Management</td><td>Customer accounts directory with active status toggling (Activate / Suspend) and admin-assisted emergency recovery code generator.</td><td>GET /api/admin/users, PATCH /api/admin/users/{id}/status</td></tr>
    <tr><td>Contact Inquiries</td><td>Customer inquiry triage with status filters (New, In Progress, Resolved), search, read flags, detail view, and direct email reply.</td><td>GET, PATCH, DELETE /api/admin/contact-messages</td></tr>
    <tr><td>WhatsApp & Settings</td><td>Centralized store configuration: WhatsApp number (8485089678), country code (91), enquiry message template with dynamic tags, store email.</td><td>GET, PATCH /api/admin/settings, GET /api/settings/whatsapp</td></tr>
  </tbody>
</table>

<!-- CHAPTER 10 -->
<h1>10. Comprehensive REST API Specifications</h1>
<table>
  <thead>
    <tr>
      <th>HTTP</th>
      <th>Endpoint</th>
      <th>Purpose / Description</th>
      <th>Auth Required</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>POST</td><td>/api/auth/register</td><td>Registers a new customer account with validation</td><td>Public</td></tr>
    <tr><td>POST</td><td>/api/auth/login</td><td>Authenticates credentials and returns JWT access token</td><td>Public</td></tr>
    <tr><td>POST</td><td>/api/auth/forgot-password</td><td>Dispatches a 6-digit email OTP for password reset</td><td>Public</td></tr>
    <tr><td>POST</td><td>/api/auth/reset-password</td><td>Validates OTP and updates password</td><td>Public</td></tr>
    <tr><td>POST</td><td>/api/auth/recover-with-code</td><td>Emergency password reset using 16-char recovery code</td><td>Public</td></tr>
    <tr><td>GET</td><td>/api/auth/me</td><td>Retrieves current authenticated user profile</td><td>Bearer Token</td></tr>
    <tr><td>GET</td><td>/api/products</td><td>Paginated, filtered, and sorted storefront catalog</td><td>Public</td></tr>
    <tr><td>GET</td><td>/api/products/categories</td><td>Returns list of canonical deduplicated categories</td><td>Public</td></tr>
    <tr><td>GET</td><td>/api/products/{{id}}</td><td>Retrieves single product details by ID or slug</td><td>Public</td></tr>
    <tr><td>POST</td><td>/api/products</td><td>Creates a new product in catalog</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/products/{{id}}</td><td>Updates product details, price, or stock</td><td>Admin Only</td></tr>
    <tr><td>DELETE</td><td>/api/products/{{id}}</td><td>Soft-deletes product from active catalog</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/cart</td><td>Retrieves isolated shopping cart for logged-in user</td><td>Bearer Token</td></tr>
    <tr><td>POST</td><td>/api/cart</td><td>Adds a product item to customer cart</td><td>Bearer Token</td></tr>
    <tr><td>PATCH</td><td>/api/cart/{{id}}</td><td>Updates item quantity in cart</td><td>Bearer Token</td></tr>
    <tr><td>DELETE</td><td>/api/cart/{{id}}</td><td>Removes an item from cart</td><td>Bearer Token</td></tr>
    <tr><td>DELETE</td><td>/api/cart/clear</td><td>Empties all items from customer cart</td><td>Bearer Token</td></tr>
    <tr><td>GET</td><td>/api/addresses</td><td>Lists saved shipping addresses for current user</td><td>Bearer Token</td></tr>
    <tr><td>POST</td><td>/api/addresses</td><td>Adds a new address to customer address book</td><td>Bearer Token</td></tr>
    <tr><td>POST</td><td>/api/orders</td><td>Creates an order from cart or buy-now payload</td><td>Bearer Token</td></tr>
    <tr><td>GET</td><td>/api/orders/me</td><td>Lists order history for current customer</td><td>Bearer Token</td></tr>
    <tr><td>GET</td><td>/api/orders/admin/all</td><td>Lists all customer orders across platform</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/orders/{{id}}/status</td><td>Updates order lifecycle fulfillment status</td><td>Admin Only</td></tr>
    <tr><td>POST</td><td>/api/payments/create-order</td><td>Initiates Razorpay order in paise for payment modal</td><td>Bearer Token</td></tr>
    <tr><td>POST</td><td>/api/payments/verify-payment</td><td>Verifies Razorpay HMAC signature and confirms order</td><td>Bearer Token</td></tr>
    <tr><td>GET</td><td>/api/admin/stats</td><td>Quick statistical counts for dashboard widgets</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/admin/analytics</td><td>Comprehensive revenue, order, and best seller analytics</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/admin/payments</td><td>Paginated Razorpay payment audit records</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/admin/inventory</td><td>Real-time stock monitor with low stock filtering</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/admin/inventory/{{id}}</td><td>Updates product inventory stock units directly</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/admin/categories</td><td>Lists categories with total and active product counts</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/admin/categories/rename</td><td>Atomically renames a category across entire catalog</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/admin/users/{{id}}/status</td><td>Toggles customer account active / suspended status</td><td>Admin Only</td></tr>
    <tr><td>POST</td><td>/api/admin/users/{{id}}/reset-recovery-code</td><td>Generates emergency recovery code for locked user</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/admin/contact-messages</td><td>Paginated customer contact submissions</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/admin/contact-messages/{{id}}/status</td><td>Updates inquiry status (New, In Progress, Resolved)</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/admin/settings</td><td>Retrieves store and WhatsApp contact settings</td><td>Admin Only</td></tr>
    <tr><td>PATCH</td><td>/api/admin/settings</td><td>Updates store and WhatsApp configuration</td><td>Admin Only</td></tr>
    <tr><td>GET</td><td>/api/settings/whatsapp</td><td>Public endpoint providing active WhatsApp contact info</td><td>Public</td></tr>
  </tbody>
</table>

<!-- CHAPTER 11 -->
<h1>11. Security Architecture & Threat Protection Mechanisms</h1>
<ul>
  <li><strong>Password Encryption:</strong> Passwords are hashed using Passlib with Bcrypt and PBKDF2 with automatic unique salting.</li>
  <li><strong>Stateless JWT Authentication:</strong> HS256 signed JSON Web Tokens containing user identity, role, and expiration timestamp.</li>
  <li><strong>Dual-Track Recovery:</strong> 6-digit email OTPs (10-minute expiry) and 16-character emergency recovery codes (SHA-256 hashed).</li>
  <li><strong>Sliding-Window Rate Limiting:</strong> IP-based request throttling protecting authentication and contact submission routes.</li>
  <li><strong>Cryptographic HMAC Verification:</strong> Server-side HMAC-SHA256 signature verification for all Razorpay online payments.</li>
  <li><strong>Timing-Safe Comparisons:</strong> Utilizes constant-time comparison (hmac.compare_digest) to prevent side-channel timing attacks.</li>
</ul>

<!-- CHAPTER 12 -->
<h1>12. DevOps, Environment Configuration & Deployment Topology</h1>
<ul>
  <li><strong>Vite Production Build:</strong> Compiles React components into minified, hash-versioned static chunks for zero runtime compilation overhead.</li>
  <li><strong>FastAPI Uvicorn Runner:</strong> Multi-worker ASGI execution with automated restart capability and comprehensive structured logging.</li>
  <li><strong>Database Pooling:</strong> Connection pooling via SQLAlchemy with automatic reconnection and transaction rollbacks on failure.</li>
</ul>

<!-- CHAPTER 14 -->
<h1>14. QA Testing Audit & Current Verification Status</h1>
<p>
  The CustomGift platform has undergone rigorous automated testing and independent validation:
</p>
<ul>
  <li><strong>Backend API Test Suite:</strong> 81 / 81 automated tests passing via Pytest (100% pass rate).</li>
  <li><strong>Frontend Client Test Suite:</strong> 105 / 105 automated unit and integration tests passing via Node Test Runner.</li>
  <li><strong>Production Asset Compilation:</strong> Clean Vite production build with zero bundling errors or warnings.</li>
  <li><strong>Database Migrations:</strong> Alembic schema migration verified up to date at revision 20261112_0009.</li>
  <li><strong>Razorpay Integration:</strong> Verified in Test Mode using authenticated backend environment credentials.</li>
</ul>

<!-- CHAPTER 15 -->
<h1>15. Future Technical Roadmap & Strategic Improvements</h1>
<ul>
  <li><strong>Razorpay Live Mode:</strong> Activate live production merchant credentials following commercial KYC completion.</li>
  <li><strong>Automated Refunds:</strong> Implement direct refund dispatching from the Admin Order Management panel.</li>
  <li><strong>Automated WhatsApp Dispatch Notifications:</strong> Integrate Twilio / Gupshup for automatic order status notifications.</li>
  <li><strong>Cloud Object Storage:</strong> Migrate static media uploads from local storage to Amazon S3 or Cloudinary with CDN distribution.</li>
</ul>

<!-- CHAPTER 16 -->
<h1>16. Appendix: Inspected Repository Scope & File Manifest</h1>
<table>
  <thead>
    <tr>
      <th>Module / Directory</th>
      <th>Key Files Inspected</th>
      <th>Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>backend/app/api/</td><td>admin.py, auth.py, orders.py, payments.py, products.py, settings.py, cart.py, addresses.py, contact.py</td><td>REST API endpoint implementations</td></tr>
    <tr><td>backend/app/core/</td><td>config.py, database.py, security.py, validators.py, logging.py</td><td>Core application settings, hashing, and database engine</td></tr>
    <tr><td>backend/app/middleware/</td><td>rate_limit.py, request_id.py, security.py</td><td>Request security pipeline and rate limiting</td></tr>
    <tr><td>backend/app/models/</td><td>entities.py, __init__.py</td><td>SQLAlchemy relational entities and table mappings</td></tr>
    <tr><td>backend/app/schemas/</td><td>admin.py, auth.py, order.py, payment.py, product.py, address.py, cart.py</td><td>Pydantic validation and serialization schemas</td></tr>
    <tr><td>backend/app/services/</td><td>payment_service.py, settings_service.py, upload_service.py, email_service.py</td><td>Core business logic and third-party SDK wrappers</td></tr>
    <tr><td>backend/alembic/</td><td>env.py, versions/ 20261111_0004 through 20261112_0009</td><td>Database migration history up to latest head</td></tr>
    <tr><td>backend/tests/</td><td>test_admin.py, test_razorpay_integration.py, test_checkout.py, etc.</td><td>81 automated backend test cases</td></tr>
    <tr><td>frontend/src/pages/</td><td>AdminDashboard.jsx, Checkout.jsx, ProductDetails.jsx, Profile.jsx, Shop.jsx, Home.jsx</td><td>Client-side page views and workflows</td></tr>
    <tr><td>frontend/src/components/</td><td>ProductCard.jsx, Navbar.jsx, Footer.jsx, WhatsAppIcon.jsx, SignOutConfirmationModal.jsx</td><td>Reusable UI design components</td></tr>
    <tr><td>frontend/src/context/</td><td>AuthContext.jsx, CartContext.jsx</td><td>Client application state providers</td></tr>
    <tr><td>frontend/src/utils/</td><td>whatsapp.js, indianStates.js, validators.js</td><td>Client helper functions and phone formatting</td></tr>
    <tr><td>frontend/src/tests/</td><td>complete_checkout_workflow.test.js, razorpay_payment_workflow.test.js, etc.</td><td>105 automated frontend test cases</td></tr>
  </tbody>
</table>

</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML created successfully at: {HTML_PATH}")

print("Launching Playwright to render PDF via Edge engine...")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")
    page = browser.new_page()
    page.goto(HTML_PATH.resolve().as_uri())
    page.pdf(
        path=str(PDF_PATH),
        format="A4",
        print_background=True,
        margin={"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
        display_header_footer=True,
        header_template='<div style="font-size: 8pt; color: #64748b; font-family: Arial, sans-serif; width: 100%; text-align: right; padding-right: 15mm;">CustomGift Platform — Complete Project Architecture Documentation</div>',
        footer_template='<div style="font-size: 8pt; color: #64748b; font-family: Arial, sans-serif; width: 100%; text-align: right; padding-right: 15mm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    )
    browser.close()

print(f"PDF created successfully at: {PDF_PATH}")
print("All documentation artifacts generated successfully!")
