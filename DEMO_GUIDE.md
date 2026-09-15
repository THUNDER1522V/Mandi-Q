# MANDIQ FairProcure Platform — Hackathon Judge Demo Guide
### ⏱ 5-Minute High-Impact Evaluation Script

This guide provides an end-to-end presentation flow designed to showcase the full technical depth, real-world utility, and cryptographic fairness governance of the **MANDIQ APMC FairProcure Platform**.

---

## 🎯 The Pitch (30 Seconds)

> *"In Indian agricultural mandis today, smallholder farmers often wait 12 to 18 hours in queues, only to watch politically connected traders or large landholders skip ahead. Manual gate passes and paper slips are forged daily.*
>
> *MANDIQ is the first platform to introduce **cryptographic HMAC-SHA256 QR identity**, an **automated FIFO Rule Enforcement Engine**, and a **dual-authorized supervisor exception protocol**. Every intake decision is governed by code, recorded in an immutable ledger, and broadcast in real time across the yard."*

---

## 🛠 Instant Demo Preparation

1. Open your browser to the MANDIQ Operations Console:
   - **Docker / Production**: [http://localhost](http://localhost)
   - **Local Dev**: [http://localhost:5173](http://localhost:5173)
2. Ensure audio is turned on (MANDIQ features live Hindi/English PA announcements).
3. If running without a live PostgreSQL backend, click the **"Switch to Demo Mode"** button in the top banner. When connected to FastAPI, click **"Live Backend"** for real-time PostgreSQL synchronization.

---

## 🎬 5-Minute Step-by-Step Presentation Script

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DEMO TIMELINE (5 MIN)                         │
├───────────────┬────────────────────────────────────────────────────────┤
│ 00:00 - 01:00 │ Act 1: Live Yard Operations & Telemetry               │
│ 01:00 - 02:00 │ Act 2: Cryptographic QR Identity & Mobile Scanner     │
│ 02:00 - 03:15 │ Act 3: FairProcure Rule Engine Gatekeeper in Action    │
│ 03:15 - 04:15 │ Act 4: Supervisor Dual-Authorization Override Workflow │
│ 04:15 - 05:00 │ Act 5: Yard Emergency Halt & PA Broadcast             │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

### Act 1: Live Yard Operations & Real-Time Telemetry (1 min)

1. **Point to the Header & Ashoka Chakra Watermark**:
   - Highlight the official e-NAM APMC government design aesthetic.
   - Show the **Day / Night mode toggle** designed for 24/7 round-the-clock harvest season operations.
2. **Observe the Live Telemetry Cards**:
   - Show **Farmers Waiting in Yard**, **Currently Serving in Weighbridge Bays**, and **Total Quintals Procured**.
   - Point out the **Live Fairness Index** (e.g. `98.4% FIFO Compliance`).
3. **Trigger Weighbridge Intake**:
   - In the **Now Serving / Bay Assignment** section, click **"Call Next to Bay 01"**.
   - **Listen to the PA Announcement**: Notice the synthetic voice broadcast calling the token number and farmer name in Hindi and English.
   - Watch the live activity ticker update in real time at the bottom of the screen.

---

### Act 2: Cryptographic QR Identity & Anti-Tamper Verification (1 min)

1. **Click the "QR Scanner" button** in the top navigation bar.
2. **Explain the Cryptographic Structure**:
   - Every token is not just a plain number; it contains a digital signature computed via `HMAC-SHA256(farmer_id + booking_id + token + slot_time, SECRET_KEY)`.
   - If an agent or broker creates a fake QR code with Photoshop, the verification engine checks the hash and rejects the scan instantly.
3. **Perform a Verification**:
   - Use the sample tokens or camera scanner to verify Token `TK-001`.
   - Notice the status updates to `ACTIVE` and displays the assigned arrival slot.

---

### Act 3: FairProcure Rule Engine — Queue Jumping Blocked (1 min 15 sec)

1. **Navigate to the "Yard Queue" tab**.
2. **Attempt an Out-of-Turn Intake**:
   - Find a farmer deep in the queue (e.g., Token `TK-014` whose scheduled slot is later in the day).
   - Click the action button **"Intake to Bay 02"**.
3. **Observe the Rule Engine Interception**:
   - The platform **blocks the action instantly**.
   - An alert appears:
     > `⚠ Queue Jump Detected: Token 14 attempted early intake ahead of earlier waiting tokens.`
   - The system transitions to an **"OVERRIDE_REQUIRED"** state.
   - Highlight: *The platform prevents human gate operators from taking bribes to push trucks ahead of others.*

---

### Act 4: Supervisor Dual-Authorization Workflow (1 min)

1. **Demonstrate Legitimate Exceptions**:
   - Explain that real agriculture has genuine emergencies (e.g., unseasonal hail or perishable tomatoes about to spoil).
   - In the Override Dialog, select Reason: **"Perishable produce damage risk"**.
   - Click **"Request Supervisor Approval"**.
2. **Supervisor Authorization**:
   - The Mandi Secretary arrives with their master PIN.
   - Enter Supervisor PIN: `1234`.
   - Click **"Authorize Override"**.
3. **Show the Audit Trail**:
   - Switch to the **"Activity Logs & Audit"** tab.
   - Show the permanent entry:
     > `OVERRIDE_APPROVED · Token 14 authorized by Mandi Secretary Pushkar (PIN Dual-Auth). Cryptographic Proof Hash: 7f8a9...`

---

### Act 5: Emergency Halt Protocol & Auto-Reschedule (45 sec)

1. **Click the red "Halt Procurement" button** on the header.
2. **Enter Reason**: `"Sudden heavy rainfall over unshaded unloading bays"`.
3. **Execute Halt**:
   - The entire console transitions to a prominent amber **EMERGENCY HALT** banner.
   - **PA System Broadcasts Alert**: *"Dhyan dein: Mandi mein toli roki gayi hai..."*
   - All currently waiting farmers are automatically protected and rescheduled to the next available dry shift without losing their seniority.
4. **Click "Resume Operations"** to demonstrate immediate recovery.

---

## 🏆 Key Technical Achievements for Evaluation

| Criteria | How MANDIQ Fulfills It |
|---|---|
| **Architecture** | Clean 3-tier decoupled architecture (FastAPI + React 19 + PostgreSQL 16 + Nginx Ingress). |
| **Cryptography** | HMAC-SHA256 tamper-proof QR identity tokens. |
| **Integrity** | ACID-compliant relational schema with zero N+1 queries and eager-loaded joins. |
| **Production Readiness** | Multi-stage Dockerfiles, OWASP security headers, in-memory rate limiting, and centralized exception handling. |
| **Judge Experience** | Flawless dual-mode operation (seamless live PostgreSQL synchronization with automatic offline demo fallback). |

---

## 📞 Support & Contacts

- **Lead Developer**: MANDIQ APMC Core Engineering Team
- **Swagger Documentation**: [http://localhost/docs](http://localhost/docs)
- **Deployment Runbook**: [DEPLOYMENT.md](DEPLOYMENT.md)
