import cv2
import numpy as np

DEMOS = {
    "initial": {
        "title": "Initial reflection",
        "note": "A chosen stripe warp, before the illustrative adjustment.",
        "amplitude": 30,
        "camera": 0,
        "light": 0,
    },
    "adjusted": {
        "title": "After illustrative adjustment",
        "note": "A smaller chosen warp. No tool action or metal simulation.",
        "amplitude": 15,
        "camera": 0,
        "light": 0,
    },
    "reassessed": {
        "title": "Second reassessment",
        "note": "A further predetermined warp change, not a measured repair.",
        "amplitude": 7,
        "camera": 0,
        "light": 0,
    },
    "unchanged": {
        "title": "Unchanged control",
        "note": "Exactly the initial pixels. No adjustment.",
        "amplitude": 30,
        "camera": 0,
        "light": 0,
    },
    "camera-shift": {
        "title": "Camera moved",
        "note": "Initial warp with a translated image. Comparison must be blocked.",
        "amplitude": 30,
        "camera": 18,
        "light": 0,
    },
    "light-shift": {
        "title": "Light moved",
        "note": "Initial warp with a changed stripe phase. Comparison must be blocked.",
        "amplitude": 30,
        "camera": 0,
        "light": 16,
    },
}


def render_demo(demo_id: str) -> np.ndarray:
    settings = DEMOS[demo_id]
    h, w = 540, 800
    y, x = np.mgrid[:h, :w].astype(float)
    warp = settings["amplitude"] * np.exp(-(((x - 400) / 120) ** 2 + ((y - 270) / 110) ** 2) / 2)
    phase = (x + warp + settings["light"]) / 44 * 2 * np.pi
    stripe = np.maximum(0, np.cos(phase)) ** 5
    illumination = 0.78 + 0.18 * (1 - (y / h))
    gray = (36 + 202 * stripe) * illumination
    image = np.stack([gray * 1.04, gray, gray * 0.92], axis=-1).clip(0, 255).astype(np.uint8)
    cv2.rectangle(image, (20, 20), (w - 20, h - 20), (100, 108, 110), 2)
    for cx, cy in [(38, 38), (w - 38, 38), (38, h - 38), (w - 38, h - 38)]:
        cv2.rectangle(image, (cx - 7, cy - 7), (cx + 7, cy + 7), (235, 235, 235), -1)
        cv2.rectangle(image, (cx - 3, cy - 3), (cx + 3, cy + 3), (20, 20, 20), -1)
    if settings["camera"]:
        return cv2.warpAffine(
            image,
            np.array([[1, 0, settings["camera"]], [0, 1, 0]], dtype=np.float32),
            (w, h),
            borderMode=cv2.BORDER_REFLECT,
        )
    return image
