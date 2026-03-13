# CECB Environmental Clearance System
### PARIVESH 3.0 — PS-02 | Web2 Hackathon

> **Full-stack digital platform for Chhattisgarh Environment Conservation Board environmental clearance lifecycle — from filing to Minutes of Meeting publication.**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20 LTS
- PostgreSQL 16 (with PostGIS) OR Docker Desktop
- npm 10+

### Option A — With Docker (Recommended)

```bash
# 1. Copy and fill env variables
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Run migrations and seed demo data
cd backend
npm run db:migrate
npm run db:seed
```

### Option B — Manual Setup

```bash
# Install all dependencies
cd backend  && npm install
cd ../frontend && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, GROQ_API_KEY etc.

# Run Prisma migrations
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed   # Creates demo user accounts

# Start dev servers (two terminals)
# Terminal 1 — Backend:
cd backend && npm run dev   # → http://localhost:3000
# Terminal 2 — Frontend:
cd frontend && npm run dev  # → http://localhost:5173
```

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@cecb.cg.gov.in` | `Admin@1234` |
| **Scrutiny** | `scrutiny@cecb.cg.gov.in` | `Scrutiny@1234` |
| **MoM Team** | `mom@cecb.cg.gov.in` | `MomTeam@1234` |
| **Proponent** | `proponent@example.com` | `Proponent@1234` |

---

## 🏗️ Architecture

```
Parivesh 3.O/
├── backend/                    # Express + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma       # 8 tables, 3 ENUMs
│   │   └── seed.ts             # Demo data
│   └── src/
│       ├── server.ts           # Express + Socket.io bootstrap
│       ├── middleware/
│       │   ├── auth.ts         # JWT + requireRole() RBAC
│       │   └── errorHandler.ts # AppError + asyncHandler
│       ├── routes/
│       │   ├── auth.ts         # Register / Login / Refresh
│       │   ├── applications.ts # 7-stage state machine
│       │   ├── documents.ts    # Multer upload + ClamAV stub
│       │   ├── payments.ts     # UPI QR + UTR verification
│       │   ├── gist.ts         # MoM editor + PDF/DOCX export
│       │   ├── audit.ts        # Blockchain audit trail
│       │   ├── admin.ts        # User mgmt + stats
│       │   ├── gis.ts          # Haversine proximity analysis
│       │   └── notifications.ts
│       ├── services/
│       │   ├── auditChain.ts   # SHA3-256 Merkle chain
│       │   └── gistQueue.ts    # Bull + Groq AI gist generation
│       └── utils/
│           ├── prisma.ts
│           ├── redis.ts
│           └── logger.ts
│
├── frontend/                   # React 18 + Vite + TypeScript
│   └── src/
│       ├── App.tsx             # React Router v6 + role guards
│       ├── store/authStore.ts  # Zustand persistent auth
│       ├── lib/
│       │   ├── api.ts          # Axios + token refresh interceptor
│       │   └── i18n.ts         # EN + Hindi translations
│       ├── hooks/useSocket.ts  # Socket.io real-time events
│       ├── components/
│       │   ├── layout/         # Sidebar + TopBar + AppLayout
│       │   └── StatusBadge.tsx # 7-stage color badges
│       └── pages/
│           ├── auth/           # Login + Register
│           ├── proponent/      # Dashboard, NewApplication, Detail, Payment
│           ├── scrutiny/       # Dashboard, ApplicationReview
│           ├── mom/            # Dashboard, MomEditor (TipTap)
│           └── admin/          # Dashboard, AuditLog, UserManagement
│
├── docker-compose.yml          # PostgreSQL + Redis + App
└── .env.example
```

---

## 📋 7-Stage Workflow

```
DRAFT → SUBMITTED → UNDER_SCRUTINY ⇄ EDS → REFERRED → MOM_GENERATED → FINALIZED
```

| Stage | Actor | Key Action |
|-------|-------|-----------|
| DRAFT | Proponent | Fill form, upload docs |
| SUBMITTED | Proponent | Lock + pay fee via UPI |
| UNDER_SCRUTINY | Scrutiny | Verify docs, validate payment |
| EDS | Scrutiny → Proponent | Flag deficiencies; proponent re-uploads |
| REFERRED | Scrutiny | Refer to committee → AI gist triggered |
| MOM_GENERATED | MoM Team | Edit AI gist in TipTap editor |
| FINALIZED | MoM Team | Lock MoM, export PDF/Word |

> ⚠️ **No stage can be skipped.** All transitions enforced via PostgreSQL ENUM + backend guards. Every transition writes to the SHA3-256 blockchain audit chain.

---

## 🤖 AI Gist Generation

When scrutiny clicks **"Refer to Meeting"**:
1. Bull queue job is dispatched
2. Application data fetched from PostgreSQL
3. Structured prompt built using GIST PROMPT TEMPLATE
4. **Groq API** (llama-3.3-70b) called — falls back to static template if unavailable
5. Gist saved, status → `MOM_GENERATED`
6. MoM Team notified via Socket.io

> **Requires**: `GROQ_API_KEY` in `.env` (get free at [console.groq.com](https://console.groq.com))

---

## 🗺️ GIS Proximity Analysis

`GET /api/gis/check?lat=21.25&lng=81.63` returns environmental risk flags:
- 🌲 Forest boundaries (1km threshold)
- 🌊 Rivers / streams (500m)
- 🦁 Wildlife sanctuaries (10km)
- 💧 Wetlands (2km)

Based on real Chhattisgarh layer data: Barnawapara, Kanger Valley, Udanti-Sitanadi, Achanakmar, Mahanadi, Hasdeo, Gangrel Reservoir etc.

---

## 🔗 Blockchain Audit Trail

Every status transition, document upload, login, and admin action writes an immutable SHA3-256 Merkle chain entry:

```
chain_hash = SHA3-256(prev_hash + SHA3-256(payload))
```

Verify full chain integrity: `GET /api/audit/chain/verify` (Admin only)

---

## 📡 API Documentation

Swagger UI available at: **`http://localhost:3000/api/docs`**

---

## 🔐 Security

| Layer | Implementation |
|-------|---------------|
| Auth | JWT (15min) + refresh token (httpOnly cookie, 7d) |
| Passwords | Argon2id (64MB, 3 iterations) |
| File uploads | ClamAV scan stub (replace with real daemon) |
| RBAC | `requireRole()` middleware on every protected route |
| Rate limiting | 200 req/15min API, 20 req/15min auth |
| PQC | liboqs / node-oqs stub (FIPS 203/204/205) |

---

## 🛠️ Key Environment Variables

```bash
DATABASE_URL=postgresql://cecb_user:cecb_pass@localhost:5432/cecb_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=<32-char random string>
JWT_REFRESH_SECRET=<32-char random string>
GROQ_API_KEY=gsk_...          # Required for AI gist generation
VITE_API_URL=http://localhost:3000
USE_LOCAL_STORAGE=true        # Set false to use S3
```

---

## 📦 Tech Stack Summary

**Backend**: Express 4 · TypeScript · Prisma · PostgreSQL 16 · Redis · Bull · Socket.io · Argon2id · Groq SDK · qrcode · pdfmake · docxtemplater · Winston · Swagger

**Frontend**: React 18 · Vite · Tailwind CSS · Zustand · TanStack Query · React Router v6 · TipTap · Leaflet · Framer Motion · Recharts · i18next · qrcode.react · Lucide

**DevOps**: Docker Compose · PostgreSQL (PostGIS) · Redis

---

*Built for PARIVESH 3.0 PS-02 Web2 Hackathon | Chhattisgarh Environment Conservation Board*
