from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_common_health_probes_resolve_without_hiding_unknown_routes():
    for path in ("/", "/health", "/api/health"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert client.head(path).status_code == 200
    assert client.get("/api/not-a-route").status_code == 404
    assert client.get("/healthz").status_code == 404
