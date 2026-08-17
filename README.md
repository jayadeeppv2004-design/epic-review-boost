# EPIC Review Boost

Google review gamification platform for **EPIC Toyota** (4 Chennai showrooms).
Phase-1 MVP built to the PRD — employee QR codes, tracked scan/review-click
logging, a live leaderboard, 9:16 QR posters, and WhatsApp click-to-chat delivery.

## How it works (PRD §3, §7.3)

```
Employee QR → /r/{code}  → logs SCAN → branded interstitial
            → /go/{code} → logs REVIEW_CLICK → 302 → showroom's Google review page
```

Google never reveals which review came from which QR, so the platform tracks
**scans** and **review-clicks** per employee as a proxy for effort, and lets you
record the official review total per showroom separately to calibrate.

## Stack

| Layer     | Choice                          | PRD §7 target              |
|-----------|---------------------------------|----------------------------|
| Framework | Next.js 14 (App Router, TS)     | same                       |
| Database  | **Supabase (PostgreSQL)** via Prisma | same                  |
| Auth      | signed-cookie admin login       | Supabase Auth              |
| QR poster | `qrcode` + `sharp` (9:16 PNG)   | same                       |
| WhatsApp  | `wa.me` click-to-chat           | + Business API (Phase 4)   |

## Setup

1. `npm install`
2. In `.env`, set `DATABASE_URL` (Supabase Transaction pooler, port 6543) and
   `DIRECT_URL` (Session/direct, port 5432) from **Supabase → Project Settings →
   Database → Connection string**.
3. Create the tables in Supabase and seed the four showrooms (no demo data):

```bash
npm run db:push      # create tables in Supabase
npm run db:seed      # 4 real showrooms, blank review URLs
npm run dev          # http://localhost:3000
```

Sign in at `/login` with **admin@epictoyota.in / epic-admin** (change in `.env`).

> `npm run db:reset` drops and recreates all tables in Supabase, then reseeds the
> four showrooms — use it to wipe everything back to a clean state.

### Testing real phone scans

QR codes encode `NEXT_PUBLIC_BASE_URL`. `localhost` only works on this machine —
to scan from a phone, expose the app publicly (e.g. `ngrok http 3000`), set
`NEXT_PUBLIC_BASE_URL` to that URL, and regenerate/re-open the QR.

## Configure before launch (PRD §12)

1. **Showrooms tab** — paste each showroom's real Google Place ID / review URL.
2. **Employees tab** — add the real roster (or edit the seed).
3. Set a strong `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`.

## Google policy guardrail (PRD §8)

Reward **employees** for scans/effort and simply **ask every customer**. Never
incentivize or gate reviewers — Google filters incentivized reviews and penalizes
profiles.

## Project map

- `prisma/schema.prisma` — data model (§6)
- `src/app/r/[code]` + `src/app/go/[code]` — tracked redirect + scan logging (§5.4)
- `src/lib/poster.ts` — 9:16 QR poster generation (§5.3)
- `src/app/dashboard` — overview/leaderboard, employees, showrooms (§5.6)
- `src/lib/stats.ts` — shared leaderboard/summary computation (date-range + showroom scope)
- `src/app/api` — employees, showrooms, stats, qr, snapshots, export, auth
- `src/app/api/export` — multi-sheet Excel (.xlsx) export via `exceljs`
- `src/lib/wa.ts` — WhatsApp click-to-chat messages (§5.5, Appendix A)
```

## Filters & Excel export

- **Leaderboard** (Overview) and **Employees** list each have a per-showroom
  filter; the leaderboard re-ranks within the selected showroom.
- **Export to Excel** on both pages downloads a `.xlsx` workbook with four sheets
  (Summary, Leaderboard, Employees, Showrooms). The export respects the current
  date-range and showroom filter, so you can export one showroom's data alone.
