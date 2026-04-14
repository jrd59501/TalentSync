# TalentSync

TalentSync is a full-stack hiring workflow app. Employers can import and manage job listings, candidates can build profiles from resume text and strengths, and the system ranks job matches with deterministic scoring plus optional AI-assisted extraction and reranking.

## Stack

- Backend: Node.js, Express, TypeScript
- Frontend: React, Vite
- Database: SQLite
- Testing: Vitest

## Features

- Job import from pasted descriptions
- Job search and category filtering
- Candidate profile creation and resume-based import
- Candidate-to-job matching and reranking
- Demo recruiter and candidate flows
- API routes, CLI tools, and tests

## Run Locally

From the project root:

```bash
npm install
npm run ui:install
npm run build
npm run ui:dev
```

In a second terminal:

```bash
npm start
```

- UI: `http://localhost:5173`
- API: `http://localhost:3000`

For Linux or WSL, use:

```bash
npm run setup:linux
```

## Environment

Optional AI features use environment variables. Copy the example file and add your own key locally:

```bash
cp .env.example .env
```

`OPENAI_API_KEY` is never required for the core app to run and should never be committed.

## Project Notes

- This public version excludes local editor files, generated artifacts, and local database files.
- The app can run without AI using deterministic fallback logic.
- Seed/demo data is intended for local testing and class presentation.
