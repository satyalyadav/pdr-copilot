from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_local_guidance_has_real_citations_and_explicit_provenance():
    response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "local"})
    assert response.status_code == 200
    result = response.json()
    assert result["mode"] == "local"
    assert "template" in result["label"].lower()
    assert result["steps"]
    sources = {source["id"] for source in result["sources"]}
    for step in result["steps"]:
        assert set(step["source_ids"]) <= sources
        assert step["source_ids"]
    assert result["repair_actions_validated"] is False


def test_live_mode_requires_backend_credentials(monkeypatch):
    monkeypatch.delenv("OPENCODE_API_KEY", raising=False)
    response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
    assert response.status_code == 503
    assert "key" in response.json()["detail"].lower()


def test_live_image_review_returns_only_supported_cited_steps(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")

    def respond(request):
        body = json.loads(request.content)
        assert body["messages"][1]["content"][1]["image_url"]["url"].startswith(
            "data:image/png;base64,"
        )
        selection = {
            "visible_findings": ["stripe_curvature"],
            "inspection_step_ids": ["confirm_lighting"],
            "source_ids": ["ding-king-lighting"],
        }
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(selection)}}]}
        )

    app.state.zen_transport = httpx.MockTransport(respond)
    try:
        response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
        assert response.status_code == 200
        result = response.json()
        assert result["mode"] == "zen"
        assert result["finding_ids"] == ["stripe_curvature"]
        assert "curved" in result["findings"][0]
        assert result["steps"][0]["source_ids"] == ["ding-king-lighting"]
        assert result["repair_actions_validated"] is False
    finally:
        app.state.zen_transport = None


def test_model_cannot_invent_citations_or_add_repair_instructions(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    invalid_outputs = [
        {
            "visible_findings": ["stripe_curvature"],
            "inspection_step_ids": ["confirm_lighting"],
            "source_ids": ["invented-source"],
        },
        {
            "visible_findings": ["stripe_curvature"],
            "inspection_step_ids": ["confirm_lighting"],
            "source_ids": ["rivian-pdr-2023"],
        },
        {
            "visible_findings": ["stripe_curvature"],
            "inspection_step_ids": ["confirm_lighting"],
            "source_ids": ["ding-king-lighting"],
            "repair": "Push the panel with a rod.",
        },
    ]
    try:
        for selection in invalid_outputs:
            app.state.zen_transport = httpx.MockTransport(
                lambda request, selected=selection: httpx.Response(
                    200, json={"choices": [{"message": {"content": json.dumps(selected)}}]}
                )
            )
            response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
            assert response.status_code == 502
            assert "Push the panel" not in response.text
    finally:
        app.state.zen_transport = None


def test_upstream_errors_do_not_expose_credentials_or_silently_switch_modes(monkeypatch):
    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "private-test-key")
    app.state.zen_transport = httpx.MockTransport(
        lambda request: httpx.Response(401, text="private-test-key")
    )
    try:
        response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
        assert response.status_code == 502
        assert "private-test-key" not in response.text
    finally:
        app.state.zen_transport = None


def test_provider_timeout_has_a_clear_error_without_an_automatic_retry(monkeypatch):
    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    requests = []

    def timeout(request):
        requests.append(request)
        raise httpx.ReadTimeout("Timed out", request=request)

    app.state.zen_transport = httpx.MockTransport(timeout)
    try:
        response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
        assert response.status_code == 504
        assert "timed out" in response.json()["detail"]
        assert len(requests) == 1
    finally:
        app.state.zen_transport = None
