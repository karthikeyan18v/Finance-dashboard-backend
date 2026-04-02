# Finance Dashboard Backend

A role-based REST API for managing financial records with dashboard analytics. Built with Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB (Mongoose v9) |
| Authentication | JWT (jsonwebtoken) |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Password Hashing | bcryptjs |

---

## Role Model

| Role | View own records | View all records | Create / Update / Delete records | Manage users |
|---|:---:|:---:|:---:|:---:|
| **viewer** | ✅ | ❌ | ❌ | ❌ |
| **analyst** | ✅ | ✅ | ❌ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ |

> Viewers are scoped to their own records everywhere — records list, dashboard summary, category totals, trends, and recent activity all filter by the authenticated user's ID.

---

## Project Structure

```
finance-dashboard-backend/
├── app.js                          # Express app (routes, middleware, rate limiter)
├── src/
│   ├── server.js                   # Entry point — connects DB and starts server
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   ├── seed.js                 # Seeds default admin (npm run seed)
│   │   └── seedTestData.js         # Seeds test users + records (npm run seed:test)
│   ├── controllers/
│   │   ├── authController.js       # register, login, createUser
│   │   ├── userController.js       # Admin user management
│   │   ├── recordController.js     # Financial record CRUD
│   │   └── dashboardController.js  # Summary, categories, trends, recent
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT verification
│   │   ├── roleMiddleware.js       # Role-based authorization
│   │   ├── validateMiddleware.js   # express-validator error formatter
│   │   └── errorMiddleware.js      # Global error handler
│   ├── models/
│   │   ├── User.js                 # User schema (soft delete, password hidden)
│   │   └── Record.js               # Record schema (soft delete)
│   └── routes/
│       ├── authRoutes.js
│       ├── userRoutes.js
│       ├── recordRoutes.js
│       └── dashboardRoutes.js
```

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/karthikeyan18v/Finance-dashboard-backend.git
cd Finance-dashboard-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Create a `.env` file in the project root:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development

# Default admin credentials (used by: npm run seed)
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@finance.com
ADMIN_PASSWORD=Admin@1234
```

### 4. Seed the default admin (run once)
```bash
npm run seed
```
Creates the first admin account using the credentials in `.env`. Safe to run multiple times — skips if the admin already exists.

### 5. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

---

## Quick Start Flow

```
1. npm run seed              → creates admin@finance.com / Admin@1234
2. POST /auth/login          → get admin JWT token
3. POST /auth/users          → admin creates analyst / viewer users
4. POST /records             → admin creates records (can assign to any user)
5. GET  /dashboard/summary   → each role sees their scoped data
```

---

## API Reference

All protected routes require:
```
Authorization: Bearer <token>
```

---

### Health

#### `GET /health`
Public. Returns server status.

**Response `200`:**
```json
{ "status": "ok" }
```

---

### Auth

#### `POST /auth/register`
Public self-signup. Always creates a **viewer** account.

**Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Response `201`:**
```json
{
  "message": "Registration successful",
  "user": {
    "_id": "...",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "viewer",
    "isActive": true
  }
}
```

---

#### `POST /auth/login`
Returns a signed JWT on valid credentials.

**Body:**
```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "...",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "viewer"
  }
}
```

---

#### `POST /auth/users` 🔒 Admin only
Admin creates a user with any role.

**Body:**
```json
{
  "name": "Bob",
  "email": "bob@example.com",
  "password": "pass123",
  "role": "analyst"
}
```
> `role` must be one of: `viewer`, `analyst`, `admin`

**Response `201`:**
```json
{
  "message": "User created",
  "user": { "_id": "...", "name": "Bob", "role": "analyst" }
}
```

---

### Users 🔒 Admin only

All `/users` routes require admin role.

---

#### `GET /users`
List all users with optional filters and pagination.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `role` | string | Filter by role: `viewer`, `analyst`, `admin` |
| `isActive` | boolean | Filter by status: `true` or `false` |
| `search` | string | Search by name or email |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

**Response `200`:**
```json
{
  "users": [ { "_id": "...", "name": "...", "role": "...", "isActive": true } ],
  "pagination": { "total": 5, "page": 1, "limit": 10, "pages": 1 }
}
```

---

#### `GET /users/:id`
Get a single user by ID.

**Response `200`:**
```json
{ "_id": "...", "name": "Bob", "email": "bob@example.com", "role": "analyst", "isActive": true }
```

---

#### `PUT /users/:id`
Update user's name, email, or role.

**Body (all fields optional):**
```json
{
  "name": "Bobby",
  "email": "bobby@example.com",
  "role": "admin"
}
```

**Response `200`:**
```json
{ "message": "User updated", "user": { ... } }
```

---

#### `PATCH /users/:id/status`
Toggle user active / inactive status.

**Response `200`:**
```json
{ "message": "User deactivated", "user": { ... } }
```
> Admin cannot toggle their own status.

---

#### `DELETE /users/:id`
Soft-delete a user (sets `deletedAt` timestamp, hides from all queries).

**Response `200`:**
```json
{ "message": "User deleted" }
```
> Admin cannot delete their own account.

---

### Records

| Method | Endpoint | viewer | analyst | admin |
|---|---|:---:|:---:|:---:|
| GET | `/records` | own only | all | all |
| GET | `/records/:id` | own only | all | all |
| POST | `/records` | ❌ | ❌ | ✅ |
| PUT | `/records/:id` | ❌ | ❌ | ✅ |
| DELETE | `/records/:id` | ❌ | ❌ | ✅ |

---

#### `GET /records` 🔒 All roles
List records with filters, pagination, and sorting. Viewers see only their own records.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `type` | string | `income` or `expense` |
| `category` | string | Partial match (case-insensitive) |
| `startDate` | ISO 8601 | Filter from this date |
| `endDate` | ISO 8601 | Filter to this date |
| `search` | string | Search in notes field |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |
| `sortBy` | string | `date`, `amount`, or `createdAt` (default: `date`) |
| `order` | string | `asc` or `desc` (default: `desc`) |

**Response `200`:**
```json
{
  "records": [
    {
      "_id": "...",
      "amount": 5000,
      "type": "income",
      "category": "Salary",
      "date": "2024-03-01T00:00:00.000Z",
      "notes": "March salary",
      "createdBy": { "_id": "...", "name": "Alice", "email": "alice@example.com", "role": "viewer" }
    }
  ],
  "pagination": { "total": 12, "page": 1, "limit": 10, "pages": 2 }
}
```

---

#### `GET /records/:id` 🔒 All roles
Get a single record. Viewers can only access their own records.

---

#### `POST /records` 🔒 Admin only
Create a financial record. Admin can assign the record to any user via `userId`.

**Body:**
```json
{
  "amount": 5000,
  "type": "income",
  "category": "Salary",
  "date": "2024-03-01",
  "notes": "March salary",
  "userId": "OPTIONAL_USER_ID"
}
```
> If `userId` is omitted, the record is assigned to the admin themselves.

**Response `201`:**
```json
{
  "message": "Record created",
  "record": { "_id": "...", "amount": 5000, "type": "income", ... }
}
```

---

#### `PUT /records/:id` 🔒 Admin only
Update any field on an existing record.

**Body (all fields optional):**
```json
{
  "amount": 5500,
  "type": "income",
  "category": "Salary",
  "date": "2024-03-01",
  "notes": "Updated note"
}
```

**Response `200`:**
```json
{ "message": "Record updated", "record": { ... } }
```

---

#### `DELETE /records/:id` 🔒 Admin only
Soft-delete a record (sets `deletedAt`, hidden from all queries).

**Response `200`:**
```json
{ "message": "Record deleted" }
```

---

### Dashboard 🔒 All roles

All dashboard endpoints respect role-based data scoping:
- **viewer** — sees only their own data
- **analyst / admin** — sees all users' data

---

#### `GET /dashboard/summary`
Total income, expense, net balance, and record count.

**Response `200`:**
```json
{
  "totalIncome": 15000,
  "totalExpense": 5000,
  "netBalance": 10000,
  "totalRecords": 12
}
```

---

#### `GET /dashboard/categories`
Category-wise breakdown with income/expense split and totals, sorted by highest total first.

**Response `200`:**
```json
{
  "categories": [
    {
      "_id": "Salary",
      "breakdown": [
        { "type": "income", "total": 10000, "count": 2 }
      ],
      "categoryTotal": 10000
    },
    {
      "_id": "Rent",
      "breakdown": [
        { "type": "expense", "total": 2400, "count": 2 }
      ],
      "categoryTotal": 2400
    }
  ]
}
```

---

#### `GET /dashboard/recent`
Most recently created records.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `limit` | number | Number of records to return (default: 5, max: 50) |

**Response `200`:**
```json
{
  "records": [
    {
      "_id": "...",
      "amount": 300,
      "type": "expense",
      "category": "Groceries",
      "createdBy": { "name": "Alice", "email": "alice@example.com" }
    }
  ]
}
```

---

#### `GET /dashboard/trends`
Monthly or weekly income/expense trends for a given year.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `year` | number | Year to query (default: current year) |
| `groupBy` | string | `month` (default) or `week` |

**Response `200`:**
```json
{
  "year": 2024,
  "groupBy": "month",
  "trends": [
    { "period": 1, "income": 8500, "expense": 2100, "net": 6400 },
    { "period": 2, "income": 5000, "expense": 900, "net": 4100 },
    { "period": 3, "income": 7000, "expense": 1200, "net": 5800 }
  ]
}
```
> For `groupBy=month`, `period` is the month number (1–12).
> For `groupBy=week`, `period` is the ISO week number (1–53).

---

## Error Responses

All errors follow a consistent shape:

```json
{ "message": "Human-readable description" }
```

Validation errors include field-level detail:
```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email is required" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation failed |
| 401 | Missing or invalid/expired token |
| 403 | Insufficient role permissions |
| 404 | Resource not found |
| 409 | Duplicate value (e.g. email already registered) |
| 429 | Rate limit exceeded (100 req / 15 min per IP) |
| 500 | Internal server error |

---

## Rate Limiting

100 requests per IP per 15-minute window applied globally. Configurable in `app.js`.

---

## Optional Features Implemented

| Feature | Details |
|---|---|
| JWT expiry | Configurable via `JWT_EXPIRES_IN` in `.env` (default: 7 days) |
| Pagination | Available on `GET /records` and `GET /users` |
| Filtering & search | Records filterable by type, category, date range, notes |
| Soft delete | Both users and records use `deletedAt` — never hard deleted |
| Rate limiting | 100 req / 15 min per IP |
| Input validation | Field-level errors via express-validator |
| Global error handler | Handles Mongoose, JWT, and generic errors uniformly |
| Admin seeding | `npm run seed` bootstraps first admin from `.env` |
| Test data seeding | `npm run seed:test` populates sample users and records |

---

## Assumptions & Design Decisions

1. **Admin bootstrap** — No admin can be created via a public endpoint. The first admin is created via `npm run seed` using credentials from `.env`. After that, any admin can create further admins via `POST /auth/users`.

2. **Self-registration is always viewer** — `POST /auth/register` is public but always assigns the `viewer` role. Only an admin can create analyst or admin accounts.

3. **Soft deletes** — Both users and records are soft-deleted via a `deletedAt` timestamp. A Mongoose pre-hook automatically excludes soft-deleted documents from all standard queries.

4. **Record ownership** — When an admin creates a record, they can optionally pass a `userId` to assign it to another user. If omitted, it defaults to the admin's own ID.

5. **Dashboard scoping** — Dashboard endpoints use the same role-based filter as record endpoints. Viewer's summary, categories, and trends only reflect their own records.

6. **Aggregation ObjectId casting** — MongoDB aggregation pipelines do not auto-cast string IDs to ObjectId (unlike Mongoose `find()`). The dashboard controller explicitly casts viewer IDs using `new mongoose.Types.ObjectId()` to ensure correct scoping in `$match` stages.

7. **Password security** — Passwords are hashed with bcrypt (salt rounds: 10) and are never returned in any API response via Mongoose's `toJSON` override.
