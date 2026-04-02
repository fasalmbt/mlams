# MLAMS — Manpower Lead & Account Management System

A complete web-based ERP/CRM for managing the end-to-end lifecycle of candidates
in a manpower recruitment agency.

---

## 📁 Project Structure

```
mlams/
├── backend/
│   └── server.py          # Python backend — JWT auth, SQLite DB, all APIs
├── frontend/
│   ├── index.html         # Main single-page app
│   ├── css/style.css      # Full design system (dark industrial theme)
│   └── js/
│       ├── core.js        # API client, auth, routing, utilities
│       ├── pages.js       # Dashboard, Leads, Lead Detail
│       └── pages2.js      # Counseling, Accounts, Cheques, Users, Reports
├── start.sh               # Start the backend server
├── stop.sh                # Stop the backend server
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ (with `jwt` and `flask` available — uses stdlib only otherwise)
- A modern web browser

### Step 1 — Start the Backend
```bash
chmod +x start.sh stop.sh
bash start.sh
```

### Step 2 — Open the Frontend
Open `frontend/index.html` directly in your browser:
```
file:///path/to/mlams/frontend/index.html
```
Or if on macOS:
```bash
open frontend/index.html
```

### Step 3 — Log In
On first run, an initial Admin account is created from your `.env` file (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). 
If you did not provide a `.env` file, the default login is:
- **Email:** `admin@localhost.com`
- **Password:** `admin123`

*(Note: Other roles like Tele-Caller, Counselor, and Accountant can be created by the Admin from the UI)*

---

## 🔄 Core Workflow

### Stage 1 — Lead Generation (Admin → Tele-Caller)
1. **Admin** logs in and creates a new lead (`+ New Lead`)
2. Admin assigns lead to a Tele-Caller
3. **Tele-Caller** sees only their assigned leads
4. Caller updates status: `Busy`, `Call Back`, `Interested`, `Not Interested`
5. When marked **Interested** → lead automatically moves to Counseling queue

### Stage 2 — Counseling (Counselor)
1. **Counselor** sees all leads in the Counseling Queue
2. Logs sitting sessions: `Sitting 1 Completed`, `Documents Pending`, etc.
3. When satisfied → clicks **Complete Counseling**
4. Lead automatically moves to **Accounts** stage

### Stage 3 — Finance (Accountant)
1. **Accountant** sees the Accounts queue
2. Records payment: amount, mode (Cash/Cheque/UPI etc.), date
3. On payment → candidate marked **Completed**

### Stage 4 — Cheque Management
1. Accountant records cheque details (number, bank, amount)
2. Updates cheque status: `Pending → Issued → Cleared` or `Bounced`
3. Full cheque register available in **Cheque Management** page

---

## 👥 Role Permissions

| Feature                    | Admin | Tele-Caller | Counselor | Accountant |
|----------------------------|-------|-------------|-----------|------------|
| Create Leads               | ✓     |             |           |            |
| View All Leads             | ✓     |             |           |            |
| View Assigned Leads        | ✓     | ✓           |           |            |
| Update Call Status         | ✓     | ✓           |           |            |
| View Counseling Queue      | ✓     |             | ✓         |            |
| Log Counseling Sessions    | ✓     |             | ✓         |            |
| Complete Counseling        | ✓     |             | ✓         |            |
| View Accounts Queue        | ✓     |             |           | ✓          |
| Record Payments            | ✓     |             |           | ✓          |
| Manage Cheques             | ✓     |             |           | ✓          |
| User Management            | ✓     |             |           |            |
| Reports & Analytics        | ✓     |             |           |            |

---

## 🗄️ Database Schema

The SQLite database (`backend/mlams.db`) contains:
- **users** — System users with role-based access
- **leads** — Candidate leads with stage/status tracking
- **status_logs** — Full audit trail of every status change (who, when, what)
- **counseling_sessions** — Session-by-session counseling records
- **payments** — Payment transactions linked to candidates
- **cheques** — Cheque records with lifecycle status

---

## 🔌 API Reference

| Method | Endpoint                           | Description                    |
|--------|------------------------------------|--------------------------------|
| POST   | /api/auth/login                    | Login, returns JWT token       |
| GET    | /api/auth/me                       | Get current user               |
| GET    | /api/leads                         | List leads (role-filtered)     |
| POST   | /api/leads                         | Create lead (Admin only)       |
| GET    | /api/leads/:id                     | Get lead details               |
| PUT    | /api/leads/:id/status              | Update lead status             |
| PUT    | /api/leads/:id/assign              | Reassign lead (Admin)          |
| GET    | /api/leads/:id/sessions            | Get counseling sessions        |
| POST   | /api/leads/:id/sessions            | Add counseling session         |
| PUT    | /api/leads/:id/complete-counseling | Move to accounts               |
| GET    | /api/leads/:id/payments            | Get payments                   |
| POST   | /api/leads/:id/payments            | Record payment                 |
| GET    | /api/leads/:id/cheques             | Get cheques                    |
| POST   | /api/leads/:id/cheques             | Add cheque                     |
| PUT    | /api/cheques/:id                   | Update cheque status           |
| GET    | /api/leads/:id/logs                | Get audit log                  |
| GET    | /api/dashboard                     | Role-specific dashboard stats  |
| GET    | /api/users                         | List users (Admin/Counselor)   |
| POST   | /api/users                         | Create user (Admin only)       |

---

## ⚙️ Configuration

Copy `.env.example` to `.env` before running the system to configure:
- `PORT` (default: 5050)
- `HOST` (default: 0.0.0.0)
- `JWT_SECRET` (auto-generated if not set)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

---

## 🔒 Security Notes

- JWT tokens expire after **24 hours**
- Passwords are securely hashed with a random salt using Python's built-in `pbkdf2_hmac`
- Every API endpoint enforces role-based access
- All status transitions are logged with user ID + timestamp

---

## 📈 Future Enhancements

- [ ] Email/SMS notifications on stage transitions
- [ ] Document upload (passport, visa docs) per candidate
- [ ] Multi-branch support
- [ ] Export to PDF/Excel
- [ ] Mobile responsive improvements
- [ ] Real-time updates via WebSocket
