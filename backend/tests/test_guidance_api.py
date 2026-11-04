from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_creased_dent_gets_a_tangible_plan_without_expert_or_setup_gates(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    selection = {
        "visible_evidence": "Silver rear quarter has a broad depression and a horizontal crease below the taillight.",
        "dent_region": {"x": 0.2, "y": 0.25, "width": 0.5, "height": 0.5},
        "dent_shape": "crease",
        "assumptions": ["The coating is intact; the photo does not establish this."],
        "confidence": "medium",
        "card_id": "crease_pull",
        "where_to_work": "The horizontal crease below the taillight, clear of the left panel seam.",
        "reason": "A crease-shaped tab targets the narrow low rather than the whole surrounding panel.",
        "comparison": None,
    }

    def respond(request):
        payload = json.loads(json.loads(request.content)["messages"][1]["content"][0]["text"])
        assert "crease_pull" in payload["technique_cards"]
        assert "expert_check" not in payload["technique_cards"]
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(selection)}}]}
        )

    app.state.zen_transport = httpx.MockTransport(respond)
    try:
        response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["status"] == "proposal"
        assert result["next_action"]["id"] == "crease_pull"
        assert result["next_action"]["tools"]
        assert result["next_action"]["expected_change"]
        assert len(result["next_action"]["steps"]) >= 3
        assert "expert" not in json.dumps(result["next_action"]).lower()
        assert result["where_to_work"] == selection["where_to_work"]
        assert result["assumptions"]
    finally:
        app.state.zen_transport = None


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


def test_live_normal_photo_returns_a_localized_source_backed_action(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    selection = {
        "visible_evidence": "Silver rear quarter with a depression below the red tail light.",
        "dent_region": {"x": 0.3, "y": 0.3, "width": 0.4, "height": 0.4},
        "confidence": "medium",
        "dent_shape": "broad_low",
        "assumptions": ["Paint integrity and vehicle procedure are unverified."],
        "card_id": "controlled_pull",
        "where_to_work": "The broad low below the tail light; confirm its center on the panel.",
        "reason": "An external glue pull is a candidate for this accessible depression.",
        "comparison": None,
    }

    def respond(request):
        body = json.loads(request.content)
        assert any(item.get("type") == "image_url" for item in body["messages"][1]["content"])
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(selection)}}]}
        )

    app.state.zen_transport = httpx.MockTransport(respond)
    try:
        response = client.post("/api/guidance", data={"demo_id": "initial", "mode": "zen"})
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["visible_evidence"].startswith("Silver rear quarter")
        assert result["next_action"]["id"] == "controlled_pull"
        assert len(result["next_action"]["steps"]) >= 3
        assert result["status"] == "proposal"
        assert result["physical_preconditions"]
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


def test_reassessment_receives_both_photos_and_respects_reported_high(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    assessment = {
        "visible_evidence": "Silver quarter panel below a red light; residual distortion remains.",
        "dent_region": {"x": 0.25, "y": 0.25, "width": 0.4, "height": 0.45},
        "confidence": "medium",
        "dent_shape": "raised_spot",
        "assumptions": ["Paint integrity and vehicle procedure are unverified."],
        "card_id": "tap_down",
        "where_to_work": "The raised spot reported below the light; confirm on the panel.",
        "reason": "The technician reported a high after the last pull.",
        "comparison": {
            "view_match": "similar",
            "change": "looks_flatter",
            "evidence": "The broad depression is less apparent; a smaller raised spot was reported.",
        },
    }

    def respond(request):
        content = json.loads(request.content)["messages"][1]["content"]
        assert len([item for item in content if item["type"] == "image_url"]) == 2
        state = json.loads(content[0]["text"])
        assert state["action_since_previous_photo"] == "One small glue pull."
        assert "controlled_pull" not in state["technique_cards"]
        assert state["reported_outcome"] == "went_high"
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(assessment)}}]}
        )

    app.state.zen_transport = httpx.MockTransport(respond)
    # Different synthetic frames exercise image pairing; this is not a repair validation.
    previous = client.get("/api/demo/initial").content
    try:
        response = client.post(
            "/api/guidance",
            data={
                "mode": "zen",
                "demo_id": "adjusted",
                "action_note": "One small glue pull.",
                "outcome": "went_high",
            },
            files={"previous_image": ("before.png", previous, "image/png")},
        )
        assert response.status_code == 200, response.text
        assert response.json()["next_action"]["id"] == "tap_down"
        assert response.json()["status"] == "proposal"
    finally:
        app.state.zen_transport = None


def test_unsafe_or_inconsistent_model_actions_are_rejected(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    base = {
        "visible_evidence": "Silver quarter panel with a visible depression below the light.",
        "dent_region": {"x": 0.3, "y": 0.3, "width": 0.3, "height": 0.4},
        "confidence": "medium",
        "dent_shape": "broad_low",
        "assumptions": ["Paint integrity and vehicle procedure are unverified."],
        "card_id": "controlled_pull",
        "where_to_work": "Below the rear light; confirm the low on the panel.",
        "reason": "A broad low remains visible.",
        "comparison": None,
    }
    previous = client.get("/api/demo/initial").content
    cases = [
        ({**base, "card_id": "invented_method"}, {}, None),
        ({**base, "card_id": "expert_check"}, {}, None),
        ({**base, "dent_shape": "nearly_flat"}, {}, None),
        ({**base, "dent_shape": "raised_spot"}, {}, None),
        ({**base, "card_id": "finish_check"}, {}, None),
        ({**base, "card_id": "crease_pull"}, {}, None),
        ({**base, "steps": ["Apply arbitrary force"]}, {}, None),
        ({**base, "dent_region": {"x": 0.9, "y": 0.2, "width": 0.3, "height": 0.2}}, {}, None),
        ({**base, "card_id": "tap_down"}, {}, None),
        ({**base, "dent_region": None}, {}, None),
        (
            {
                **base,
                "comparison": {
                    "view_match": "uncertain",
                    "change": "looks_flatter",
                    "evidence": "Camera angle and lighting changed.",
                },
            },
            {"action_note": "Small pull.", "outcome": "still_low"},
            previous,
        ),
        (
            {
                **base,
                "comparison": {
                    "view_match": "similar",
                    "change": "no_visible_change",
                    "evidence": "The low is still visible.",
                },
            },
            {"action_note": "One pull raised a high.", "outcome": "went_high"},
            previous,
        ),
    ]
    try:
        for model_output, extra, photo in cases:
            app.state.zen_transport = httpx.MockTransport(
                lambda request, answer=model_output: httpx.Response(
                    200, json={"choices": [{"message": {"content": json.dumps(answer)}}]}
                )
            )
            r = client.post(
                "/api/guidance",
                data={"mode": "zen", "demo_id": "adjusted", **extra},
                files={"previous_image": ("before.png", photo, "image/png")} if photo else None,
            )
            assert r.status_code == 502, (model_output, r.text)
    finally:
        app.state.zen_transport = None


def test_smoother_photo_gets_finish_evaluation_without_a_user_diagnosis(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    selected = {
        "visible_evidence": "The silver panel below the taillight appears smooth; the earlier crease is not apparent.",
        "dent_region": {"x": 0.3, "y": 0.3, "width": 0.3, "height": 0.4},
        "dent_shape": "nearly_flat",
        "assumptions": ["Actual repair actions are unknown."],
        "confidence": "medium",
        "card_id": "finish_check",
        "where_to_work": "The former crease below the taillight and above the bumper.",
        "reason": "The visible crease is no longer apparent, so another pull is not justified.",
        "comparison": {
            "view_match": "similar",
            "change": "looks_flatter",
            "evidence": "The sharp depression is no longer apparent, although reflections differ.",
        },
    }

    def respond(request):
        payload = json.loads(json.loads(request.content)["messages"][1]["content"][0]["text"])
        assert payload["reported_outcome"] == "not_reported"
        assert payload["action_since_previous_photo"] == ""
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(selected)}}]}
        )

    app.state.zen_transport = httpx.MockTransport(respond)
    try:
        response = client.post(
            "/api/guidance",
            data={"demo_id": "adjusted", "mode": "zen"},
            files={
                "previous_image": (
                    "before.png",
                    client.get("/api/demo/initial").content,
                    "image/png",
                )
            },
        )
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["next_action"]["id"] == "finish_check"
        assert result["comparison"]["change"] == "looks_flatter"
        assert result["status"] == "ready"
        assert result["physical_preconditions"] == []
    finally:
        app.state.zen_transport = None


def test_identical_photos_keep_the_prior_shape_and_pause_corrections_without_a_provider_call(
    monkeypatch,
):
    import json

    import httpx

    monkeypatch.delenv("OPENCODE_API_KEY", raising=False)
    prior = {
        "visible_evidence": "A crease in a silver quarter panel below the red light.",
        "dent_region": {"x": 0.3, "y": 0.3, "width": 0.3, "height": 0.4},
        "dent_shape": "crease",
        "assumptions": ["Actual repair actions were not supplied."],
        "confidence": "medium",
        "card_id": "crease_pull",
        "where_to_work": "The crease below the red light.",
        "reason": "The visible creased low remains the next reduction target.",
        "comparison": None,
    }

    def unexpected(request):
        raise AssertionError("Identical photos supply no new visual evidence for a model call")

    app.state.zen_transport = httpx.MockTransport(unexpected)
    photo = client.get("/api/demo/initial").content
    try:
        response = client.post(
            "/api/guidance",
            data={
                "mode": "zen",
                "demo_id": "initial",
                "history": json.dumps(
                    [{"assessment": prior, "action_note": "", "outcome": "not_reported"}]
                ),
            },
            files={"previous_image": ("same.png", photo, "image/png")},
        )
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["status"] == "ready"
        assert result["comparison"]["change"] == "no_visible_change"
        assert result["dent_shape"] == "crease"
        assert result["next_action"]["id"] == "check_remaining"
        assert result["review_method"] == "identical_image_rule"
    finally:
        app.state.zen_transport = None


def test_reported_paint_issue_stops_even_when_provider_is_down(monkeypatch):
    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")

    def unavailable(request):
        raise AssertionError("A reported paint issue must not require the model")

    app.state.zen_transport = httpx.MockTransport(unavailable)
    try:
        response = client.post(
            "/api/guidance",
            data={
                "mode": "zen",
                "demo_id": "initial",
                "outcome": "paint_issue",
                "action_note": "Paint crack noticed.",
            },
        )
        assert response.status_code == 200
        assert response.json()["status"] == "stop"
        assert response.json()["next_action"]["id"] == "stop_paint"
        assert "not been AI-reviewed" in response.json()["visible_evidence"]
    finally:
        app.state.zen_transport = None


def test_identical_photos_without_history_do_not_invent_a_new_correction(monkeypatch):
    monkeypatch.delenv("OPENCODE_API_KEY", raising=False)
    photo = client.get("/api/demo/initial").content
    response = client.post(
        "/api/guidance",
        data={"demo_id": "initial", "mode": "zen"},
        files={"previous_image": ("same.png", photo, "image/png")},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["dent_shape"] == "unclear"
    assert result["next_action"]["id"] == "check_remaining"
    assert result["comparison"]["change"] == "no_visible_change"


def test_optional_user_impressions_do_not_replace_the_systems_current_image_assessment(monkeypatch):
    import json

    import httpx

    monkeypatch.setenv("OPENCODE_API_KEY", "test-key")
    assessment = {
        "visible_evidence": "The silver panel still has a broad visible depression below the light.",
        "dent_region": {"x": 0.3, "y": 0.3, "width": 0.3, "height": 0.4},
        "dent_shape": "broad_low",
        "assumptions": ["The photo does not establish precise shape or paint integrity."],
        "confidence": "medium",
        "card_id": "controlled_pull",
        "where_to_work": "The broad low below the red light.",
        "reason": "A low remains visible in the current image regardless of the optional impression.",
        "comparison": {
            "view_match": "uncertain",
            "change": "cannot_judge",
            "evidence": "The view changed; the current low is assessed independently.",
        },
    }
    app.state.zen_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(assessment)}}]}
        )
    )
    try:
        for impression in ("looks_flatter", "unsure"):
            response = client.post(
                "/api/guidance",
                data={"demo_id": "adjusted", "mode": "zen", "outcome": impression},
                files={
                    "previous_image": (
                        "before.png",
                        client.get("/api/demo/initial").content,
                        "image/png",
                    )
                },
            )
            assert response.status_code == 200, response.text
            assert response.json()["next_action"]["id"] == "controlled_pull"
            assert response.json()["status"] == "proposal"
    finally:
        app.state.zen_transport = None
