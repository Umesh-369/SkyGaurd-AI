# SkyGuard AI — Production Cloud Deployment Guide (Render + Vercel)

This runbook guides you through deploying **SkyGuard AI** to the cloud:
- **Backend API & ML Engine & WebSockets**: Deployed to [Render](https://render.com)
- **Frontend SPA Web Application**: Deployed to [Vercel](https://vercel.com)

---

## Architecture Overview

```
       ┌────────────────────────────────────────────────────────┐
       │                  Vercel (Frontend)                    │
       │  React 18 + Vite + TailwindCSS + Three.js + Zustand   │
       │  Hosted at: https://skyguard-ai.vercel.app            │
       └─────────────────────────┬──────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
       REST API Calls                          Live WebSocket
   (fetch `/api/...`)                       (wss://.../ws/readings)
              │                                     │
              ▼                                     ▼
       ┌────────────────────────────────────────────────────────┐
       │                   Render (Backend)                     │
       │  FastAPI + Uvicorn + IsolationForest + SHAP Explainer  │
       │  Hosted at: https://skyguard-backend.onrender.com     │
       └────────────────────────────────────────────────────────┘
```

---

## Part 1: Deploy Backend to Render

### Option A: Standard Render Web Service (Recommended)

1. **Push your code to GitHub / GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository: `SkyGaurd_AI`.
5. Configure the service settings:
   - **Name**: `skyguard-ai-backend` (or your preferred name)
   - **Region**: Choose the closest region (e.g. `Singapore` or `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root of repo)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (or Starter for 24/7 non-sleeping instance)
6. Expand **Advanced** and set Environment Variables:
   | Key | Recommended Value | Notes |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Required for dependency matching |
   | `PROJECT_NAME` | `SkyGuard AI — Intelligent AWS Anomaly Detection` | Backend title |
   | `MONGODB_URI` | *Optional* (e.g., MongoDB Atlas URI) | If omitted, uses fast in-memory store |
   | `ALERT_COOLDOWN_SECONDS` | `300` | Alert deduplication window |
7. Set **Health Check Path**: `/api/health`.
8. Click **Create Web Service**.
9. Once deployed, note down your Render backend URL (e.g., `https://skyguard-ai-backend.onrender.com`).

---

### Option B: Using Render Blueprint (`render.yaml`)

Because `render.yaml` is included in the project root:
1. In Render Dashboard, click **New +** → **Blueprint**.
2. Connect the `SkyGaurd_AI` repository.
3. Render will automatically detect `render.yaml` and configure the Python web service, health checks, and build steps.
4. Click **Apply**.

---

### Verifying Backend Deployment

Once Render displays "Live":
1. Open your browser and visit: `https://<YOUR-RENDER-BACKEND-URL>/`
   - You should see:
     ```json
     {
       "message": "Welcome to SkyGuard AI API Server",
       "service": "SkyGuard AI — Intelligent AWS Anomaly Detection Platform",
       "version": "2.0.0",
       "docs": "/docs",
       "health": "/api/health",
       "websocket": "/ws/readings"
     }
     ```
2. Visit `https://<YOUR-RENDER-BACKEND-URL>/docs` for interactive Swagger UI.
3. Visit `https://<YOUR-RENDER-BACKEND-URL>/api/health` to verify model loading & schema validation status.

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `SkyGaurd_AI`.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend` (or leave default if importing the monorepo root — `vercel.json` will route appropriately).
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `dist` (or leave default)
5. Expand **Environment Variables** and add:
   | Variable Name | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://<YOUR-RENDER-BACKEND-URL>` | Example: `https://skyguard-ai-backend.onrender.com` (no trailing slash) |
   | `VITE_WS_URL` | *Optional* | If not specified, automatically derived as `wss://<YOUR-RENDER-BACKEND-URL>/ws/readings` |
6. Click **Deploy**.

---

## Part 3: Verification & Live Testing

1. Open your new Vercel URL (e.g. `https://skyguard-ai.vercel.app`).
2. Verify the following:
   - **WebSocket Connection**: The top bar / status badge shows `WebSocket connected` with green pulsing dot.
   - **Live Telemetry Stream**: The AWS station cards (Panaji, Margao, Vasco, Mapusa, etc.) update every ~1s with live readings.
   - **Simulator Studio**: Test the *Start Simulation*, *Fault Injection* (e.g. Drift, Spike, Stuck), and *Clear Faults* controls.
   - **Disaster Risk Engine**: Check real-time cyclone, flash flood, and heatwave risk evaluations.
   - **Explainable AI (SHAP)**: Inspect feature contribution bars when an anomaly is detected.
   - **SPA Route Refresh**: Navigate to `/anomalies`, `/analytics`, `/risks`, or `/settings` and press `F5` / Refresh — page should reload cleanly without 404.

---

## Troubleshooting & Tips

### 1. Render Free Tier Cold Start
- Render's free tier puts backend instances to sleep after 15 minutes of inactivity.
- The first request after a sleep period may take ~30-40 seconds to wake up.
- *Solution*: Set up a free ping monitor (e.g. [UptimeRobot](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org)) to hit `https://<YOUR-RENDER-BACKEND-URL>/api/health` every 10 minutes to keep it warm.

### 2. Mixed Content (HTTPS vs HTTP)
- Because Vercel serves via HTTPS (`https://...`), the backend URL **must** use `https://` and WebSocket must use `wss://`.
- SkyGuard's `getApiUrl()` and `getWsUrl()` dynamically handle this transformation automatically.

### 3. Updating Code
- Any `git push` to your main branch will automatically trigger redeployments on both Render and Vercel!
