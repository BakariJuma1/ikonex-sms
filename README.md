# Ikonex Academy — Student Management System

A full-stack web app built for the Ikonex Academy to handle everything from class setup to end-of-term report cards. Teachers can register students, enter scores, and download PDF reports without touching a spreadsheet.

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | React 19, Vite, Ant Design, Recharts |
| Backend    | Node.js, Express                   |
| Database   | PostgreSQL via Prisma ORM          |
| PDF        | PDFKit                             |
| Deployment | Render (backend), Vercel (frontend) |

---

## What it does

- **Class Streams** — Create and manage streams like Form 1A, Form 2B
- **Students** — Register individually or bulk import via CSV; edit, delete, assign to streams
- **Subjects** — Add subjects and assign them to specific streams
- **Scores** — Record EXAM (out of 70) and CAT (out of 30) per student per subject with duplicate prevention
- **Results** — Auto-calculates totals, percentages, grades, subject positions and class rankings with proper tie handling
- **Grading Scale** — Grade bands are fully configurable from the UI, nothing is hardcoded
- **PDF Reports** — Individual student report cards and full class performance reports, downloadable instantly

---

## Local Setup

### What you need

- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Clone the repo

```bash
git clone https://github.com/BakariJuma1/ikonex-sms.git
cd ikonex-sms
```

### 2. Backend

```bash
cd server
cp .env.example .env
```

Fill in your `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ikonex_sms?schema=public"
PORT=5000
```

Then:

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Server runs at `http://localhost:5000`

### 3. Frontend

```bash
cd ../client
cp .env.example .env
```

Fill in your `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

Then:

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## How to use the system

Follow this order when setting up for the first time:

**1. Grading Scales** (`/grading`)
Check the default KCSE grade bands and adjust if needed. This affects all result calculations so do it first.

**2. Create Streams** (`/streams`)
Add your class streams — Form 1A, Form 1B, Form 2A, etc.

**3. Add Subjects** (`/subjects`)
Create subjects then use the **Assign to Stream** button to link each subject to the relevant streams.

**4. Register Students** (`/students`)
Add students one by one or use **Import CSV** for bulk upload. CSV format:

```
firstName,lastName,admissionNumber,gender,streamName
John,Doe,ADM/001,Male,Form 1A
Jane,Smith,ADM/002,Female,Form 1A
```

**5. Enter Scores** (`/scores`)
Pick a stream, pick a subject, then enter EXAM and CAT scores per student. EXAM is out of 70, CAT out of 30.

**6. View Results** (`/results`)
Search a student to see their full breakdown and class position, or pick a stream to see the full ranked leaderboard. Download report cards as PDF from here.

---

## Running Tests

```bash
cd server
npm test
```

Tests use Jest + Supertest with a mocked Prisma client — no live database needed.

---

## Deployment

### Backend on Render

The repo includes a `render.yaml` that sets up everything automatically.

1. Push to GitHub
2. Go to Render → **New** → **Blueprint**
3. Connect your repo — Render detects the config and creates the web service and PostgreSQL database
4. Click **Apply** and wait for the build to finish
5. Open a **Shell** in the Render dashboard and run `node prisma/seed.js` to load the grading scales
6. Copy your service URL

> Free Render services sleep after 15 minutes of inactivity. First request after sleep takes about 30 seconds to wake up.

### Frontend on Vercel

1. Go to Vercel → **New Project** → import your repo
2. Set **Root Directory** to `client`
3. Add environment variable:
   ```
   VITE_API_URL=https://ikonex-sms-kgrd.onrender.com/api
   ```
4. Deploy

---

## Project Structure

```
ikonex-sms/
├── render.yaml
├── client/
│   ├── src/
│   │   ├── pages/
│   │   ├── layouts/
│   │   └── api/axios.js
│   └── vercel.json
└── server/
    ├── app.js
    ├── __tests__/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── seed.js
    │   └── migrations/
    └── src/
        ├── controllers/
        ├── routes/
        └── middleware/
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
| POST/DELETE | `/api/stream-subjects` | Assign / remove subject from stream |
| GET/POST | `/api/scores` | Score count / create score |
| PUT/DELETE | `/api/scores/:id` | Update / delete score |
| GET | `/api/scores/student/:studentId` | Scores by student |
| GET | `/api/scores/stream/:streamId?subjectId=` | Scores by stream and subject |
| GET | `/api/results/student/:studentId` | Full results for one student |
| GET | `/api/results/stream/:streamId` | Ranked results for a stream |
| GET | `/api/results/top-students` | Top N students across all streams |
| GET | `/api/results/subject-averages` | Average score per subject |
| GET | `/api/pdf/student/:studentId` | Student report card PDF |
| GET | `/api/pdf/stream/:streamId` | Class performance report PDF |
| GET/POST | `/api/grading-scales` | List / create grading scales |
| PUT/DELETE | `/api/grading-scales/:id` | Update / delete a grading scale |

---

## Key decisions worth knowing

- **Prisma over raw SQL** — type-safe queries and migrations that don't require writing SQL by hand
- **Server-side PDF generation** — PDFKit runs on the backend so the client just downloads a file, no libraries needed in the browser
- **KCSE scoring model** — EXAM is out of 70, CAT out of 30, total out of 100; mirrors the actual Kenyan secondary school standard rather than an arbitrary weighting system
- **Table-driven grading** — grade boundaries live in the database and are editable from the UI; changing a grade band updates all future result calculations automatically
- **Competition ranking** — ties get the same position and the next rank skips, which is the standard used in Kenyan schools
- **Database-level duplicate prevention** — a unique constraint on `(studentId, subjectId, examType)` means duplicate scores are impossible even if the API is called directly

---

## Author

Isaac Juma — Software Developer Intern Assessment, Ikonex Systems, June 2026
