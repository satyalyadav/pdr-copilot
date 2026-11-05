import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.deflectometry import Calibration, reconstruct, render_patterns

client = TestClient(app)


def test_calibrated_demo_recovers_the_prescribed_dent_without_provider_credentials(monkeypatch):
    monkeypatch.delenv("OPENCODE_API_KEY", raising=False)
    response = client.get("/api/precision-demo")
    assert response.status_code == 200
    result = response.json()
    assert result["synthetic"] is True
    assert result["estimated_depth_mm"] == pytest.approx(2.0, abs=0.02)
    assert result["reconstruction_rmse_mm"] < 0.01
    assert result["reflection"].startswith("data:image/png;base64,")
    assert result["calibration"]["pattern_images"] == 16
    assert len(result["profile"]["position_mm"]) == len(result["profile"]["estimated_mm"])


def test_scripted_improvement_and_unchanged_control_are_measured():
    original = client.get("/api/precision-demo").json()
    improved = client.get("/api/precision-demo?stage=improved").json()
    unchanged = client.get("/api/precision-demo?stage=unchanged").json()
    assert improved["estimated_depth_mm"] == pytest.approx(0.6, abs=0.02)
    assert improved["estimated_depth_mm"] < original["estimated_depth_mm"]
    assert unchanged["reflection"] == original["reflection"]
    assert unchanged["profile"] == original["profile"]
    assert unchanged["estimated_depth_mm"] == original["estimated_depth_mm"]
    assert unchanged["next_action"]["id"] == "check_remaining"
    assert "No visible change" in unchanged["comparison"]
    assert client.get("/api/precision-demo?stage=invented").status_code == 422


def test_reconstruction_uses_images_for_unlisted_depths_and_resolution():
    # New amplitudes and image dimensions catch a canned lookup or profile.
    calibration = Calibration(width=192, height=144, pixel_scale_mm=160 / 192)
    for depth in (0.0, 0.9, 1.3):
        images, _ = render_patterns(depth, calibration)
        recovered = reconstruct(images, calibration)
        assert -float(recovered.min()) == pytest.approx(depth, abs=0.02)


def test_noisy_images_change_the_estimate_without_losing_the_dent():
    calibration = Calibration(width=192, height=144, pixel_scale_mm=160 / 192)
    images, _ = render_patterns(1.3, calibration)
    clean = reconstruct(images, calibration)
    noise = np.random.default_rng(12).normal(0, 2, images.shape)
    noisy = reconstruct(np.clip(images.astype(float) + noise, 0, 255).astype(np.uint8), calibration)
    assert not np.array_equal(clean, noisy)
    assert -float(noisy.min()) == pytest.approx(1.3, abs=0.04)


def test_missing_pattern_frames_are_rejected():
    calibration = Calibration(width=192, height=144, pixel_scale_mm=160 / 192)
    images, _ = render_patterns(0.9, calibration)
    with pytest.raises(ValueError, match="16 calibrated"):
        reconstruct(images[:, :, :3], calibration)
