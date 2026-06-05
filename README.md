# Ikonex Academy — Student Management System

A full-stack web application for managing class streams, students, subjects, scores, results, and PDF reports for Ikonex Academy.

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | React 19, Vite, Ant Design, Recharts |
| Backend    | Node.js, Express                   |
| Database   | PostgreSQL (via Prisma ORM)        |
| PDF        | PDFKit                             |
| Deployment | Railway (backend), Vercel (frontend) |

---

## Features

- **Class Stream Management** — Create and manage streams (e.g., Form 1A, Form 1B)
- **Student Management** — Register, edit, delete students; assign to streams; bulk CSV import
- **Subject Management** — CRUD for subjects; assign subjects to streams
- **Scores** — Record EXAM (70 marks) and CAT (30 marks) per student per subject; bulk entry mode; duplicate prevention
- **Results Processing** — Auto-calculates totals, averages, grades, subject positions, and class rankings with tie handling
- **Configurable Grading Scale** — Set grade bands (A, B+, B, …, E) with points via the UI
- **PDF Reports** — Individual student report cards and full class performance reports

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ikonex-sms
```

### 2. Set up the backend

```bash
cd server
cp .env.example .env
```

Edit `.env` and set your database URL:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ikonex_sms?schema=public"
PORT=5000
```

Install dependencies and run migrations:

```bash
npm install
npx prisma migrate dev --name init
npm run seed          # loads default grading scales (A through E)
npm run dev           # starts on http://localhost:5000
```

### 3. Set up the frontend

```bash
cd ../client
cp .env.example .env
```

Edit `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

Install and start:

```bash
npm install
npm run dev           # starts on http://localhost:5173
```

---

## Running Tests

Tests use Jest + Supertest with a mocked Prisma client — no live database required.

```bash
cd server
npm test                  # run all tests
npm run test:coverage     # run with coverage report
```

Test coverage includes:
- Stream CRUD (create, read, update, delete, 404, duplicate 409)
- Student CRUD (create, read, update, delete, stream filter, duplicate admission number)
- Subject CRUD + stream assignment
- Score entry (EXAM/CAT, duplicate prevention, validation, marks > maxMarks)
- Results computation (unit tests for `computeSubjectResults`, `computeOverall`, `assignPositions`)
- Results API (student results with grade/position, stream rankings)
- Grading scale CRUD + validation

---

## Deployment

### Backend — Render

The repo includes `render.yaml` at the root, which Render reads to create both the web service and a free PostgreSQL database automatically.

1. Push the repository to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repository — Render detects `render.yaml` and provisions:
   - A **Node.js web service** (`ikonex-sms-api`) in the `server/` directory
   - A **free PostgreSQL database** (`ikonex-sms-db`) with `DATABASE_URL` injected automatically
4. Click **Apply** — the build runs `npm install && npx prisma generate && npx prisma migrate deploy` automatically
5. Once deployed, open a **Shell** in the Render dashboard for the web service and seed the grading scales:
   ```bash
   node prisma/seed.js
   ```
6. Copy your service URL (e.g., `https://ikonex-sms-api.onrender.com`)

> **Note:** Free Render services spin down after 15 minutes of inactivity and wake up on the next request (takes ~30 seconds). Free PostgreSQL databases expire after 90 days.

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repository
2. Set **Root Directory** to `client`
3. Add environment variable:
   ```
   VITE_API_URL=https://ikonex-sms-api.onrender.com/api
   ```
   *(Replace with your actual Render service URL)*
4. Click **Deploy** — Vercel reads `client/vercel.json` for SPA routing automatically

---

## System Usage Guide

### Dashboard

Open the app at your hosted URL. The dashboard shows:
- Total students, streams, subjects, and score entries
- Top 5 performing students (requires scores to be entered)
- Subject average scores chart

### Setting Up (recommended order)

**Step 1 — Configure Grading Scales** (`/grading`)
Before entering any results, verify or customize the grading bands. Default bands (A = 80–100, B+ = 75–79, etc.) are seeded automatically. Edit point values or score ranges as needed.

**Step 2 — Create Streams** (`/streams`)
Add your class streams (e.g., Form 1A, Form 1B, Form 2A). Each stream is unique.

**Step 3 — Create Subjects** (`/subjects`)
Add subjects (name + code, e.g., "Mathematics" / "MATH"). Then use the **Assign to Stream** button on each subject to link it to the relevant streams.

**Step 4 — Register Students** (`/students`)
Register students individually or use **Import CSV** for bulk upload. CSV format:

```
firstName,lastName,admissionNumber,gender,streamName
John,Doe,ADM/001,Male,Form 1A
Jane,Smith,ADM/002,Female,Form 1A
```

**Step 5 — Enter Scores** (`/scores`)
1. Select a stream, then select a subject
2. Enter scores per student individually (click **Add**/**Edit**) or switch to **Bulk Entry** mode to fill in all scores at once
3. EXAM scores are out of 70; CAT scores are out of 30

**Step 6 — View Results** (`/results`)
- **Student Results** tab: search for a student to see their per-subject breakdown, grade, and class position
- **Class Results** tab: select a stream to view the full ranked leaderboard
- Download individual **Report Cards** or the full **Class Report** as PDF

---

## Project Structure

```
ikonex-sms/
├── render.yaml              # Render Blueprint (web service + PostgreSQL)
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── pages/           # Dashboard, Streams, Students, Subjects, Scores, Results, GradingScale
│   │   ├── layouts/         # MainLayout (sidebar navigation)
│   │   └── api/axios.js     # Axios instance (reads VITE_API_URL)
│   └── vercel.json          # Vercel SPA routing config
│
└── server/                  # Node.js/Express backend
    ├── app.js               # Express app (exported for testing)
    ├── Procfile             # Start command fallback
    ├── __tests__/           # Jest + Supertest API tests
    ├── prisma/
    │   ├── schema.prisma    # Database schema
    │   ├── seed.js          # Default grading scales
    │   └── migrations/      # SQL migration history
    └── src/
        ├── controllers/     # Business logic (streams, students, subjects, scores, results, pdf, gradingScale)
        ├── routes/          # Express routers
        └── middleware/      # Validation, error handling
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/streams` | List / create streams |
| GET/PUT/DELETE | `/api/streams/:id` | Get / update / delete a stream |
| GET/POST | `/api/students` | List / register students |
| GET/PUT/DELETE | `/api/students/:id` | Get / update / delete a student |
| GET | `/api/students/stream/:streamId` | Students by stream |
| POST | `/api/students/import` | Bulk CSV import |
| GET/POST | `/api/subjects` | List / create subjects |
| GET/PUT/DELETE | `/api/subjects/:id` | Get / update / delete a subject |
| POST | `/api/stream-subjects` | Assign subject to stream |
| DELETE | `/api/stream-subjects/:id` | Remove subject from stream |
| GET/POST | `/api/scores` | Score count / create score |
| PUT/DELETE | `/api/scores/:id` | Update / delete score |
| GET | `/api/scores/student/:studentId` | Scores by student |
| GET | `/api/scores/stream/:streamId?subjectId=` | Scores by stream + subject |
| GET | `/api/results/student/:studentId` | Full results for one student |
| GET | `/api/results/stream/:streamId` | Ranked results for a stream |
| GET | `/api/results/top-students` | Top N students across all streams |
| GET | `/api/results/subject-averages` | Average score per subject |
| GET | `/api/pdf/student/:studentId` | Download student report card (PDF) |
| GET | `/api/pdf/stream/:streamId` | Download class performance report (PDF) |
| GET/POST | `/api/grading-scales` | List / create grading scale entries |
| PUT/DELETE | `/api/grading-scales/:id` | Update / delete a grading scale entry |

---

## Architecture Decisions

- **Prisma ORM** was chosen for type-safe database access and easy migrations over raw SQL
- **PDFKit** generates reports server-side so clients don't need any libraries
- **Weighted scoring** uses EXAM (70 marks) + CAT (30 marks) = 100 total per subject
- **Grade lookup** is table-driven (configurable via UI) rather than hard-coded, allowing the academy to adjust grade boundaries without code changes
- **Tie-aware ranking** — students with identical aggregate marks receive the same position, and the next rank skips accordingly (standard competition ranking)
- **Unique constraint** on `(studentId, subjectId, examType)` enforces at the database level that duplicate scores cannot be submitted

---

## Author

Isaac Juma — Software Developer Intern Assessment, Ikonex Systems (June 2026)
