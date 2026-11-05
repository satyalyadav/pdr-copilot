# Hosting notes

## Account check, November 5, 2026

Vercel CLI 65.11.0 authenticated as `satyalyadav` and reported the `satyals-projects-12895e1c` team on Hobby, with no linked project here. The connected project list returned seven projects. `vercel billing usage --json --scope satyals-projects-12895e1c` reported that billing cost data was unavailable for November 1–5. This does not establish zero usage or a remaining monthly allowance. No deployment, account upgrade or paid resource was created.

## Vercel

The documented same-domain layout is one Vercel project using [Services](https://vercel.com/docs/services), currently beta on all plans. Define a Vite service rooted at `frontend/` and a FastAPI service that can see the repository-root `pyproject.toml` and `backend` package. Set the FastAPI entrypoint to `backend.app:app`. Set the project framework to Services and use ordered top-level rewrites: `/api/(.*)` to the backend service, then `/(.*)` to the frontend service. The backend receives the original `/api/...` path. The Vite service builds with `npm run build` and serves its `dist` output. Keep each service's build settings within that service. See the [Services guide](https://vercel.com/kb/guide/vercel-services) and [FastAPI entrypoint documentation](https://vercel.com/docs/frameworks/backend/fastapi).

This is a proposed layout, not a verified deployment. Confirm that a root-level backend service and nested frontend service work together with this repository's dependencies and build configuration. The existing backend also has a `/health` route and a root health route; the rewrites above expose `/api/health` but send those other paths to the frontend.

The blocking compatibility issue is the [4.5 MB maximum request body](https://vercel.com/docs/functions/limitations), including all files and multipart overhead. The app currently accepts 12 MB per photo, and a comparison may include multiple photos. Resize or compress in the browser and enforce a safe limit on the complete request before sending; preserve enough detail for useful assessments. This can avoid adding storage, but image quality and the full assessment loop need verification. A 413 response is not useful guidance.

Keep `OPENCODE_API_KEY` in a server-side environment variable, never a Vite client variable or bundle. The current app needs no database or server-side photo store. With Fluid compute, Hobby's documented 300-second maximum duration accommodates a 90-second provider timeout in principle, and the Python bundle limit is 500 MB uncompressed. Actual total duration, native dependencies, bundle size, account allowance and end-to-end behavior remain to be checked. [Function limits](https://vercel.com/docs/functions/limitations).

## Cloudflare alternative

[Cloudflare Containers](https://developers.cloudflare.com/containers/platform/pricing/) can run a conventional Python container with the native dependencies. Containers require the $5/month Workers Paid plan, which includes resource allowances; usage beyond them incurs charges. A Worker can route requests to a container and serve static frontend assets; Cloudflare provides a [static frontend, container backend example](https://developers.cloudflare.com/containers/examples/container-backend/).

Plain Python Workers are a less direct fit. They support pure Python, PyEmscripten wheels and Pyodide packages, not arbitrary native Linux wheels. Check NumPy, OpenCV and Pillow compatibility individually before choosing that route. [Supported Python packages](https://developers.cloudflare.com/workers/languages/python/packages/).
