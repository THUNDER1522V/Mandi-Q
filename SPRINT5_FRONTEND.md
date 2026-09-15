# SPRINT 5 — FAIRPROCURE OPERATIONS DASHBOARD & LIVE FRONTEND INTEGRATION

## Executive Overview
Sprint 5 transforms the MANDIQ frontend into a live, production-grade APMC mandi operations dashboard connected directly to the FastAPI backend. Every metric, queue status, security alert, gate clearance pass, and supervisor override consumes real backend endpoints with **zero mock data, zero fake APIs, and zero placeholder services**.

All 33 backend tests (`pytest tests/`) continue to pass without modification, locking Sprint 4 governance logic while enabling seamless frontend reactivity.

---

## 1. System Architecture

```
                                  +-------------------------------------------------------------+
                                  |                 MANDIQ Staff Console (React 19)              |
                                  +-------------------------------------------------------------+
                                      |                     |                      |
                                      v                     v                      v
                             [useLivePolling]      [html5-qrcode Scanner]   [Supervisor Actions]
                               (5s interval)          (Camera / Pass)        (PIN Authorization)
                                      |                     |                      |
            +-------------------------+                     |                      |
            |                         |                     |                      |
            v                         v                     v                      v
     GET /dashboard/summary   GET /dashboard/fairness  POST /qr/verify     POST /fairprocure/override/approve
     GET /queue/live          GET /dashboard/alerts                        POST /procurement/start
     GET /dashboard/qr-metrics
                                      |
                                      v
                             +-------------------------------------------------------------+
                             |           FastAPI Core & FairProcure Governance Engine       |
                             |         (FIFO Enforcement, Slot Validation, Audit Trail)     |
                             +-------------------------------------------------------------+
                                      |                     |                      |
                                      v                     v                      v
                                [PostgreSQL 16]      [Audit Events]        [HMAC-SHA256 Signatures]
```

### Centralized Polling Engine (`useLivePolling`)
- **Cadence**: Synchronizes state every 5 seconds (5,000ms).
- **Tab Inactivity Detection**: Listens to `document.visibilitychange`. When the browser tab is hidden (`document.hidden = true`), polling halts immediately to eliminate wasteful network traffic and server load.
- **Instant Wakeup**: Upon returning to the tab, an immediate background fetch triggers to refresh live operations telemetry.

---

## 2. Component Tree

```
App.tsx
├── AshokaChakraWatermark
├── Header
│   ├── MandiQLogo
│   ├── SystemStatusBadge (Operational / Halted)
│   ├── NotificationsButton (Unread live alert badge)
│   ├── ThemeToggle (Day / Night mode)
│   └── Clock (IST live seconds)
├── PageBody
│   ├── HaltBanner (Active when mandi procurement is halted)
│   ├── HeroNowServing (Active weighbridge bay assignments & call controls)
│   ├── StatCards (11 Core Operations & Governance KPIs)
│   │   ├── Primary Tier (Farmers, Procurement, Queue, Completed)
│   │   └── FairProcure Telemetry Strip (Score, Compliance, Turnaround, Overrides, QR Stats)
│   ├── NowServingCard (Dual-bay physical weighment monitors)
│   ├── QueuePipeline (Animated token flow & bay assignment triggers)
│   ├── WorkspaceToolbar (Elevated capsule tabs: Queue, Fairness, QR, Farmers, Reschedule, Audit)
│   └── Tab Content
│       ├── [queue]: QueueTable (9 columns, Search, Sort, Filter, Pagination, Modal triggers)
│       ├── [fairness]: FairnessView (0-100 Circular Gauge, Trend Cards, Overrides Ledger)
│       ├── [qr-scanner]: Gate Scanner Surface (Camera scan launch trigger)
│       ├── [farmers]: FarmersView (Full CRUD directory)
│       ├── [reschedule]: AlertsPanel (Auto-rescheduled SMS logs)
│       └── [audit]: LiveActivityFeed & PA Announcement Ledger
├── AlertsDrawer (Slide-out panel: Critical, High, Medium, Low severity alerts)
├── ProcurementTimeline (11 sequential lifecycle milestones modal)
├── OverrideModal (Dual-key supervisor PIN authorization modal)
├── QRScannerModal (Live html5-qrcode camera viewfinder with green/red feedback)
├── FarmerDetailModal (Farmer profile, gate pass, vehicle specs)
├── HaltModal & RaceTestModal
├── LiveOperationalTicker
└── Footer
```

---

## 3. API Integration Map

| UI Component | HTTP Method | Backend Route | Purpose |
| :--- | :--- | :--- | :--- |
| **StatCards & Header** | `GET` | `/api/v1/dashboard/summary` | Mandi operational metrics (Total farmers, waiting, served, slots) |
| **StatCards & FairnessView** | `GET` | `/api/v1/dashboard/fairness` | Composite fairness score (0-100), queue compliance, turnaround |
| **StatCards & WorkspaceToolbar** | `GET` | `/api/v1/dashboard/qr-metrics` | Active QR tokens, verification counts, gate success rate |
| **AlertsDrawer & Header** | `GET` | `/api/v1/dashboard/alerts` | Security alert stream (queue jumps, expired QR, slot breaches) |
| **QueueTable & Pipeline** | `GET` | `/api/v1/queue/live` | Real-time intake queue with farmer, crop, vehicle, and slot details |
| **QueueTable (Call to Bay)** | `POST` | `/api/v1/procurement/start` | FairProcure Rule Engine check (returns `ALLOW` or `OVERRIDE_REQUIRED`) |
| **HeroNowServing** | `POST` | `/api/v1/queue/call-next` | Advance next FIFO vehicle to available weighbridge bay |
| **QueueTable** | `POST` | `/api/v1/queue/assign-bay` | Assign specific farmer token to weighbridge bay |
| **QueueTable & Detail** | `POST` | `/api/v1/queue/update` | Update intake status (`SERVED`, `NO_SHOW`, `WAITING`) |
| **ProcurementTimeline** | `GET` | `/api/v1/procurement/timeline/{booking_id}` | Chronological milestone log with timestamps & remarks |
| **QRScannerModal** | `POST` | `/api/v1/qr/verify` | Validate cryptographic HMAC-SHA256 signature and slot validity |
| **OverrideModal** | `POST` | `/api/v1/fairprocure/override/request` | Submit out-of-turn or early slot intake override request |
| **OverrideModal** | `POST` | `/api/v1/fairprocure/override/approve` | Authorize override with 4-digit Supervisor PIN (`1234`) |
| **OverrideModal** | `POST` | `/api/v1/fairprocure/override/reject` | Deny out-of-turn intake with official justification |
| **FairnessView** | `GET` | `/api/v1/fairprocure/override/pending` | Fetch pending overrides awaiting dual-key supervisor review |
| **FairnessView** | `GET` | `/api/v1/fairprocure/override/history` | Fetch historical override records for compliance auditing |

---

## 4. Polling & Real-Time Synchronization Flow

```
[Page Load / Tab Focus]
          │
          ▼
┌──────────────────┐
│  useLivePolling  │ ──► Triggers refreshAll() immediately
└──────────────────┘
          │
          ├─────────────────────────────────────────┐
          │ (Every 5,000ms via interval)            │
          ▼                                         ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│    Core Telemetry (Concurrent)      │   │    Governance Telemetry (Concurrent)│
│  - GET /api/v1/dashboard/summary    │   │  - GET /api/v1/dashboard/fairness   │
│  - GET /api/v1/queue/live           │   │  - GET /api/v1/dashboard/qr-metrics │
│  - GET /api/v1/alerts               │   │  - GET /api/v1/dashboard/alerts     │
│  - GET /api/v1/activity-logs        │   │                                     │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
          │                                         │
          └───────────────────┬─────────────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │ Abort in-flight superseded?  │
               └──────────────────────────────┘
                              │ No
                              ▼
               ┌──────────────────────────────┐
               │    Atomic React State Update │
               │   (Metrics, Queue, Alerts)   │
               └──────────────────────────────┘
                              │
               [User minimizes / changes tab]
                              │
                              ▼
               ┌──────────────────────────────┐
               │ document.hidden === true     │
               │ POLLING PAUSED               │
               └──────────────────────────────┘
```

---

## 5. UI Views & Visual Language

### 11 Operations KPIs (Part 1)
1. **Total Farmers**: Enrolled APMC agriculturists.
2. **Today's Procurement**: Net physical quintals weighed and cleared.
3. **Active Queue**: Live vehicles staged in yard lanes.
4. **Completed Procurement**: Lots fully processed through weighbridge scales.
5. **Pending Overrides**: Exceptional lots awaiting dual-key supervisor PIN.
6. **Active QR Tokens**: Cryptographic passes generated for today's intake.
7. **Fairness Score**: Real-time composite compliance index ($0-100$).
8. **Queue Compliance**: Percentage of intake obeying strict FIFO order.
9. **Average Waiting Time**: Minutes from gate entry to scale weighment.
10. **Today's QR Verifications**: Successfully authenticated digital tokens.
11. **Today's Failed Verifications**: Expired, revoked, or signature-mismatched tokens blocked.

### 11-Milestone Procurement Lifecycle (Part 3)
Visual color codes:
- **Completed**: `#16a34a` (Emerald green checkmark with timestamp)
- **Current Step**: `#2563eb` (Royal blue pulsating radio beacon)
- **Future Step**: `#94a3b8` (Muted slate circle)

Milestones:
1. `ARRIVED`
2. `QR_VERIFIED`
3. `QUEUE_ENTERED`
4. `WAITING`
5. `WEIGHMENT_STARTED`
6. `WEIGHMENT_COMPLETED`
7. `PROCUREMENT_STARTED`
8. `PROCUREMENT_COMPLETED`
9. `PAYMENT_INITIATED`
10. `PAYMENT_COMPLETED`
11. `EXITED`

### Live Queue Table (Part 4)
- **9 Columns**: Token, Farmer & Village, Commodity, Arrival Slot, Current Status, Wait Time, Priority, Override Status, Actions.
- **Controls**: Full-text searching, commodity filtering, multi-column sorting (Token, Farmer, Slot, Wait, Status), and 10-row pagination.

### QR Gate Scanner (Part 5)
- **Hardware Integration**: Embedded camera scanner powered by `html5-qrcode`.
- **Barrier Feedback**:
  - **Valid Token**: Green expanding clearance animation with verified farmer name and bay allocation.
  - **Rejection**: Vibrant red badge with backend error code (`EXPIRED_TOKEN`, `INVALID_SIGNATURE`, `QUEUE_JUMP_ATTEMPT`).
  - **Override Shortcut**: Direct button to open Supervisor Override Modal if `OVERRIDE_REQUIRED`.

### Supervisor Override Modal (Part 6)
- **Fields**: Justification reason textarea, 4-digit supervisor PIN input (`1234`), authorizing officer designation.
- **Actions**: "Approve Override" (POST to `/api/v1/fairprocure/override/approve`) and "Reject Intake" (POST to `/api/v1/fairprocure/override/reject`).

### Fairness Dashboard (Part 7)
- **Gauge**: 170px SVG circular progress ring rendering the 0-100 score with color transition.
- **Trend Cards**: Queue Jump Interceptions, Early Arrival Gate Diverts, Pending Overrides, Audited Events.
- **Ledger**: Historical and pending dual-key overrides table with one-click review.

---

## 6. Frontend Folder Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts              # Axios singleton with baseUrl and health check
│   │   ├── dashboard.ts           # Summary, fairness metrics, live alerts
│   │   ├── queue.ts               # Live queue, call next, assign bay, update
│   │   ├── qr.ts                  # verifyQR, getQRDashboardMetrics
│   │   ├── fairprocure.ts         # Override request/approve/reject, timeline, startProcurement
│   │   └── farmer.ts              # Farmer CRUD endpoints
│   ├── components/
│   │   ├── AlertsDrawer.tsx       # Slide-out real-time alerts drawer
│   │   ├── AnimatedCounter.tsx    # Smooth numeric transitions
│   │   ├── AshokaChakraWatermark.tsx # Authentic APMC watermark
│   │   ├── FairnessView.tsx       # 0-100 score gauge, trend cards, override ledger
│   │   ├── Header.tsx             # System status, live IST time, alert bell
│   │   ├── HeroNowServing.tsx     # Primary weighbridge hero
│   │   ├── NowServingCard.tsx     # Dual weighbridge bay monitor cards
│   │   ├── OverrideModal.tsx      # Dual-PIN supervisor authorization modal
│   │   ├── ProcurementTimeline.tsx # 11 milestone visual stepper modal
│   │   ├── QRScannerModal.tsx     # html5-qrcode camera gate scanner
│   │   ├── QueuePipeline.tsx      # Visual queue movement pipeline
│   │   ├── QueueTable.tsx         # 9-column production ledger with search/sort/page
│   │   ├── StatCards.tsx          # 11 operations and governance KPIs
│   │   └── WorkspaceToolbar.tsx   # Floating navigation control surface
│   ├── hooks/
│   │   └── useLivePolling.ts      # Tab-aware 5-second polling engine
│   ├── types/
│   │   ├── dashboard.ts           # MandiMetrics, FarmerBooking, QueueStatus
│   │   └── fairprocure.ts         # RuleDecision, ProcurementStatus, OverrideItem, Metrics
│   └── __tests__/
│       ├── alertDrawer.test.tsx   # Severity classification and newest-first tests
│       ├── dashboard.test.tsx     # 11 KPI calculations and telemetry tests
│       ├── overrideModal.test.tsx # Supervisor PIN and approval contract tests
│       ├── polling.test.tsx       # 5s interval and document.hidden tests
│       ├── qrScanner.test.tsx     # Cryptographic verification response tests
│       ├── queue.test.tsx         # Search, sort, filter, pagination tests
│       └── timeline.test.tsx      # 11 milestone sequence tests
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 7. Deployment & Verification Notes

### Commands
- **Run Dev Server**: `npm run dev` (Runs on `http://localhost:5173`)
- **Run Unit Tests**: `npm test` (Executes Vitest suite across all 7 test files)
- **Lint Check**: `npm run lint` (OxLint zero warnings, zero errors)
- **Production Bundle**: `npm run build` (Compiles TypeScript and bundles with Vite)

### Supervisor PIN
- The system supervisor master PIN for overriding out-of-turn or early slot insertions is configured as: **`1234`**.
