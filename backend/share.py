"""Serve the built app, presentation and API on one local port."""

from pathlib import Path

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import FileResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from backend.app import app as api

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "frontend" / "dist"


async def homepage(request: Request) -> FileResponse:
    return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-store"})


app = Starlette(
    routes=[
        Route("/", homepage),
        Mount("/presentation", StaticFiles(directory=ROOT / "presentation", html=True)),
        Mount("/assets", StaticFiles(directory=DIST / "assets")),
        Route("/api/{path:path}", endpoint=api),
    ]
)
