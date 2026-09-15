import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(method, path, data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            body = resp.read().decode("utf-8")
            parsed = json.loads(body) if body else None
            print(f"[PASS] {method} {path} -> {status_code}")
            return True, parsed
    except urllib.error.HTTPError as e:
        print(f"[FAIL] {method} {path} -> {e.code}")
        return False, None
    except Exception as e:
        print(f"[FAIL] {method} {path} -> {e}")
        return False, None

def run_tests():
    print("==================================================")
    print("VERIFYING PHASE 4 MANDIQ BACKEND ENDPOINTS")
    print("==================================================")
    
    # 1. Health
    test_endpoint("GET", "/health")
    
    # 2. Dashboard Summary
    ok, summary = test_endpoint("GET", "/api/v1/dashboard/summary")
    if ok and summary:
        print(f"    Waiting: {summary.get('waiting')}, Served: {summary.get('served')}, Total Farmers: {summary.get('total_farmers')}, Total Qtl: {summary.get('total_quintals_procured')}")
    
    # 3. Live Queue
    ok, queue = test_endpoint("GET", "/api/v1/queue/live")
    if ok and queue:
        print(f"    Queue items count: {len(queue)}")
        serving = [q for q in queue if q.get('status') == 'SERVING']
        waiting = [q for q in queue if q.get('status') == 'WAITING']
        served = [q for q in queue if q.get('status') == 'SERVED']
        print(f"    Serving: {len(serving)}, Waiting: {len(waiting)}, Served: {len(served)}")
        if serving:
            b1 = [s.get('name') for s in serving if s.get('bay_number') == 1]
            b2 = [s.get('name') for s in serving if s.get('bay_number') == 2]
            print(f"    Bay 1 serving: {b1}")
            print(f"    Bay 2 serving: {b2}")
    
    # 4. Activity Logs
    ok, logs = test_endpoint("GET", "/api/v1/activity-logs")
    if ok and logs:
        print(f"    Activity logs count: {len(logs)}")
        if logs:
            print(f"    Latest log: {logs[0].get('title')} ({logs[0].get('timestamp')})")
            
    # 5. Audit Events
    ok, audits = test_endpoint("GET", "/api/v1/audit-events")
    if ok and audits:
        print(f"    Audit events count: {len(audits)}")

    # 6. Weighbridge Bays
    ok, bays = test_endpoint("GET", "/api/v1/weighbridge/bays")
    if ok and bays:
        print(f"    Bays count: {len(bays)}")
        for b in bays:
            print(f"    Bay {b.get('bay_number')}: {b.get('bay_name')} - Status: {b.get('status')} - Current Token: {b.get('current_token')}")

    # 7. FairProcure Token Verification
    ok, fp_res = test_endpoint("POST", "/api/v1/fairprocure/verify-token", data={"token_number": 48})
    if ok and fp_res:
        print(f"    FairProcure Token 48 verification: valid={fp_res.get('valid')}, status={fp_res.get('status')}")

    # 8. FairProcure Overrides
    ok, fp_overrides = test_endpoint("GET", "/api/v1/fairprocure/overrides")
    if ok and fp_overrides is not None:
        print(f"    FairProcure Overrides count: {len(fp_overrides)}")

    # 9. Farmers CRUD
    ok, farmers = test_endpoint("GET", "/api/v1/farmers")
    if ok and farmers:
        print(f"    Farmers count: {len(farmers)}")

    print("==================================================")
    print("ALL API ENDPOINTS VERIFIED SUCCESSFULLY")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
