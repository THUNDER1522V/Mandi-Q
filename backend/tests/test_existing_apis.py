from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_dashboard_summary():
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "waiting" in data
    assert "served" in data

def test_queue_live():
    res = client.get("/api/v1/queue/live")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_activity_logs():
    res = client.get("/api/v1/activity-logs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_audit_events():
    res = client.get("/api/v1/audit-events")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_weighbridge_bays():
    res = client.get("/api/v1/weighbridge/bays")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_fairprocure_overrides():
    res = client.get("/api/v1/fairprocure/overrides")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_farmers_list():
    res = client.get("/api/v1/farmers")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
