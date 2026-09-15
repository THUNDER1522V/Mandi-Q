"""End-to-End Test for Farmer CRUD & Mandi Phase 3 endpoints under /api/v1."""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_farmer_crud_lifecycle():
    # 1. Generate unique phone number for test run
    unique_suffix = str(uuid.uuid4().int)[:8]
    test_phone = f"+9197{unique_suffix}"

    create_payload = {
        "farmer_name": "Ramesh Kumar",
        "phone_number": test_phone,
        "village": "Karnal",
        "district": "Karnal",
        "state": "Haryana",
        "preferred_language": "Hindi"
    }

    # 2. POST /api/v1/farmers -> 201 Created
    post_res = client.post("/api/v1/farmers", json=create_payload)
    assert post_res.status_code == 201, f"Create failed: {post_res.text}"
    created_data = post_res.json()
    farmer_id = created_data["id"]
    assert created_data["farmer_name"] == "Ramesh Kumar"
    assert created_data["phone_number"] == test_phone

    # 3. POST duplicate phone -> 409 Conflict
    dup_res = client.post("/api/v1/farmers", json=create_payload)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()

    # 4. GET /api/v1/farmers -> 200 OK
    list_res = client.get("/api/v1/farmers")
    assert list_res.status_code == 200
    farmers = list_res.json()
    assert any(f["id"] == farmer_id for f in farmers)

    # 5. GET /api/v1/farmers/{id} -> 200 OK
    get_res = client.get(f"/api/v1/farmers/{farmer_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == farmer_id

    # 6. GET /api/v1/farmers/{nonexistent_id} -> 404 Not Found
    random_id = str(uuid.uuid4())
    nf_res = client.get(f"/api/v1/farmers/{random_id}")
    assert nf_res.status_code == 404

    # 7. PUT /api/v1/farmers/{id} -> 200 OK
    update_payload = {"farmer_name": "Ramesh Singh", "village": "Gharaunda"}
    put_res = client.put(f"/api/v1/farmers/{farmer_id}", json=update_payload)
    assert put_res.status_code == 200
    assert put_res.json()["farmer_name"] == "Ramesh Singh"
    assert put_res.json()["village"] == "Gharaunda"

    # 8. DELETE /api/v1/farmers/{id} -> 200 OK
    del_res = client.delete(f"/api/v1/farmers/{farmer_id}")
    assert del_res.status_code == 200

    # 9. GET /api/v1/farmers/{id} after deletion -> 404 Not Found
    check_del = client.get(f"/api/v1/farmers/{farmer_id}")
    assert check_del.status_code == 404


def test_dashboard_and_queue_endpoints():
    # Test GET /api/v1/dashboard/summary
    summary_res = client.get("/api/v1/dashboard/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "mandi" in summary
    assert "waiting" in summary
    assert "total_farmers" in summary

    # Test GET /api/v1/queue/live
    queue_res = client.get("/api/v1/queue/live")
    assert queue_res.status_code == 200
    assert isinstance(queue_res.json(), list)

    # Test GET /api/v1/alerts
    alerts_res = client.get("/api/v1/alerts")
    assert alerts_res.status_code == 200
    assert isinstance(alerts_res.json(), list)
