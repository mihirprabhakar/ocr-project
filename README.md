# OCR Admin Panel

A full-stack MERN application for managing document scanning, OCR data extraction, and SAP integration. Built for enterprise teams who need role-based access control over document workflows.

> For successful running of project please copy the .env.example file to .env file for further process . Command for doing the same is :-

**copy .env.example .env**

---

## Table of Contents

* Overview
* Tech Stack
* Project Structure
* Prerequisits
* Installation
* Environment Variables
* Running the project
* First Time Setup
* Features
* API References
* User Roles & Permissions
* OCR Scanning Flow
* SAP Integration
* Security
* Troubleshooting
* Project Roadmap

---

## Overview

The OCR Admin Panel automates the document scanning and data extraction workflow for organizations. Admins configure roles, users, and templates. Users upload documents, the system extracts data using OCR, and the processed data is pushed to SAP or any external ERP system.

```
Document Upload → OCR Scan → Field Extraction → Manual Verification → Push to SAP
```

---

## Tech Stack

| Layer          | Technology                |
| -------------- | ------------------------- |
| Frontend       | React 18, React Router v6 |
| Backend        | Node.js, Express.js       |
| Database       | MongoDB with Mongoose     |
| Authentication | JWT (JSON Web Tokens)     |
| OCR Engine     | Tesseract.js              |
| PDF Processing | pdf-to-img                |
| File Upload    | Multer                    |
| HTTP Client    | Axios                     |
| Dev Tools      | Nodemon, Concurrently     |

---

## Project Structure

```
ocr-admin/
│
├── server/                         # Backend — Node.js + Express
│   ├── index.js                    # Server entry point
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication + admin guard
│   │   └── upload.js               # Multer file upload handler
│   ├── models/
│   │   ├── User.js                 # User schema (with Super Admin protection)
│   │   ├── Role.js                 # Role + permissions schema
│   │   ├── Template.js             # OCR template + field definitions
│   │   └── ScanJob.js              # Scan job tracking schema
│   ├── routes/
│   │   ├── auth.js                 # Login, register, /me
│   │   ├── roles.js                # Role CRUD
│   │   ├── users.js                # User CRUD + role/template assignment
│   │   ├── templates.js            # Template CRUD
│   │   ├── scan.js                 # OCR upload, process, push, history
│   │   └── dashboard.js            # Dashboard statistics
│   ├── services/
│   │   ├── ocrService.js           # Tesseract.js OCR + field extraction engine
│   │   └── sapService.js           # SAP / ERP push service
│   └── uploads/                    # Uploaded documents (auto-created)
│
├── client/                         # Frontend — React
│   └── src/
│       ├── App.js                  # Routes + auth guards
│       ├── index.css               # Global styles + design tokens
│       ├── context/
│       │   └── AuthContext.js      # Auth state management
│       ├── utils/
│       │   └── api.js              # Axios instance with interceptors
│       ├── components/
│       │   └── layout/
│       │       ├── Layout.js       # Sidebar + main layout
│       │       └── Layout.css
│       └── pages/
│           ├── Login.js            # Login page
│           ├── Dashboard.js        # Stats dashboard
│           ├── Roles.js            # Role management
│           ├── Users.js            # User management
│           ├── Templates.js        # Template management
│           └── ocr/
│               ├── Upload.js       # Document upload
│               ├── Process.js      # OCR processing + field editing
│               ├── History.js      # Scan job history
│               └── Reports.js      # Analytics and reports
│
├── .env.example                    # Environment variable template
├── package.json                    # Root scripts + server dependencies
└── README.md                       # This file
```

---

## Prerequisites

Make sure you have the following installed before running the project:

| Software | Version        | Download                |
| -------- | -------------- | ----------------------- |
| Node.js  | v16 or higher  | https://nodejs.org      |
| npm      | v8 or higher   | Comes with Node.js      |
| MongoDB  | Local or Atlas | https://www.mongodb.com |

To verify installations, run:

```bash
node --version
npm --version
```

---

## Installation

**Step 1 — Extract the project ZIP and open in VS Code:**

```bash
code ocr-admin
```

**Step 2 — Open the VS Code terminal with Ctrl + `**

**Step 3 — Make sure you are in the root folder:**

```bash
cd ocr-admin
```

**Step 4 — Install all dependencies:**

```bash
npm run install-all
```

This installs packages for both the server and the React client.

**Step 5 — Install OCR and PDF packages:**

```bash
npm install tesseract.js pdf-to-img axios
```

---

## Environment Variables

**Step 1 — Create your `.env` file:**

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

**Step 2 — Open `.env` and fill in your values:**

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB — paste your Compass connection database link here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ocr_admin?retryWrites=true&w=majority

# JWT — generate a secure random key (see below)
JWT_SECRET=your_generated_secret_key_here
JWT_EXPIRE=7d

# SAP Integration — leave blank to use simulation mode
SAP_ENDPOINT=
SAP_USERNAME=
SAP_PASSWORD=
SAP_API_KEY=
```

**Generating a JWT Secret:**

Run this in the VS Code terminal and copy the output:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Getting a MongoDB Atlas URI:**

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Go to Database Access → Add New User → set username and password
4. Go to Network Access → Add IP Address → Allow from Anywhere
5. Go to Database → Connect → Drivers → Node.js → copy the URI
6. Replace `<password>` with your actual password
7. Add `/ocr_admin` before the `?` in the URI

---

## Running the Project

Open two terminals in VS Code:

**Terminal 1 — Start the backend:**

```bash
npm run server
```

Expected output:

```
✅ MongoDB Connected
🚀 Server running on port 5000
```

**Terminal 2 — Start the frontend:**

```bash
cd client
npm start
```

Expected output:

```
Compiled successfully!
Local: http://localhost:3000
```

**Or run both together with one command:**

```bash
npm run dev
```

Open your browser and go to:

```
http://localhost:3000
```

---

## First Time Setup

### Step 1 — Register the Super Admin

The very first account registered becomes the Super Admin and cannot be demoted or deleted by anyone. Run this command in a third terminal:

**Mac / Linux:**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@company.com","password":"Admin@123"}'
```

**Windows CMD:**

```cmd
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Admin\",\"email\":\"admin@company.com\",\"password\":\"Admin@123\"}"
```

### Step 2 — Login

Go to `http://localhost:3000` and log in with:

```
Email    : admin@company.com
Password : Admin@123
```

### Step 3 — Create Roles

Go to **Roles** in the sidebar and create your base roles:

| Role    | Suggested Permissions                                   |
| ------- | ------------------------------------------------------- |
| MIM     | Can Scan, Can Upload, Can View Reports                  |
| SALES   | Can Scan, Can View Reports                              |
| FINANCE | Can Scan, Can Upload, Can View Reports, Can Push to SAP |

### Step 4 — Create Templates

Go to **Templates** and define your OCR templates. Example for an invoice:

```
Name          : Invoice Template
Document Type : Invoice
Output Format : JSON
Fields:
  - Invoice Number  (text,   required)
  - Vendor Name     (text,   required)
  - Invoice Date    (date,   required)
  - Amount          (amount, required)
  - GST Number      (text,   optional)
```

### Step 5 — Create Users

Go to  **Users** , create your team members and assign them a role and templates.

### Step 6 — Start Scanning

Go to  **New Scan** , upload a document, select a template, and click  **Start OCR Scan** .

---

## Features

### Phase 1 — Admin Panel

| Feature                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| Role Creation          | Create custom roles with granular permissions     |
| User Management        | Create, edit, activate, deactivate users          |
| Role Assignment        | Assign roles to users to control access           |
| Template Management    | Define OCR templates with typed field definitions |
| Template Assignment    | Map specific templates to users                   |
| Super Admin Protection | First registered user is permanently protected    |

### Phase 2 — OCR Scanning

| Feature           | Description                                         |
| ----------------- | --------------------------------------------------- |
| Document Upload   | Drag and drop or browse — PDF and image support    |
| OCR Processing    | Tesseract.js extracts text automatically            |
| Field Extraction  | Smart pattern matching maps text to template fields |
| Manual Correction | Users can edit and verify extracted field values    |
| Data Storage      | All scan jobs saved to MongoDB with full history    |
| SAP Push          | Processed data pushed to SAP or any ERP endpoint    |
| Scan History      | Filter and search all past scans with pagination    |
| Reports           | Stats, template breakdown, SAP push summary         |
| Export            | Download all scan data as JSON                      |

---

## API Reference

### Authentication

| Method | Endpoint               | Access    | Description             |
| ------ | ---------------------- | --------- | ----------------------- |
| POST   | `/api/auth/register` | Public    | Register first admin    |
| POST   | `/api/auth/login`    | Public    | Login and get JWT token |
| GET    | `/api/auth/me`       | Protected | Get current user        |

### Roles

| Method | Endpoint           | Access     | Description   |
| ------ | ------------------ | ---------- | ------------- |
| GET    | `/api/roles`     | Protected  | Get all roles |
| POST   | `/api/roles`     | Admin only | Create a role |
| PUT    | `/api/roles/:id` | Admin only | Update a role |
| DELETE | `/api/roles/:id` | Admin only | Delete a role |

### Users

| Method | Endpoint                            | Access     | Description              |
| ------ | ----------------------------------- | ---------- | ------------------------ |
| GET    | `/api/users`                      | Admin only | Get all users            |
| POST   | `/api/users`                      | Admin only | Create a user            |
| PUT    | `/api/users/:id`                  | Admin only | Update a user            |
| PUT    | `/api/users/:id/assign-role`      | Admin only | Assign role to user      |
| PUT    | `/api/users/:id/assign-templates` | Admin only | Assign templates to user |
| DELETE | `/api/users/:id`                  | Admin only | Delete a user            |

### Templates

| Method | Endpoint               | Access     | Description       |
| ------ | ---------------------- | ---------- | ----------------- |
| GET    | `/api/templates`     | Protected  | Get all templates |
| POST   | `/api/templates`     | Admin only | Create a template |
| PUT    | `/api/templates/:id` | Admin only | Update a template |
| DELETE | `/api/templates/:id` | Admin only | Delete a template |

### OCR Scanning

| Method | Endpoint                     | Access    | Description                  |
| ------ | ---------------------------- | --------- | ---------------------------- |
| POST   | `/api/scan/upload`         | Protected | Upload document              |
| POST   | `/api/scan/:id/process`    | Protected | Run OCR on uploaded file     |
| PUT    | `/api/scan/:id/fields`     | Protected | Save corrected field values  |
| GET    | `/api/scan`                | Protected | Get all scan jobs (filtered) |
| GET    | `/api/scan/:id`            | Protected | Get single scan job          |
| POST   | `/api/scan/:id/push`       | Protected | Push data to SAP             |
| DELETE | `/api/scan/:id`            | Protected | Delete a scan job            |
| GET    | `/api/scan/reports/stats`  | Protected | Get scan statistics          |
| GET    | `/api/scan/reports/export` | Protected | Export scan data as JSON     |

### Dashboard

| Method | Endpoint                 | Access     | Description              |
| ------ | ------------------------ | ---------- | ------------------------ |
| GET    | `/api/dashboard/stats` | Admin only | Get dashboard statistics |

---

## User Roles & Permissions

The system supports the following permission flags per role:

| Permission             | What It Allows                  |
| ---------------------- | ------------------------------- |
| `canScan`            | Upload and scan documents       |
| `canUpload`          | Upload master data              |
| `canViewReports`     | View scan reports and analytics |
| `canManageUsers`     | Create and manage users         |
| `canManageTemplates` | Create and manage OCR templates |
| `canPushToSAP`       | Push processed data to SAP      |
| `canViewAllData`     | View all users' scan data       |

---

## OCR Scanning Flow

```
1. User logs in
        ↓
2. User uploads document (PDF or image)
        ↓
3. System stores file in /server/uploads/
        ↓
4. User clicks "Start OCR Scan"
        ↓
5. Tesseract.js extracts raw text
   (PDFs are converted to images first via pdf-to-img)
        ↓
6. Field extraction engine matches text to template fields
   using three strategies:
   - Pattern: "FieldName: Value"
   - Type-based regex (dates, amounts, emails, phones)
   - Keyword proximity matching
        ↓
7. User reviews and corrects extracted fields
        ↓
8. User clicks "Save & Verify"
        ↓
9. User clicks "Push to SAP"
        ↓
10. Data sent to SAP endpoint or logged in simulation mode
```

---

## SAP Integration

The system supports pushing processed OCR data to any SAP or ERP endpoint via HTTP.

 **To connect a real SAP system** , add these to your `.env`:

```env
SAP_ENDPOINT=https://your-sap-server.com/api/documents
SAP_USERNAME=sap_user
SAP_PASSWORD=sap_password
SAP_API_KEY=your_api_key_if_needed
```

 **Without SAP credentials** , the system runs in **simulation mode** — the data payload is logged to the console and the scan is marked as pushed. This is useful for testing.

The data sent to SAP follows this structure:

```json
{
  "jobId": "JOB-1234567890-ABC123",
  "documentType": "invoice",
  "templateName": "Invoice Template",
  "scannedAt": "2026-06-10T10:00:00.000Z",
  "fields": {
    "Invoice Number": "INV-2024-001",
    "Vendor Name": "ABC Supplies Ltd",
    "Invoice Date": "10/06/2026",
    "Amount": "₹52,000"
  }
}
```

---

## Security

| Feature                          | Implementation                                        |
| -------------------------------- | ----------------------------------------------------- |
| Password hashing                 | bcrypt with salt rounds 10                            |
| Authentication                   | JWT tokens with configurable expiry                   |
| Route protection                 | Middleware on all private routes                      |
| Admin-only routes                | Secondary `adminOnly`middleware guard               |
| Super Admin protection           | `isSuperAdmin`flag — protected at API and UI level |
| File validation                  | Only PDF and images accepted, max 10MB                |
| Password excluded from responses | `select: false`on password field                    |
| Token expiry                     | Configurable via `JWT_EXPIRE`in `.env`            |

### Super Admin Protection Rules

The first registered user is marked as `isSuperAdmin: true` and the following rules apply permanently:

* Cannot be deleted by anyone including other admins
* Cannot have admin privileges removed
* Cannot be deactivated
* Can only be edited by themselves
* Shows a lock icon in the Users table for other admins
* All these rules are enforced at both backend API and frontend UI level

---

## Troubleshooting

### `Cannot find module 'axios'`

```bash
npm install axios
```

### `MongoDB connection failed`

* Check your `MONGO_URI` in `.env`
* Make sure your IP is whitelisted in MongoDB Atlas Network Access
* Verify your Atlas username and password are correct

### `Port 3000 already in use`

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac / Linux
kill -9 $(lsof -ti:3000)
```

### `Port 5000 already in use`

Change the port in `.env`:

```env
PORT=5001
```

### `ECONNREFUSED` proxy error in React

This means the backend server is not running. Make sure Terminal 1 shows `✅ MongoDB Connected` before using the frontend.

### `OCR returns empty text`

* Make sure the document image is clear and high resolution
* Try a JPG or PNG instead of PDF first
* For PDFs, make sure `pdf-to-img` is installed: `npm install pdf-to-img`
* Text must be machine-printed, not handwritten

### `Module not found` after downloading new files

```bash
npm install
cd client && npm install
```

---

## Project Roadmap

```
✅ Phase 1 — Admin Panel
   ✅ Role management with permissions
   ✅ User management with role and template assignment
   ✅ Template management with typed field definitions
   ✅ Super Admin protection

✅ Phase 2 — OCR Scanning
   ✅ Document upload (PDF + images)
   ✅ OCR text extraction (Tesseract.js)
   ✅ Intelligent field mapping
   ✅ Manual field correction and verification
   ✅ SAP/ERP push integration
   ✅ Scan history with filters and pagination
   ✅ Reports and analytics
   ✅ JSON export

🔜 Phase 3 — Testing
   ⬜ Functional testing of all features
   ⬜ OCR accuracy testing with real documents
   ⬜ Role-based access testing
   ⬜ Edge case and error handling testing

🔜 Phase 4 — Deployment
   ⬜ Production build
   ⬜ Deploy to Railway / Render / DigitalOcean
   ⬜ Configure domain and HTTPS
   ⬜ Set up PM2 for process management

🔜 Phase 5 — Training & Go Live
   ⬜ Create all staff accounts
   ⬜ Assign roles and templates
   ⬜ User training sessions
   ⬜ Document SOPs

🔜 Phase 6 — Maintenance
   ⬜ Monitor OCR accuracy
   ⬜ Add new templates as needed
   ⬜ MongoDB backups
   ⬜ Regular dependency updates
```

---

## Support

For any issues or questions, check the Troubleshooting section above or review the error message in the VS Code terminal — most errors include a clear description of what went wrong and how to fix it.
