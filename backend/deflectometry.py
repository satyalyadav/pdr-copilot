"""A virtual pinhole camera, phase-pattern screen and reflective dented panel.

Rendering uses the law of reflection. Reconstruction receives only the captured
patterns and calibration, with a flat panel boundary as its height reference.
"""

from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import cv2
import numpy as np

from backend.knowledge import CARDS, PHYSICAL_PRECONDITIONS, SOURCES
from backend.vision import data_url

Stage = Literal["original", "improved", "unchanged"]


@dataclass(frozen=True)
class Calibration:
    width: int = 384
    height: int = 288
    pixel_scale_mm: float = 160 / 384
    camera_z_mm: float = 400
    screen_z_mm: float = 600
    screen_width_mm: float = 500
    screen_height_mm: float = 400
    fine_periods: int = 16

    def reference_grid(self):
        x = (np.arange(self.width) - self.width / 2) * self.pixel_scale_mm
        y = (np.arange(self.height) - self.height / 2) * self.pixel_scale_mm
        return np.meshgrid(x, y)


def _surface(x, y, depth_mm):
    radius = (x / 35) ** 2 + (y / 28) ** 2
    inside = radius < 1
    height = np.zeros_like(x)
    dx, dy = np.zeros_like(x), np.zeros_like(x)
    remaining = 1 - radius[inside]
    bump = np.exp(1 - 1 / remaining)
    height[inside] = -depth_mm * bump
    dx[inside] = depth_mm * bump * 2 * x[inside] / (35**2 * remaining**2)
    dy[inside] = depth_mm * bump * 2 * y[inside] / (28**2 * remaining**2)
    return height, dx, dy


def _unit(vectors):
    return vectors / np.linalg.norm(vectors, axis=-1, keepdims=True)


def render_patterns(depth_mm: float, calibration: Calibration):
    """Ray trace a smooth compact dent; return 16 grayscale captures and truth."""
    c = calibration
    x0, y0 = c.reference_grid()
    z = np.zeros_like(x0)
    # Intersect each calibrated camera ray with the prescribed height field.
    for _ in range(10):
        x, y = x0 * (1 - z / c.camera_z_mm), y0 * (1 - z / c.camera_z_mm)
        z, _, _ = _surface(x, y, depth_mm)
    x, y = x0 * (1 - z / c.camera_z_mm), y0 * (1 - z / c.camera_z_mm)
    _, p, q = _surface(x, y, depth_mm)
    normal = _unit(np.stack((-p, -q, np.ones_like(z)), axis=-1))
    view = _unit(np.stack((-x, -y, c.camera_z_mm - z), axis=-1))
    reflected = 2 * np.sum(normal * view, axis=-1, keepdims=True) * normal - view
    if np.any(reflected[..., 2] <= 0):
        raise ValueError("The reflected ray misses the virtual screen")
    travel = (c.screen_z_mm - z) / reflected[..., 2]
    screen_x = x + travel * reflected[..., 0]
    screen_y = y + travel * reflected[..., 1]
    fractions = (
        screen_x / c.screen_width_mm + 0.5,
        screen_y / c.screen_height_mm + 0.5,
    )
    if any(np.any((fraction <= 0) | (fraction >= 1)) for fraction in fractions):
        raise ValueError("The pattern falls outside the virtual screen")
    captures = np.empty((2, 2, 4, c.height, c.width), dtype=np.uint8)
    for axis, fraction in enumerate(fractions):
        for frequency, periods in enumerate((1, c.fine_periods)):
            for shift in range(4):
                intensity = 127.5 + 110 * np.cos(2 * np.pi * periods * fraction + shift * np.pi / 2)
                captures[axis, frequency, shift] = np.rint(intensity).astype(np.uint8)
    return captures, z


def _decode_screen(captures, calibration):
    coordinates = []
    for axis, extent in enumerate((calibration.screen_width_mm, calibration.screen_height_mm)):
        phases = []
        for frequency in range(2):
            frames = captures[axis, frequency].astype(np.float32)
            phases.append(cv2.phase(frames[0] - frames[2], frames[3] - frames[1]))
        coarse, fine = phases
        order = np.rint((coarse * calibration.fine_periods - fine) / (2 * np.pi))
        fraction = (fine + order * 2 * np.pi) / (2 * np.pi * calibration.fine_periods)
        coordinates.append((fraction.astype(float) - 0.5) * extent)
    return coordinates


def _integrate_slopes(p, q, spacing):
    """Least-squares Fourier integration, anchored at the known flat boundary."""
    height, width = p.shape
    kx = 2 * np.pi * np.fft.fftfreq(width, d=spacing)[None, :]
    ky = 2 * np.pi * np.fft.fftfreq(height, d=spacing)[:, None]
    denominator = kx**2 + ky**2
    denominator[0, 0] = 1
    spectrum = (-1j * kx * np.fft.fft2(p) - 1j * ky * np.fft.fft2(q)) / denominator
    spectrum[0, 0] = 0
    z = np.fft.ifft2(spectrum).real
    return z - np.median(np.concatenate((z[0], z[-1], z[:, 0], z[:, -1])))


def reconstruct(captures: np.ndarray, calibration: Calibration) -> np.ndarray:
    """Recover height from pattern images; no prescribed dent shape is supplied."""
    c = calibration
    if captures.shape != (2, 2, 4, c.height, c.width) or captures.dtype != np.uint8:
        raise ValueError("Expected 16 calibrated grayscale pattern captures")
    screen_x, screen_y = _decode_screen(captures, c)
    x0, y0 = c.reference_grid()
    z = np.zeros_like(x0)
    for _ in range(12):
        scale = 1 - z / c.camera_z_mm
        x, y = x0 * scale, y0 * scale
        view = _unit(np.stack((-x, -y, c.camera_z_mm - z), axis=-1))
        light = _unit(np.stack((screen_x - x, screen_y - y, c.screen_z_mm - z), axis=-1))
        normal = light + view
        p, q = -normal[..., 0] / normal[..., 2], -normal[..., 1] / normal[..., 2]
        # Convert surface slopes to derivatives on the camera's reference grid.
        jacobian = scale / (1 + (p * x0 + q * y0) / c.camera_z_mm)
        z = _integrate_slopes(p * jacobian, q * jacobian, c.pixel_scale_mm)
    return z


@lru_cache(maxsize=3)
def precision_demo(stage: Stage) -> dict:
    calibration = Calibration()
    original_frames, _ = render_patterns(2.0, calibration)
    frames, known = render_patterns(0.6 if stage == "improved" else 2.0, calibration)
    estimated = reconstruct(frames, calibration)
    estimated_depth = max(0.0, -float(estimated.min()))
    unchanged = stage != "original" and np.array_equal(frames, original_frames)
    comparison = "Original dent, before the scripted change."
    if unchanged:
        comparison = "No visible change. These are the original images again."
    elif stage != "original":
        original_depth = -float(reconstruct(original_frames, calibration).min())
        comparison = (
            "The reconstructed low is shallower than in the original capture."
            if estimated_depth < original_depth
            else "The reconstruction does not show a reduction in depth."
        )
    card = CARDS["check_remaining" if unchanged else "controlled_pull"]
    row = calibration.height // 2
    return {
        "stage": stage,
        "synthetic": True,
        "reflection": data_url(frames[0, 1, 0]),
        "estimated_depth_mm": round(estimated_depth, 3),
        "known_depth_mm": round(-float(known.min()), 3),
        "reconstruction_rmse_mm": round(float(np.sqrt(np.mean((estimated - known) ** 2))), 5),
        "comparison": comparison,
        "profile": {
            "position_mm": calibration.reference_grid()[0][row].round(2).tolist(),
            "estimated_mm": estimated[row].round(4).tolist(),
            "known_mm": known[row].round(4).tolist(),
        },
        "next_action": card,
        "physical_preconditions": PHYSICAL_PRECONDITIONS,
        "sources": [source for source in SOURCES if source["id"] in card["source_ids"]],
        "calibration": {
            "camera_height_mm": calibration.camera_z_mm,
            "focal_length_px": calibration.camera_z_mm / calibration.pixel_scale_mm,
            "screen_height_mm": calibration.screen_z_mm,
            "screen_size_mm": [calibration.screen_width_mm, calibration.screen_height_mm],
            "panel_size_mm": [160, 120],
            "pattern_images": 16,
            "height_reference": "The outer panel boundary is flat at zero height.",
        },
    }
