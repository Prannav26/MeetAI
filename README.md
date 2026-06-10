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

- **Node.js** 18.x or later
- **npm** or **yarn**
- **PostgreSQL** database (local or cloud — Neon recommended)
- **OpenAI API key** (for AI-powered MOM generation)
- A modern browser that supports the **Web Speech API** (Chrome, Edge, or Safari)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Prannav26/MeetAI.git
cd meetai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/meetai?sslmode=require"

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

```bash
npm run dev
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
