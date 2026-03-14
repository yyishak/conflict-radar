# Zeldit Conflict Radar

A high-tech, real-time intelligence dashboard monitoring conflict, hazards, and economic indicators in Ethiopia and globally. Built for high-veracity surveillance and diagnostic investigation.

## Features
- **3D Global View**: Interactive globe with atmospheric cyan glow and kinetic event markers.
- **Thematic Intelligence**: Ground-truth monitoring of War, Disaster, Politics, Oil, and Inflation vectors.
- **Live Scrapers**: Automated ingestion from Al Jazeera, BBC, and Ethiopia Observer (Ground Truth).
- **Sentiment Engine**: Heuristic analysis of regional vibe and stability indices.
- **Diagnostic Alerts**: Nested info reveal for deep investigative reports.
- **Economic Intel**: Real-time tracking of Official/Parallel exchange rates and fuel scarcity.

## Tech Stack
- **Frontend**: Next.js 16 (Turbopack), Tailwind CSS, react-globe.gl, Supabase Client.
- **Backend**: Python 3, FastAPI, Heuristic Sentiment Engine, Multi-source Scrapers.
- **Database**: Supabase (PostgreSQL + Realtime).

## Setup
1. **Frontend**: `cd frontend && npm install && npm run dev`
2. **Backend**: `cd backend && pip install -r requirements.txt && python backend/antigravity/fetcher/main.py`
