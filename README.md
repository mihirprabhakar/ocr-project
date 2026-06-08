# OCR Admin Panel — MERN Stack

A full-featured Admin Panel for the OCR Scanning System. Built with MongoDB, Express, React, and Node.js.

## 📁 Project Structure

```
ocr-admin/
├── server/
│   ├── index.js              # Express server entry
│   ├── middleware/
│   │   └── auth.js           # JWT auth + admin guard
│   ├── models/
│   │   ├── User.js           # User schema
│   │   ├── Role.js           # Role + permissions schema
│   │   └── Template.js       # OCR template schema
│   └── routes/
│       ├── auth.js           # Login, register, /me
│       ├── roles.js          # CRUD roles
│       ├── users.js          # CRUD users + role/template assignment
│       ├── templates.js      # CRUD templates
│       └── dashboard.js      # Stats API
├── client/
│   └── src/
│       ├── App.js            # Routes + auth guards
│       ├── context/
│       │   └── AuthContext.js
│       ├── utils/
│       │   └── api.js        # Axios instance
│       └── pages/
│           ├── Login.js
│           ├── Dashboard.js
│           ├── Roles.js
│           ├── Users.js
│           └── Templates.js
└── package.json
```

## 🚀 Setup & Run

### Prerequisites
- Node.js v16+
- MongoDB (local or MongoDB Atlas)

### 1. Clone & Install

```bash
cd ocr-admin
npm run install-all
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

**.env:**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/ocr_admin
JWT_SECRET=change_this_to_something_secure
JWT_EXPIRE=7d
```

### 3. Run in Development

```bash
npm run dev
# Server: http://localhost:5000
# Client: http://localhost:3000
```

### 4. First Admin Account

Since there's no seeding, register the first account via API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@company.com","password":"Admin@123"}'
```

The **first registered user** is automatically set as admin.

---

## 🔐 API Endpoints

### Auth
| Method | Route | Access |
|--------|-------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Public (first = admin) |
| GET | `/api/auth/me` | Protected |

### Roles
| Method | Route | Access |
|--------|-------|--------|
| GET | `/api/roles` | Protected |
| POST | `/api/roles` | Admin only |
| PUT | `/api/roles/:id` | Admin only |
| DELETE | `/api/roles/:id` | Admin only |

### Users
| Method | Route | Access |
|--------|-------|--------|
| GET | `/api/users` | Admin only |
| POST | `/api/users` | Admin only |
| PUT | `/api/users/:id` | Admin only |
| PUT | `/api/users/:id/assign-role` | Admin only |
| PUT | `/api/users/:id/assign-templates` | Admin only |
| DELETE | `/api/users/:id` | Admin only |

### Templates
| Method | Route | Access |
|--------|-------|--------|
| GET | `/api/templates` | Protected |
| POST | `/api/templates` | Admin only |
| PUT | `/api/templates/:id` | Admin only |
| DELETE | `/api/templates/:id` | Admin only |

### Dashboard
| Method | Route | Access |
|--------|-------|--------|
| GET | `/api/dashboard/stats` | Admin only |

---

## 🎯 Features Implemented

### Admin Panel
- ✅ Role Creation (MIM, Sales, Finance + custom) with granular permissions
- ✅ Vendor/User Mapping — assign roles to users
- ✅ Template Management — define OCR fields, types, output format
- ✅ Template → Role assignment

### User Management
- ✅ Create/Edit/Delete users
- ✅ Assign roles to users
- ✅ Assign multiple templates to users
- ✅ Activate/Deactivate accounts
- ✅ Admin privilege toggle

### Dashboard
- ✅ Stats: total users, active roles, templates
- ✅ Recent users table
- ✅ Role-based navigation (admin vs regular user view)

### Security
- ✅ JWT authentication
- ✅ Bcrypt password hashing
- ✅ Protected routes (frontend + backend)
- ✅ Admin-only guards on sensitive routes

---

## 🔜 Next Steps (Phase 2)

- OCR Processing module (document upload + scan)
- Data Mapping UI
- SAP/API push integration
- Audit logs
- Password reset flow
