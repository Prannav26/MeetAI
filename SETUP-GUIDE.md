# MeetAI - Setup Guide

## Quick Start (5 minutes)

### 1. Install Prerequisites

- **Node.js** v18+ → https://nodejs.org
- **Bun** → https://bun.sh (install via: `curl -fsSL https://bun.sh/install | bash`)

### 2. Extract & Install

```bash
# Extract the zip
unzip MeetAI-Project.zip -d Meetai

# Go into the project
cd Meetai

# Install all dependencies
bun install
```

### 3. Setup Database

```bash
# Generate Prisma client
bun run db:generate

# Create database tables
bun run db:push
```

### 4. Run the App

```bash
# Start dev server
bun run dev
```

### 5. Open in Browser

Go to **http://localhost:3000** in **Google Chrome** or **Microsoft Edge**

> Speech Recognition only works in Chrome/Edge. Firefox/Safari won't support live transcription.

---

## Features

- **Live Transcription** — Real-time speech-to-text during meetings
- **AI MOM Generation** — Auto-generate Minutes of Meeting using AI
- **PDF Export** — Download professional MOM as PDF
- **Meeting History** — View and manage past meetings

## Tech Stack

- Next.js 16 + TypeScript
- Prisma + SQLite (no external DB needed!)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- Framer Motion (animations)
- Web Speech API (browser transcription)
- jsPDF (PDF generation)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              ← Main UI
│   ├── layout.tsx            ← Root layout
│   ├── globals.css           ← Styling
│   └── api/meetings/         ← REST API
│       ├── route.ts          ← List/Create meetings
│       └── [id]/
│           ├── route.ts      ← Get/Update/Delete
│           ├── generate-mom/ ← AI MOM generation
│           └── pdf/          ← PDF download
├── components/ui/            ← UI components
├── hooks/
│   └── use-speech-recognition.ts
├── lib/
│   ├── db.ts                 ← Prisma client
│   ├── mom-generator.ts      ← AI MOM logic
│   └── pdf-generator.ts      ← PDF builder
└── store/
    └── meeting-store.ts      ← State management
```

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Build for production |
| `bun run start` | Run production build |
| `bun run db:push` | Push schema to database |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:reset` | Reset database |

## Troubleshooting

- **"Speech Recognition not supported"** → Use Chrome or Edge browser
- **"Microphone access denied"** → Allow mic permission in browser settings
- **Database errors** → Run `bun run db:push` to create/migrate tables
- **Port 3000 in use** → Kill the process or change port: `bun run dev -- -p 3001`
