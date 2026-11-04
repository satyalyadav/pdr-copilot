import base64
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field, model_validator

MAX_BYTES = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


class Region(BaseModel):
    x: float = Field(default=0.28, ge=0, le=0.95)
    y: float = Field(default=0.22, ge=0, le=0.95)
    width: float = Field(default=0.44, ge=0.05, le=1)
    height: float = Field(default=0.56, ge=0.05, le=1)

    @model_validator(mode="after")
    def inside_image(self):
        if self.x + self.width > 1.001 or self.y + self.height > 1.001:
            raise ValueError("The inspection region must fit inside the image.")
        return self


def data_url(image: np.ndarray) -> str:
    ok, encoded = cv2.imencode(".png", image)
    if not ok:
        raise ValueError("Could not encode the image.")
    return "data:image/png;base64," + base64.b64encode(encoded).decode()


def decode_image(raw: bytes) -> np.ndarray:
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("Choose an image smaller than 12 MB.")
    try:
        with Image.open(BytesIO(raw)) as image:
            if image.width * image.height > 20_000_000:
                raise ValueError("Choose an image with at most 20 million pixels.")
            if image.format not in {"PNG", "JPEG", "WEBP"}:
                raise ValueError("Use a PNG, JPEG, or WebP image.")
            oriented = ImageOps.exif_transpose(image).convert("RGB")
            oriented.thumbnail((960, 720))
            return cv2.cvtColor(np.array(oriented), cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("The file could not be read as a PNG, JPEG, or WebP image.") from exc


def observe(image: np.ndarray, region: Region) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    x0, y0 = int(region.x * w), int(region.y * h)
    x1, y1 = int((region.x + region.width) * w), int((region.y + region.height) * h)
    threshold = float(np.percentile(gray, 80))
    binary = (gray > max(threshold, 110)).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    residuals = []
    tracks = 0
    marked_points = 0
    for label in range(1, count):
        _sx, _sy, sw, sh, area = stats[label]
        if sh < h * 0.65 or sw > w * 0.3 or area < h:
            continue
        ys, xs = [], []
        for y in range(4, h - 4, 6):
            row = np.flatnonzero(labels[y] == label)
            if row.size:
                ys.append(y)
                xs.append(float(np.median(row)))
        ya, xa = np.array(ys), np.array(xs)
        outside = (ya < y0) | (ya > y1)
        if outside.sum() < 8:
            continue
        coefficients = np.polyfit(ya[outside], xa[outside], 1)
        expected = np.polyval(coefficients, ya)
        selected = (ya >= y0) & (ya <= y1) & (xa >= x0) & (xa <= x1)
        if not selected.any():
            continue
        tracks += 1
        for y, x, reference in zip(ya[selected], xa[selected], expected[selected]):
            deviation = abs(float(x - reference))
            residuals.append(deviation)
            if deviation > 1.5:
                cv2.circle(overlay, (round(x), int(y)), 3, (40, 188, 255, 220), -1)
                marked_points += 1
    if tracks < 3:
        state = "insufficient"
        summary = "Too few continuous vertical reflection stripes to fit a reference. Inspect the photo visually and capture a clearer stripe pattern."
    else:
        state = "observable"
        summary = "Highlighted points show reflection stripes departing from a straight reference fitted above and below your selection. They identify an inspection region, not a physical correction."
    return {
        "state": state,
        "summary": summary,
        "tracked_stripes": tracks,
        "mean_deviation_px": round(float(np.mean(residuals)), 2) if residuals else None,
        "marked_points": marked_points,
        "reference": "Straight line fitted to each bright stripe above and below the selected region. Panel curvature and lighting can also create residuals.",
        "overlay": data_url(overlay),
    }
