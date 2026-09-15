"""
MANDIQ APMC FairProcure Platform — Production Database Seeder (Sprint 7.1)
Populates PostgreSQL with 150 authentic Haryana APMC procurement records,
realistic commodities, natural FIFO queue ordering (T-318, T-319, T-320...),
cryptographic HMAC-SHA256 QR tokens, and zero placeholder test strings.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.database.session import SessionLocal
from app.models import (
    Farmer,
    Commodity,
    Booking,
    Token,
    Procurement,
    SystemState,
    Notification,
    WeighbridgeBay,
    ActivityLog,
    OverrideRequest,
    ProcurementEvent,
)
from app.models.qr_token import QRToken
from app.services.fairprocure.qr_service import QRService

# 150 Authentic Indian Farmer Names (Haryana APMC Catchment)
FARMER_NAMES = [
    "Rakesh Kumar", "Sunita Devi", "Anil Kumar", "Harjeet Singh", "Pawan Yadav",
    "Rajesh Verma", "Suresh Kumar", "Baldev Singh Dhillon", "Kuldeep Singh", "Mahavir Sharma",
    "Rameshwar Dayal", "Gurpreet Singh", "Jasbir Chahal", "Sandeep Kamboj", "Satnam Gill",
    "Surinder Kadian", "Hardeep Virk", "Karamjit Saini", "Anil Ahlawat", "Manoj Dahiya",
    "Balbir Kundu", "Rohtash Panwar", "Vikram Sheoran", "Dharamvir Punia", "Joginder Vashisht",
    "Pawan Malik", "Shamsher Hooda", "Harpal Sandhu", "Daljit Brar", "Surender Deswal",
    "Virender Rohilla", "Jagtar Dhillon", "Ram Kumar Arya", "Sukhwinder Cheema", "Naresh Batra",
    "Ishwar Singh", "Rajendra Prasad", "Balwan Singh", "Om Prakash", "Manjeet Kaur",
    "Devinder Singh", "Jagdish Chander", "Rajbir Singh", "Kulwant Rai", "Subhash Chand",
    "Krishan Lal", "Ashok Kumar", "Vinod Kumar", "Jagmohan Singh", "Tejinder Singh",
    "Satpal Sharma", "Pritam Singh", "Rajinder Kumar", "Ramphal Nain", "Bhagwan Das",
    "Santosh Devi", "Paramjit Singh", "Ravinder Rana", "Mukesh Kumar", "Jaideep Singh",
    "Tarsem Lal", "Dharampal Gill", "Joginder Singh", "Sukhdev Singh", "Anoop Singh",
    "Sandeep Gill", "Mahender Singh", "Hawa Singh", "Raghuvir Singh", "Jai Bhagwan",
    "Umed Singh", "Waryam Singh", "Ranbir Singh", "Ajit Singh", "Amarjit Singh",
    "Harbhajan Singh", "Kulwant Singh", "Jaspal Singh", "Gurmail Singh", "Gurnam Singh",
    "Mohinder Singh", "Gurmukh Singh", "Jaswant Singh", "Palwinder Singh", "Nirmal Singh",
    "Balkar Singh", "Tarlochan Singh", "Bhupinder Singh", "Kashmir Singh", "Avtar Singh",
    "Charan Singh", "Kartar Singh", "Swaran Singh", "Gurdial Singh", "Bakshish Singh",
    "Hardial Singh", "Tehal Singh", "Sohan Singh", "Mehar Singh", "Gurcharan Singh",
    "Gurdev Singh", "Sewa Singh", "Gurdeep Singh", "Mangal Singh", "Piara Singh",
    "Sadhu Singh", "Gian Singh", "Bhagat Singh", "Pritpal Singh", "Inderjit Singh",
    "Davinder Singh", "Amrik Singh", "Boota Singh", "Sarabjit Singh", "Jagjit Singh",
    "Harnek Singh", "Gurmeet Singh", "Karnail Singh", "Balwant Singh", "Fauja Singh",
    "Kundan Lal", "Sohan Lal", "Mohan Lal", "Ram Lal", "Chaman Lal",
    "Banarsi Das", "Kishori Lal", "Mange Ram", "Mool Chand", "Tek Chand",
    "Tara Chand", "Deep Chand", "Hukam Chand", "Karam Chand", "Faqir Chand",
    "Gian Chand", "Gian Parkash", "Ved Parkash", "Jai Parkash", "Ram Parkash",
    "Satish Kumar", "Naresh Kumar", "Dinesh Kumar", "Mukesh Sharma", "Rakesh Sharma",
    "Deepak Verma", "Sanjay Verma", "Sunil Yadav", "Manoj Yadav", "Pankaj Yadav",
]

# Authentic Haryana Villages across Karnal APMC
VILLAGES = [
    ("Nilokheri (नीलोखेड़ी)", "Hindi"),
    ("Taraori (तरावड़ी)", "Punjabi"),
    ("Assandh (असंध)", "Hindi"),
    ("Gharaunda (घरौंडा)", "Hindi"),
    ("Indri (इन्द्री)", "Punjabi"),
    ("Karnal Rural (करनाल ग्रामीण)", "Hindi"),
    ("Nissing (निसिंग)", "Hindi"),
    ("Madhuban (मधुबन)", "Hindi"),
    ("Jundla (जुंडला)", "Hindi"),
    ("Kunjpura (कुंजपुरा)", "Hindi"),
    ("Sambhli (संभली)", "Hindi"),
    ("Biana (बयाना)", "Hindi"),
    ("Gagsina (गगसीना)", "Hindi"),
    ("Rambha (रम्भा)", "Hindi"),
    ("Dabri (डाबरी)", "Hindi"),
]

# Real Commodities & MSPs
COMMODITIES = [
    {"name": "Wheat (गेहूँ)", "msp": 2275.0, "grade": "FAQ Standard Grade A"},
    {"name": "Paddy PR-126 (धान)", "msp": 2320.0, "grade": "Common Fine Grade"},
    {"name": "Basmati 1121 (बासमती)", "msp": 3900.0, "grade": "Super Fine Aromatic"},
    {"name": "Mustard (सरसों)", "msp": 5650.0, "grade": "Oil Content >42%"},
    {"name": "Cotton (कपास)", "msp": 7020.0, "grade": "Medium Staple Quality"},
    {"name": "Maize (मक्का)", "msp": 2090.0, "grade": "Kharif Feed Grade A"},
    {"name": "Bajra (बाजरा)", "msp": 2500.0, "grade": "Kharif Grain Grade A"},
]

# Vehicle Types
VEHICLES = ["Tractor Trolley", "Pickup 407", "Canter", "Tractor Trolley"]

# Realistic slots
SLOTS = [
    "08:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 02:00 PM",
    "02:00 PM - 04:00 PM",
    "04:00 PM - 06:00 PM",
]


def seed_data():
    db = SessionLocal()
    try:
        print("[SEED] Starting MANDIQ Sprint 7.1 Database Seeding...")

        # 1. Ensure SystemState
        system_state = db.query(SystemState).filter(SystemState.id == 1).first()
        if not system_state:
            system_state = SystemState(
                id=1,
                is_halted=False,
                halt_reason="",
                updated_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.add(system_state)
        else:
            system_state.is_halted = False
            system_state.halt_reason = ""
            system_state.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        # 2. Seed Commodities
        commodities_map = {}
        for c in COMMODITIES:
            existing = db.query(Commodity).filter(Commodity.commodity_name == c["name"]).first()
            if not existing:
                existing = Commodity(
                    commodity_name=c["name"],
                    minimum_support_price=c["msp"],
                    unit="Quintal",
                )
                db.add(existing)
                db.flush()
            commodities_map[c["name"]] = existing

        # Clean existing operational transactions and farmers to rebuild pristine authentic 150-farmer dataset
        db.query(OverrideRequest).delete(synchronize_session=False)
        db.query(ProcurementEvent).delete(synchronize_session=False)
        db.query(Token).delete(synchronize_session=False)
        db.query(Procurement).delete(synchronize_session=False)
        db.query(Booking).delete(synchronize_session=False)
        db.query(QRToken).delete(synchronize_session=False)
        db.query(ActivityLog).delete(synchronize_session=False)
        db.query(Notification).delete(synchronize_session=False)
        db.query(Farmer).delete(synchronize_session=False)
        db.flush()

        # 4. Seed Weighbridge Bays
        bays_data = [
            {
                "bay_number": 1,
                "bay_name": "60-Ton Gross Scale (North Gate)",
                "scale_type": "Gross / Tare Electronic Pit Scale",
                "capacity_tons": 60,
                "operator_name": "Satish Kumar (APMC Officer)",
                "status": "SERVING",
                "current_token": 320,
            },
            {
                "bay_number": 2,
                "bay_name": "40-Ton Gross Scale (South Gate)",
                "scale_type": "Gross / Tare Electronic Pit Scale",
                "capacity_tons": 40,
                "operator_name": "Ramesh Singh (APMC Officer)",
                "status": "SERVING",
                "current_token": 321,
            },
        ]
        for b in bays_data:
            existing_bay = db.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == b["bay_number"]).first()
            if not existing_bay:
                db.add(WeighbridgeBay(**b))
            else:
                existing_bay.bay_name = b["bay_name"]
                existing_bay.scale_type = b["scale_type"]
                existing_bay.capacity_tons = b["capacity_tons"]
                existing_bay.operator_name = b["operator_name"]
                existing_bay.status = b["status"]
                existing_bay.current_token = b["current_token"]
        db.flush()

        # 5. Create / Update 150 Authentic Farmers
        print("[SEED] Seeding 150 realistic Haryana APMC farmers...")
        seeded_farmers = []
        for i, name in enumerate(FARMER_NAMES):
            village, lang = VILLAGES[i % len(VILLAGES)]
            # Realistic Indian 10-digit mobile number starting with 98, 94, 97
            prefix = ["98120", "94160", "98762", "98124", "94661", "98960"][i % 6]
            phone = f"+91{prefix}{str(1000 + i)}"

            farmer = db.query(Farmer).filter(Farmer.phone_number == phone).first()
            if not farmer:
                farmer = Farmer(
                    farmer_name=name,
                    phone_number=phone,
                    village=village,
                    district="Karnal",
                    state="Haryana",
                    preferred_language=lang,
                )
                db.add(farmer)
                db.flush()
            else:
                farmer.farmer_name = name
                farmer.village = village
                farmer.preferred_language = lang

            seeded_farmers.append(farmer)

        db.flush()

        # 6. Build Strictly Sequential Queue Sequencing
        # Sequence:
        # - SERVING (2): Token 320 (Bay 1), Token 321 (Bay 2)
        # - WAITING (45): Tokens 322, 323, 324, 325, 326, 327... (strictly consecutive with 0 gaps)
        # - SERVED (90): Tokens 210..299
        # - RESCHEDULED (9): Tokens 181..189
        # - NO_SHOW (4): Tokens 201..204

        serving_tokens = [320, 321]
        waiting_tokens = [322 + i for i in range(45)]
        rescheduled_tokens = [181 + i for i in range(9)]
        noshow_tokens = [201 + i for i in range(4)]
        served_tokens = [210 + i for i in range(90)]

        token_assignments = []
        # Index 0, 1 -> Serving (Bay 1 & Bay 2)
        token_assignments.append((serving_tokens[0], "SERVING", 1, "10:00 AM - 12:00 PM"))
        token_assignments.append((serving_tokens[1], "SERVING", 2, "10:00 AM - 12:00 PM"))

        # Index 2..46 -> Waiting (45 items strictly sequential, gradual 30-min steps)
        waiting_slot_schedule = [
            (4, "10:00 AM - 12:00 PM"),
            (5, "10:30 AM - 12:30 PM"),
            (5, "11:00 AM - 01:00 PM"),
            (5, "11:30 AM - 01:30 PM"),
            (5, "12:00 PM - 02:00 PM"),
            (5, "12:30 PM - 02:30 PM"),
            (5, "01:00 PM - 03:00 PM"),
            (5, "01:30 PM - 03:30 PM"),
            (6, "02:00 PM - 04:00 PM"),
        ]
        w_idx = 0
        for count, slot in waiting_slot_schedule:
            for _ in range(count):
                if w_idx < len(waiting_tokens):
                    token_assignments.append((waiting_tokens[w_idx], "WAITING", None, slot))
                    w_idx += 1

        # Index 47..136 -> Served (90 items, clusters of 5 sharing a slot, stepping by 15 mins)
        served_slots = [
            "06:00 AM - 08:00 AM",
            "06:15 AM - 08:15 AM",
            "06:30 AM - 08:30 AM",
            "06:45 AM - 08:45 AM",
            "07:00 AM - 09:00 AM",
            "07:15 AM - 09:15 AM",
            "07:30 AM - 09:30 AM",
            "07:45 AM - 09:45 AM",
            "08:00 AM - 10:00 AM",
            "08:15 AM - 10:15 AM",
            "08:30 AM - 10:30 AM",
            "08:45 AM - 10:45 AM",
            "09:00 AM - 11:00 AM",
            "09:15 AM - 11:15 AM",
            "09:30 AM - 11:30 AM",
            "09:45 AM - 11:45 AM",
            "10:00 AM - 12:00 PM",
            "10:15 AM - 12:15 PM",
        ]
        for i, tok in enumerate(served_tokens):
            slot = served_slots[min(i // 5, len(served_slots) - 1)]
            token_assignments.append((tok, "SERVED", None, slot))

        # Index 137..145 -> Rescheduled (9 items: TK-181 to TK-189, pairs sharing slot, increasing gradually)
        rescheduled_slots = [
            "06:00 AM - 08:00 AM",  # TK-181
            "06:00 AM - 08:00 AM",  # TK-182
            "07:00 AM - 09:00 AM",  # TK-183
            "07:00 AM - 09:00 AM",  # TK-184
            "08:00 AM - 10:00 AM",  # TK-185
            "08:00 AM - 10:00 AM",  # TK-186
            "09:00 AM - 11:00 AM",  # TK-187
            "09:00 AM - 11:00 AM",  # TK-188
            "10:00 AM - 12:00 PM",  # TK-189
        ]
        for i, tok in enumerate(rescheduled_tokens):
            token_assignments.append((tok, "RESCHEDULED", None, rescheduled_slots[i]))

        # Index 146..149 -> No Show (4 items: TK-201 to TK-204)
        noshow_slots = [
            "06:30 AM - 08:30 AM",  # TK-201
            "06:30 AM - 08:30 AM",  # TK-202
            "07:30 AM - 09:30 AM",  # TK-203
            "07:30 AM - 09:30 AM",  # TK-204
        ]
        for i, tok in enumerate(noshow_tokens):
            token_assignments.append((tok, "NO_SHOW", None, noshow_slots[i]))

        # Natural quantities list
        quantities = [32.0, 41.0, 57.0, 68.0, 45.0, 28.0, 36.0, 52.0, 63.0, 74.0, 81.0, 39.0, 48.0, 55.0, 64.0, 72.0, 35.0, 42.0]

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        today_date = now.date()

        qr_service = QRService(db)

        print("[SEED] Creating 150 bookings, tokens, and cryptographic QR identities...")
        for i, farmer in enumerate(seeded_farmers):
            token_num, status_str, bay_num, slot_str = token_assignments[i]
            comm_data = COMMODITIES[i % len(COMMODITIES)]
            comm = commodities_map[comm_data["name"]]
            qty = quantities[i % len(quantities)]
            veh = VEHICLES[i % len(VEHICLES)]
            veh_num = f"HR 05 {chr(65 + (i % 26))}{chr(65 + ((i + 3) % 26))} {1000 + (token_num * 13) % 9000}"

            booking_time_str = f"0{7 + (i % 3)}:{str((i * 7) % 60).zfill(2)} AM"

            payment_status = "CREDITED" if status_str == "SERVED" else "PENDING"
            payment_amount = round(qty * comm.minimum_support_price, 2) if status_str == "SERVED" else None
            payment_ref = f"PFMS{today_date.strftime('%Y%m%d')}UTR{10000 + token_num}" if status_str == "SERVED" else None

            # Create Booking
            booking = Booking(
                farmer_id=farmer.id,
                commodity_id=comm.id,
                booking_date=today_date,
                booking_slot=slot_str,
                status=status_str,
                bay_number=bay_num,
                estimated_quantity=qty,
                net_weight_quintals=qty if status_str in ("SERVING", "SERVED") else None,
                vehicle_type=veh,
                vehicle_number=veh_num,
                booked_via="Voice (Sarvam AI)" if i % 2 == 0 else "Web Assisted",
                booking_timestamp=booking_time_str,
                payment_status=payment_status,
                payment_amount=payment_amount,
                payment_reference=payment_ref,
                moisture_pct=11.2 + ((i * 3) % 25) / 10.0,
                notes="Standard intake clearance pass" if status_str != "RESCHEDULED" else "Auto-rescheduled by MandiQ HALT protocol",
            )
            db.add(booking)
            db.flush()

            # Create Token
            token = Token(
                booking_id=booking.id,
                token_number=token_num,
                queue_position=i + 1,
                status=status_str,
                estimated_arrival=now + timedelta(minutes=i * 5),
            )
            db.add(token)
            db.flush()

            # Pre-generate authentic cryptographic QR identity for EVERY farmer
            qr_service.generate_farmer_qr(farmer_id=farmer.id)

            # If SERVED, create a completed Procurement record
            if status_str == "SERVED":
                proc = Procurement(
                    booking_id=booking.id,
                    actual_quantity=qty,
                    quality_grade="Grade A FAQ",
                    final_price=payment_amount or (qty * comm.minimum_support_price),
                    procurement_status="Completed",
                    procured_at=now - timedelta(minutes=(150 - i) * 3),
                )
                db.add(proc)

        # 7. Seed Real Operational Activity Logs
        print("[SEED] Seeding authentic operational activity logs...")
        activity_entries = [
            ("Gate 01 gross weighment completed", "Bay 01 Gross Pit Scale · 58.0 Qtl Wheat verified", "system"),
            ("Token T-318 called to Weighbridge Bay 1", "Rameshwar Dayal · Assigned to North Gate 60-Ton Scale", "bay"),
            ("Token T-319 called to Weighbridge Bay 2", "Gurpreet Singh · Assigned to South Gate 40-Ton Scale", "bay"),
            ("Cryptographic QR pass scanned at buffer gate", "Token T-320 verified via HMAC-SHA256 signature", "qr"),
            ("Payment batch dispatched to PFMS gateway", "INR 14,24,000 credited to 18 verified farmers", "system"),
            ("Moisture quality inspection cleared", "Taraori lot #489 moisture level 11.4% (acceptable <14%)", "system"),
        ]
        for title, detail, act_type in activity_entries:
            act = ActivityLog(
                title=title,
                detail=detail,
                event_type=act_type,
                created_at=datetime.utcnow(),
            )
            db.add(act)

        db.commit()
        print("[SEED] SUCCESS: Seeded 150 realistic farmers, tokens, bookings, and QR identities!")

    except Exception as e:
        db.rollback()
        print(f"[SEED] ERROR during database seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
