"""
End-to-End Verification Script for MANDIQ Farmer CRUD Module under /api/v1.
Executes all checks against FastAPI application and real PostgreSQL database.
"""
import json
import sys
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.database.session import SessionLocal

client = TestClient(app)

print("=" * 70)
print("MANDIQ BACKEND - /api/v1/farmers PRODUCTION CRUD VERIFICATION")
print("=" * 70)

results = {}


def test_section(title):
    print(f"\n---> [CHECK] {title}")


# -------------------------------------------------------------
# Clean up any leftover test records first
# -------------------------------------------------------------
db = SessionLocal()
try:
    db.execute(
        text("DELETE FROM farmers WHERE phone_number IN ('9876543210', '9999999999', '+919876543210', '9111222333')")
    )
    db.commit()
finally:
    db.close()

# -------------------------------------------------------------
# 1. Create Farmer
# -------------------------------------------------------------
test_section("1. Create Farmer: POST /api/v1/farmers")
create_payload = {
    "farmer_name": "Pushkar",
    "phone_number": "9876543210",
    "village": "Rampur",
    "district": "Jaipur",
    "state": "Rajasthan",
    "preferred_language": "Hindi"
}

res = client.post("/api/v1/farmers", json=create_payload)
print(f"Status Code: {res.status_code}")
print(f"Response: {json.dumps(res.json(), indent=2)}")

assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
farmer_data = res.json()
assert "id" in farmer_data, "No ID returned"
assert "created_at" in farmer_data, "No created_at returned"
assert "updated_at" in farmer_data, "No updated_at returned"

returned_uuid = farmer_data["id"]

# Verify real row in PostgreSQL
db = SessionLocal()
try:
    db_row = db.execute(
        text("SELECT id, farmer_name, phone_number, village FROM farmers WHERE id = :id"),
        {"id": returned_uuid}
    ).fetchone()
    assert db_row is not None, "Record not found in PostgreSQL!"
    print(f"PostgreSQL Database Row Confirmed: id={db_row[0]}, name={db_row[1]}, phone={db_row[2]}")
finally:
    db.close()

results["1_create"] = "PASS"

# -------------------------------------------------------------
# 2. Save the Returned UUID
# -------------------------------------------------------------
test_section(f"2. Save the Returned UUID: {returned_uuid}")
assert len(returned_uuid) == 36, "Invalid UUID length"
print(f"Stored real UUID: {returned_uuid}")
results["2_save_uuid"] = "PASS"

# -------------------------------------------------------------
# 3. Get Farmer by ID
# -------------------------------------------------------------
test_section(f"3. Get Farmer: GET /api/v1/farmers/{returned_uuid}")
get_res = client.get(f"/api/v1/farmers/{returned_uuid}")
print(f"Status Code: {get_res.status_code}")
print(f"Response: {json.dumps(get_res.json(), indent=2)}")

assert get_res.status_code == 200, f"Expected 200, got {get_res.status_code}"
get_data = get_res.json()
assert get_data["id"] == returned_uuid
assert get_data["farmer_name"] == "Pushkar"
assert get_data["phone_number"] == "9876543210"
assert get_data["village"] == "Rampur"
assert get_data["district"] == "Jaipur"
assert get_data["state"] == "Rajasthan"
assert get_data["preferred_language"] == "Hindi"
results["3_get_by_id"] = "PASS"

# -------------------------------------------------------------
# 4. Update Farmer
# -------------------------------------------------------------
test_section(f"4. Update Farmer: PUT /api/v1/farmers/{returned_uuid}")
update_payload = {
    "phone_number": "9999999999",
    "preferred_language": "English"
}
put_res = client.put(f"/api/v1/farmers/{returned_uuid}", json=update_payload)
print(f"Status Code: {put_res.status_code}")
print(f"Response: {json.dumps(put_res.json(), indent=2)}")

assert put_res.status_code == 200, f"Expected 200, got {put_res.status_code}"
put_data = put_res.json()
assert put_data["phone_number"] == "9999999999"
assert put_data["preferred_language"] == "English"
assert put_data["farmer_name"] == "Pushkar"
assert put_data["village"] == "Rampur"
assert put_data["district"] == "Jaipur"
assert put_data["state"] == "Rajasthan"

# Verify in PostgreSQL
db = SessionLocal()
try:
    db_updated = db.execute(
        text("SELECT phone_number, preferred_language, updated_at FROM farmers WHERE id = :id"),
        {"id": returned_uuid}
    ).fetchone()
    assert db_updated[0] == "9999999999"
    assert db_updated[1] == "English"
    print(f"PostgreSQL Row Updated: phone={db_updated[0]}, lang={db_updated[1]}, updated_at={db_updated[2]}")
finally:
    db.close()

results["4_update"] = "PASS"

# -------------------------------------------------------------
# 5. Get Again to Confirm Persistence
# -------------------------------------------------------------
test_section(f"5. Get Again: GET /api/v1/farmers/{returned_uuid}")
get_again = client.get(f"/api/v1/farmers/{returned_uuid}")
assert get_again.status_code == 200
again_data = get_again.json()
assert again_data["phone_number"] == "9999999999"
assert again_data["preferred_language"] == "English"
assert again_data["farmer_name"] == "Pushkar"
print("Persistence verified via GET")
results["5_get_again"] = "PASS"

# -------------------------------------------------------------
# 6. Get All Farmers
# -------------------------------------------------------------
test_section("6. Get All Farmers: GET /api/v1/farmers")
all_res = client.get("/api/v1/farmers")
assert all_res.status_code == 200
all_data = all_res.json()
assert isinstance(all_data, list), "Response is not a list"
found = any(f["id"] == returned_uuid for f in all_data)
assert found, f"Created farmer {returned_uuid} not in list!"
print(f"Total farmers count: {len(all_data)}. Created farmer found in list: {found}")
results["6_get_all"] = "PASS"

# -------------------------------------------------------------
# 7. Delete Farmer
# -------------------------------------------------------------
test_section(f"7. Delete Farmer: DELETE /api/v1/farmers/{returned_uuid}")
del_res = client.delete(f"/api/v1/farmers/{returned_uuid}")
print(f"Status Code: {del_res.status_code}")
print(f"Response: {del_res.json()}")

assert del_res.status_code == 200
assert del_res.json()["message"] == "Farmer deleted successfully"
results["7_delete"] = "PASS"

# -------------------------------------------------------------
# 8. Verify Delete via API (Returns 404)
# -------------------------------------------------------------
test_section(f"8. Verify Delete: GET /api/v1/farmers/{returned_uuid} -> Expected 404")
verify_del = client.get(f"/api/v1/farmers/{returned_uuid}")
print(f"Status Code: {verify_del.status_code}")
print(f"Response: {verify_del.json()}")

assert verify_del.status_code == 404
assert verify_del.json()["detail"] == "Farmer not found"
results["8_verify_delete_api"] = "PASS"

# -------------------------------------------------------------
# 9. Verify Database via SQL (Record No Longer Exists)
# -------------------------------------------------------------
test_section(f"9. Verify Database: SQL SELECT * FROM farmers WHERE id = '{returned_uuid}'")
db = SessionLocal()
try:
    sql_check = db.execute(
        text("SELECT COUNT(*) FROM farmers WHERE id = :id"),
        {"id": returned_uuid}
    ).scalar()
    print(f"Records found in DB for deleted UUID: {sql_check}")
    assert sql_check == 0, "Record still exists in database!"
finally:
    db.close()
results["9_verify_database_sql"] = "PASS"

# -------------------------------------------------------------
# 10. Test Invalid Non-Existent UUID (404, NOT 500)
# -------------------------------------------------------------
test_section("10. Test Non-Existent UUID: GET /api/v1/farmers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
dummy_res = client.get("/api/v1/farmers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
print(f"Status Code: {dummy_res.status_code}")
print(f"Response: {dummy_res.json()}")

assert dummy_res.status_code == 404, f"Expected 404, got {dummy_res.status_code}"
assert dummy_res.json()["detail"] == "Farmer not found"
results["10_test_nonexistent_uuid"] = "PASS"

# -------------------------------------------------------------
# 11. Validation Tests
# -------------------------------------------------------------
test_section("11. Validation Tests")

# 11a: Missing phone
v1 = client.post("/api/v1/farmers", json={
    "farmer_name": "Incomplete Farmer",
    "village": "Village",
    "district": "District",
    "state": "State"
})
print(f"11a Missing Phone: HTTP {v1.status_code}")
assert v1.status_code == 422

# 11b: Missing farmer_name
v2 = client.post("/api/v1/farmers", json={
    "phone_number": "9123456780",
    "village": "Village",
    "district": "District",
    "state": "State"
})
print(f"11b Missing Name: HTTP {v2.status_code}")
assert v2.status_code == 422

# 11c: Invalid UUID string format (e.g. 'not-a-uuid')
v3 = client.get("/api/v1/farmers/not-a-valid-uuid")
print(f"11c Invalid UUID Format: HTTP {v3.status_code}")
assert v3.status_code == 422

# 11d: Blank fields (spaces only)
v4 = client.post("/api/v1/farmers", json={
    "farmer_name": "   ",
    "phone_number": "9123456780",
    "village": "Village",
    "district": "District",
    "state": "State"
})
print(f"11d Blank Name ('   '): HTTP {v4.status_code}")
assert v4.status_code == 422

# 11e: Duplicate Phone -> 409 Conflict
test_phone_dup = "9111222333"
# Cleanup first
db = SessionLocal()
db.execute(text("DELETE FROM farmers WHERE phone_number = :p"), {"p": test_phone_dup})
db.commit()
db.close()

# Create first
d1 = client.post("/api/v1/farmers", json={
    "farmer_name": "Farmer One",
    "phone_number": test_phone_dup,
    "village": "Village 1",
    "district": "District",
    "state": "State"
})
assert d1.status_code == 201
first_id = d1.json()["id"]

# Create second with identical phone
d2 = client.post("/api/v1/farmers", json={
    "farmer_name": "Farmer Two",
    "phone_number": test_phone_dup,
    "village": "Village 2",
    "district": "District",
    "state": "State"
})
print(f"11e Duplicate Phone: HTTP {d2.status_code} - {d2.json()}")
assert d2.status_code == 409
assert d2.json()["detail"] == "Phone number already exists"

# Cleanup
client.delete(f"/api/v1/farmers/{first_id}")

results["11_validation"] = "PASS"

# -------------------------------------------------------------
# 12. Swagger Route Inspection (ONLY /api/v1/farmers, NO /farmers)
# -------------------------------------------------------------
test_section("12. Swagger / OpenAPI Route Inspection")
openapi_schema = app.openapi()
paths = openapi_schema.get("paths", {})

farmer_paths = [p for p in paths.keys() if "farmers" in p]
print("Registered farmer paths in OpenAPI:")
for p in farmer_paths:
    methods = list(paths[p].keys())
    print(f"  {p}: {methods}")

# Crucial assertion: /farmers does NOT exist in paths!
assert "/farmers" not in paths, "Old /farmers route still exists!"
assert "/farmers/{farmer_id}" not in paths, "Old /farmers/{farmer_id} route still exists!"

# Crucial assertion: ONLY /api/v1/farmers exists!
assert "/api/v1/farmers" in paths
assert "/api/v1/farmers/{farmer_id}" in paths
assert "post" in paths["/api/v1/farmers"]
assert "get" in paths["/api/v1/farmers"]
assert "get" in paths["/api/v1/farmers/{farmer_id}"]
assert "put" in paths["/api/v1/farmers/{farmer_id}"]
assert "delete" in paths["/api/v1/farmers/{farmer_id}"]

results["12_swagger"] = "PASS"

# -------------------------------------------------------------
# 13. Database Session & Transaction Safety
# -------------------------------------------------------------
test_section("13. Database Engine & Session Safety")
db = SessionLocal()
try:
    ping = db.execute(text("SELECT 1")).scalar()
    assert ping == 1
    print("PostgreSQL connection ping: OK")
finally:
    db.close()
results["13_db_safety"] = "PASS"

# -------------------------------------------------------------
# Final Summary
# -------------------------------------------------------------
print("\n" + "=" * 70)
print("FINAL VERIFICATION SUMMARY")
print("=" * 70)
for k, v in results.items():
    print(f"  [{v}] {k}")

all_passed = all(v == "PASS" for v in results.values())
if all_passed:
    print("\nOVERALL STATUS: PASS (All checks verified against PostgreSQL under /api/v1)")
else:
    print("\nOVERALL STATUS: FAIL")
