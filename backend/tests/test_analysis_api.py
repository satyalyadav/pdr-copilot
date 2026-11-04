from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_unchanged_image_does_not_claim_repair_progress():
    response = client.post(
        "/api/analyze", data={"demo_id": "initial", "previous_demo_id": "initial"}
    )
    assert response.status_code == 200
    result = response.json()
    assert result["comparison"]["status"] == "unchanged"
    assert result["comparison"]["mean_absolute_difference"] == 0
    assert result["provenance"] == "synthetic"
    assert result["observation"]["tracked_stripes"] >= 3
    assert result["overlay"].startswith("data:image/png;base64,")
    assert "depth" not in result["observation"]


def test_camera_or_light_motion_blocks_comparison():
    for demo_id in ["camera-shift", "light-shift"]:
        response = client.post(
            "/api/analyze", data={"demo_id": demo_id, "previous_demo_id": "initial"}
        )
        assert response.status_code == 200
        result = response.json()
        assert result["comparison"]["status"] == "blocked"
        assert result["comparison"]["mean_absolute_difference"] is None


def test_uploaded_images_cannot_claim_verified_capture_conditions():
    initial = client.get("/api/demo/initial").content
    adjusted = client.get("/api/demo/adjusted").content
    response = client.post(
        "/api/analyze",
        files={
            "image": ("current.png", adjusted, "image/png"),
            "previous_image": ("previous.png", initial, "image/png"),
        },
    )
    assert response.status_code == 200
    assert response.json()["comparison"]["status"] == "unverified"


def test_fixed_synthetic_sequence_localizes_changed_reflections():
    before = client.post("/api/analyze", data={"demo_id": "initial"}).json()
    after = client.post(
        "/api/analyze", data={"demo_id": "adjusted", "previous_demo_id": "initial"}
    ).json()
    assert after["comparison"]["status"] == "comparable"
    assert after["comparison"]["mean_absolute_difference"] > 0
    assert before["observation"]["mean_deviation_px"] > after["observation"]["mean_deviation_px"]
    assert before["observation"]["marked_points"] > 0


def test_bad_image_and_out_of_bounds_selection_are_rejected():
    assert (
        client.post(
            "/api/analyze", files={"image": ("bad.png", b"not an image", "image/png")}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/analyze", data={"demo_id": "initial", "region": '{"x":0.9,"width":0.5}'}
        ).status_code
        == 422
    )


def test_different_original_dimensions_are_not_hidden_by_thumbnail_resizing():
    from io import BytesIO

    from PIL import Image

    def png(size):
        out = BytesIO()
        Image.new("RGB", size, (100, 100, 100)).save(out, format="PNG")
        return out.getvalue()

    response = client.post(
        "/api/analyze",
        files={
            "image": ("current.png", png((2400, 1620)), "image/png"),
            "previous_image": ("previous.png", png((1600, 1080)), "image/png"),
        },
    )
    assert response.status_code == 200
    assert response.json()["comparison"]["status"] == "blocked"


def test_a_change_lost_in_resizing_is_not_reported_as_identical_original_pixels():
    from io import BytesIO

    from PIL import Image

    image = Image.new("RGB", (1600, 1080), (100, 100, 100))
    previous = BytesIO()
    image.save(previous, format="PNG")
    image.putpixel((800, 540), (101, 100, 100))
    current = BytesIO()
    image.save(current, format="PNG")
    response = client.post(
        "/api/analyze",
        files={
            "image": ("current.png", current.getvalue(), "image/png"),
            "previous_image": ("previous.png", previous.getvalue(), "image/png"),
        },
    )
    assert response.status_code == 200
    assert response.json()["comparison"]["status"] == "unverified"


def test_comparable_synthetic_captures_describe_and_highlight_the_selected_change():
    response = client.post(
        "/api/analyze", data={"demo_id": "adjusted", "previous_demo_id": "initial"}
    )
    result = response.json()
    assert response.status_code == 200
    assert (
        result["comparison"]["region_mean_absolute_difference"]
        > result["comparison"]["outside_mean_absolute_difference"]
    )
    assert (
        result["comparison"]["previous_deviation_px"] > result["comparison"]["current_deviation_px"]
    )
    assert result["change_overlay"].startswith("data:image/png;base64,")
