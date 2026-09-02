# Chili's AI Interview

Voice-first hiring demo for Chili's Grill & Bar. Applicants interview with **Cam**, the GM, in about 10 minutes. Cam scores hospitality, reliability, guest recovery, and rush judgment, then sends a scorecard to the hiring board.

Built by Hearthline. Unofficial demo — not affiliated with Brinker International.

## What it does

1. Applicant picks a station (server, host, bartender, line cook, To-Go, shift manager)
2. Short application, then a live voice interview
3. Floor-call pop-ups test rush judgment mid-conversation
4. Cam writes a scorecard and sends it to the GM board
5. Applicant creates an account for updates; GM signs in to hire / hold / pass

## Stack

TanStack Start, Better Auth (Google, X, email), Postgres (Neon in production, PGLite in preview), xAI Grok for interview + scoring + voice.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` into your environment. Voice and scoring need `XAI_API_KEY`. Production also needs `DATABASE_URL` (Neon) so applications persist across devices.

## Deploy (Vercel)

1. Push this repo to GitHub
2. Import the project in Vercel (build command is `npm run build`)
3. Set environment variables for **Production** and **Preview**:
   - `XAI_API_KEY` — Cam's voice, transcription, scoring
   - `DATABASE_URL` — Neon pooled Postgres URL (accounts + GM board)
4. Redeploy

Without `XAI_API_KEY`, the interview can still be typed. Without `DATABASE_URL`, applications stay on the device that ran them.
