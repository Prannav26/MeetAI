# MeetAI — AI-Powered Meeting Assistant

MeetAI is a full-stack web application that automates the generation of structured Minutes of Meeting (MOM) documents from live meeting transcripts using real-time speech recognition and AI. No more manual note-taking — just start a meeting, speak naturally, and let MeetAI handle the rest.

---

## Features

- **Real-Time Transcription** — Captures speech live using the browser-native Web Speech API with zero latency and no external audio services
- **AI-Powered MOM Generation** — Uses OpenAI GPT-4o to extract executive summaries, action items, decisions, discussion topics, and participant contributions
- **Template-Based Fallback** — Keyword extraction engine that works even when the AI API is unavailable, ensuring MOM generation is never blocked
- **Three-Stage Workflow** — Setup → Live Recording → MOM Review, with inline editing at every step
- **Inline Note-Taking** — Add personal annotations to the transcript in real time during the meeting
- **One-Click PDF Export** — Generate professionally formatted MOM reports with branded headers, styled tables, and priority-coded action items
- **Priority-Coded Action Items** — Action items are automatically classified as High, Medium, or Low priority with visual indicators
- **Persistent Storage** — All meeting data is stored in PostgreSQL with full relational integrity across Meetings, Participants, Action Items, Decisions, and Topics

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Neon Serverless) |
| AI Engine | OpenAI GPT-4o |
| Speech Recognition | Web Speech API (Browser-Native) |
| PDF Generation | jsPDF |
| Deployment | Vercel |

---

## Prerequisites

- **Bun** (recommended) or Node.js 18.x+
- **OpenAI API key** (for AI-powered MOM generation)
- A modern browser that supports the **Web Speech API** (Chrome or Edge recommended)


---

## Getting Started
### 1. Clone the Repository

```bash
git clone https://github.com/Prannav26/meetai.git
cd MeetAI
```

### 2. Install Dependencies

```bash
bun install
```

> If you prefer npm, you can use `npm install` instead.

### 3. Set Up Environment Variables

Create a `.env` file in the project root and add:

```env
# Database (SQLite — file is auto-created in db/custom.db)
DATABASE_URL="file:./db/custom.db"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set Up the Database

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
```

Generate the Prisma client:

```bash
npx prisma generate
```

### 5. Start the Development Server

Using Bun:
```bash
bun run dev
```

Or using the dev script:
```bash
bash .zscripts/dev.sh
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---


## Browser Compatibility

The Web Speech API is supported in:
- Google Chrome (desktop & Android) — Full support
- Microsoft Edge — Full support
- Safari (macOS & iOS) — Partial support
- Firefox — Not supported (fallback: manual text input)

For the best experience, use Chrome or Edge.

---
