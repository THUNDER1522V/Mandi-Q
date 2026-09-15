# MANDIQ – Project Roadmap

## Project Vision

Build a transparent, scalable and accountable digital procurement platform for agricultural mandis.

MandiQ is no longer just a queue management application.

With the FairProcure Layer it becomes a complete Procurement Governance Platform that ensures:

- Fair slot enforcement
- Digital identity verification
- Transparent procurement
- Accountable staff actions
- Complete auditability
- Real-time monitoring

---

# Current Status

✅ Phase 1 – UI/UX Prototype

Completed

- React Dashboard
- Queue UI
- Admin Screens
- Analytics UI
- Voice Screens

---

✅ Phase 2 – Backend Foundation

Completed

- FastAPI
- PostgreSQL
- SQLAlchemy
- CRUD
- Farmer APIs
- Queue APIs
- Dashboard APIs
- Booking APIs

---

✅ Phase 3 – Integration

Completed

- Frontend connected
- Backend connected
- Live APIs
- CRUD verification
- PostgreSQL integration

---

# Phase 4

## FAIRPROCURE CORE

Mission

Prevent invisible queue manipulation while maintaining operational flexibility through transparent and auditable workflows.

---

Module 1

Digital Identity

Features

• Permanent Farmer ID
• QR Identity
• QR Verification
• Smart Token

Status

Pending

---

Module 2

Fair Queue Engine

Features

• Slot Validation
• Queue Rule Engine
• Anti Queue Jumping
• Token Validation

Status

Pending

---

Module 3

Procurement Engine

Features

• Arrival Verification
• Procurement Start
• Procurement Completion
• Procurement Timeline

Status

Pending

---

Module 4

Accountability Engine

Features

• Override Requests
• Supervisor Approval
• Audit Logs
• Timeline Tracking

Status

Pending

---

Module 5

Dashboard Intelligence

Features

• Live Audit Feed
• QR Verification Status
• Pending Overrides
• Today's Violations
• Fairness Score
• Procurement Analytics

Status

Pending

---

# Architecture

Farmer

↓

Registration

↓

QR Identity

↓

Booking

↓

Slot Allocation

↓

Smart Token

↓

SMS

↓

Arrival

↓

QR Verification

↓

FairProcure Rule Engine

↓

Queue

↓

Procurement

↓

Audit

↓

Dashboard

↓

Analytics

---

# Backend Evolution

Current

Frontend

↓

API

↓

Database

Future

Frontend

↓

API

↓

Rule Engine

↓

Services

↓

Database

---

# Database Evolution

Version 1

farmers

bookings

queue

Version 2

farmers

bookings

queue

qr_tokens

override_requests

audit_logs

procurement_events

---

# API Roadmap

QR

POST /qr/generate

POST /qr/verify

---

Override

POST /override/request

POST /override/approve

GET /override/pending

---

Audit

GET /audit

GET /audit/today

GET /audit/{farmer}

---

Procurement

POST /procurement/start

POST /procurement/complete

GET /procurement/live

---

# Dashboard Roadmap

Current

Waiting

Served

No Show

Alerts

Future

Waiting

Served

No Show

QR Verified

Pending Overrides

Today's Violations

Audit Feed

Fairness Score

Live Procurement

---

# Procurement Centre Workflow

Registration

↓

Booking

↓

SMS

↓

Arrival

↓

QR Scan

↓

Identity Verification

↓

Slot Validation

↓

Queue Activation

↓

Weighment

↓

Procurement

↓

Payment

↓

Audit Log

---

# Judge Problems

Problem

Queue Jumping

Solution

Rule Engine

---

Problem

Ground Staff Manipulation

Solution

Audit Logs

---

Problem

Hidden Procurement

Solution

Procurement Timeline

---

Problem

Lack of Transparency

Solution

Dashboard

---

Problem

Farmer Identity

Solution

Permanent QR Identity

---

Problem

Unauthorized Procurement

Solution

Supervisor Override

---

# Future Scope

Biometric Verification

GPS Verification

Government Portal Integration

SMS Gateway

WhatsApp Bot

AI Fraud Detection

eKYC

Farmer Wallet

UPI Integration

Role Based Access Control

District Dashboard

State Dashboard

National Analytics

---

# Implementation Order

Sprint 1

Architecture Freeze

Database Design

ROADMAP

SSD

ER Diagram

---

Sprint 2

QR Identity

QR APIs

QR Database

---

Sprint 3

Rule Engine

Slot Validation

Procurement Engine

---

Sprint 4

Override System

Audit Logs

Timeline

---

Sprint 5

Dashboard Intelligence

Analytics

Alerts

Reports

---

Sprint 6

Testing

Performance

Security

Deployment

Documentation

---

Project Status

Phase 1

Completed

Phase 2

Completed

Phase 3

Completed

Phase 4

In Progress
