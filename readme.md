# VASTRA (Atherwear) — Enterprise E-Commerce Platform

[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Upstash Redis](https://img.shields.io/badge/Cache-Upstash_Redis-00E599?logo=redis&logoColor=white)](https://upstash.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Scalar](https://img.shields.io/badge/API_Docs-Scalar-6B46C1)](http://localhost:3000/docs)

**VASTRA** is an enterprise-grade, full-stack fashion and e-commerce web platform engineered for high performance, reliability, and scale. Built on a modular NestJS architecture and a modern React frontend, VASTRA features automated dropshipping catalog integration, Upstash Redis caching, Razorpay payment processing, and interactive Scalar API documentation.

---

## 🌟 Key Features

- **⚡ High-Performance Architecture**: Built with NestJS (Express framework) and React with Vite, featuring server-side REST caching with Upstash Redis.
- **📚 Interactive OpenAPI & Scalar Docs**: Fully documented interactive API suite available out of the box via Scalar UI (`/docs`) and Swagger UI (`/api/docs`).
- **📦 CJ Dropshipping Integration**: Automated product catalog synchronization, inventory tracking, keyword crawling, and order fulfillment.
- **💳 Multi-Method Payments**: Support for Cash-on-Delivery (COD) and online payments via Razorpay with HMAC signature verification.
- **🤖 AI Fashion Stylist (`Ask Vastra`)**: AI-powered outfit recommendations and personalized styling assistance.
- **🔐 Secure Authentication**: JWT authentication supporting dual-factor verification via Email and SMS OTPs (Twilio & Resend).
- **🛡️ Order Integrity & Fraud Controls**: Strict verification requiring orders to be delivered prior to processing return requests or product reviews.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, Redux Toolkit, Lucide React |
| **Backend** | NestJS 11, Node.js, Express, TypeScript |
| **Databases & Caching** | MongoDB Atlas (Mongoose ORM), Upstash Redis (REST Client) |
| **API Documentation** | `@scalar/nestjs-api-reference`, `@nestjs/swagger` |
| **Integrations** | Razorpay Gateway, CJ Dropshipping REST API, Resend Email, Twilio SMS |

---

## 📁 Repository Structure

```
MW collection/
├── backend/                  # NestJS Backend API Application
│   ├── src/
│   │   ├── modules/          # Domain Modules (Auth, Products, Cart, Orders, Admin, etc.)
│   │   ├── scripts/          # Database seeding & cache management scripts
│   │   ├── bootstrap.ts      # Server initialization & middleware setup
│   │   └── main.ts           # Application entry point
│   └── package.json
├── frontend/                 # React + Vite Frontend Web Application
│   ├── src/
│   │   ├── components/       # Reusable UI Components
│   │   ├── pages/            # View Pages (Home, Product, Cart, Checkout, Admin, etc.)
│   │   ├── services/         # API Service Layer & Axios Client
│   │   └── store/            # Redux Toolkit Slices (Cart, Auth, Wishlist)
│   └── package.json
└── README.md                 # Project Documentation
```

---

## 🔌 API Registry Summary

| Module | Base Path | Description | Key Operations |
|---|---|---|---|
| **Auth** | `/api/auth` | Authentication & Account Security | Signup, Login, Email/SMS OTP Verification, JWT Refresh |
| **Users** | `/api/users` | Profile & Account Management | Profile updates, Password changes, Session data |
| **Products** | `/api/products` | Catalog & Inventory | Paginated listing, Category filter, Product detail, Reviews |
| **Collections**| `/api/collections`| Curated Collections | Men's, Women's, and category-filtered collections |
| **Categories** | `/api/categories`| Taxonomy & Categories | Active product category hierarchy |
| **Cart** | `/api/cart` | Cart Management | Persistent user cart, Item addition/removal, Quantity updates |
| **Wishlist** | `/api/wishlist` | Saved Items | User wishlist management |
| **Orders** | `/api/orders` | Order Processing | Order creation, History retrieval, Fulfillment status |
| **Payments** | `/api/payments` | Razorpay Gateway Integration | Payment order generation, HMAC verification |
| **Returns** | `/api/returns` | Returns & Exchanges | Return request submission, Admin status management |
| **AI Stylist**| `/api/ask-vastra`| AI Recommendations | Outfit styling & recommendation queries |
| **CJ Dropship**| `/api/cj` | Dropshipping Gateway | Catalog sync, Stock check, Direct order forwarding |
| **Support** | `/api/contact` | Customer Service | Inquiry submissions, Admin support inbox |
| **Admin** | `/api/admin` | Store Administration | Dashboard analytics, Product/Order management, User audits |

> [!TIP]
> Explore all interactive API endpoints with live execution and request builders at:
> - **Scalar API Reference**: `http://localhost:3000/docs`
> - **Swagger UI Documentation**: `http://localhost:3000/api/docs`

---

## ⚡ Setup & Local Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas Connection URI
- **Upstash Redis**: Upstash REST URL & Token

---

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Configure environment variables (.env)
cp .env.example .env
```

Ensure your `.env` contains the required credentials:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/aetherwear
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
JWT_SECRET=your_jwt_secret_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Start the backend development server:
```bash
npm run start:dev
```
*The backend server will start at `http://localhost:3000`.*

---

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install

# Configure environment variables (.env)
cp .env.example .env
```

Ensure your `.env` contains:
```env
VITE_API_URL=/api
VITE_APP_NAME=VASTRA
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

Start the frontend development server:
```bash
npm run dev
```
*The web application will open at `http://localhost:5173`.*

---

## 🧪 Production Verification & Build Check

To build both services for production:

```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build
```

---

## 📄 License

This project is proprietary software developed for **VASTRA (Atherwear)**. All rights reserved.