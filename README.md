A full-stack e-commerce platform designed to make gifting simple, personalized, and convenient. Customers can explore products, manage their shopping cart, place orders, make secure online payments, and submit personalized gift customization requests through WhatsApp.

The platform also provides an admin dashboard to manage products, orders, customers, payments, inventory, and customer inquiries.
- User registration, login, and authentication
- Browse products with search, filtering, and sorting
- Product details and product categories
- Shopping cart management
- Wishlist and customer profile
- Secure checkout with delivery address management
- Multiple payment options:
  - Razorpay online payments
  - Cash on Delivery (COD)
- Order confirmation and order history
- Password recovery and reset
- WhatsApp-based gift customization inquiries
- Responsive interface for desktop, tablet, and mobile
- Admin dashboard and analytics
- Product and category management
- Order management and status updates
- Payment management
- Inventory management
- Customer and user management
- Customer inquiry management
- Store settings and configuration
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing
- Request validation
- Rate limiting
- Security middleware
- Database migrations using Alembic
- Payment signature verification
- Automated backend and frontend tests
Layer	Technologies
Frontend	React.js, Vite, JavaScript
UI & Styling	CSS, Lucide React
Backend	Python, FastAPI
Database	PostgreSQL
ORM	SQLAlchemy
Database Migrations	Alembic
Validation	Pydantic
Authentication	JWT
Payment Gateway	Razorpay
Customization Enquiries	WhatsApp Integration
Testing	Pytest, Vitest
Containerization	Docker, Docker Compose
Version Control	Git, GitHub
```
CustomGift-Platform/
│
├── backend/
│   ├── app/
│   │   ├── api/             # REST API routers
│   │   ├── core/            # Configuration, database, security
│   │   ├── dependencies/    # Authentication and RBAC dependencies
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # Business logic, email and payments
│   │   ├── main.py
│   │   └── seed.py
│   │
│   ├── alembic/             # Database migrations
│   ├── tests/               # Backend test cases
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   └── products/        # Product images
│   │
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── pages/           # Application pages
│   │   ├── services/        # API integration
│   │   └── styles/          # Application styles
│   │
│   ├── Dockerfile
│   └── package.json
│
├── docs/
│   └── ARCHITECTURE.md
│
├── docker-compose.yml
└── README.md
```
Make sure you have the following installed:
- Python 3.11+
- Node.js and npm
- PostgreSQL 17+
- Git
- Docker Desktop (optional)
```
git clone https://github.com/meraj-attar/Custom-Gift-Platform.git
cd Custom-Gift-Platform
```
Navigate to the backend directory:
```
cd backend
```
Create and activate a virtual environment.

Windows PowerShell:
```
python -m venv .venv
.venv\Scripts\Activate.ps1
```
Install dependencies:
```
pip install -r requirements.txt
```
Create your environment file using the example:
```
Copy-Item .env.example .env
```
Configure your database URL and required environment variables in backend/.env.

Run database migrations:
```
alembic upgrade head
```
Start the backend server:
```
uvicorn app.main:app --reload
```
Backend API:

http://localhost:8000

Interactive API documentation:

http://localhost:8000/docs
Open another terminal and navigate to the frontend directory:
```
cd frontend
```
Install dependencies:
```
npm install
```
Create the frontend environment file:
```
Copy-Item .env.example .env
```
Configure the backend API URL according to your frontend environment configuration.

Start the development server:
```
npm run dev
```
Open the local URL displayed by Vite in your terminal.
Docker Compose configuration is available for running the application using containers.

From the project root:
```
docker compose up --build
```
To stop the containers:
```
docker compose down
```
Check docker-compose.yml for configured services, ports, and environment requirements.
CustomGift Platform integrates Razorpay for online payments.
- Razorpay Test Mode is used for development and testing.
- Payment orders are created through the backend.
- Payment signatures are verified on the backend.
- Cash on Delivery is also supported.
Important: Never commit actual API keys, secrets, passwords, or production credentials to GitHub. Configure them through environment variables.
From the backend directory:
```
pytest
```
From the frontend directory:
```
npm test
```
Use the test scripts defined in frontend/package.json if the test command differs.
