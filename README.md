# TalentSync

TalentSync is a full-stack hiring workflow application built to support both sides of the recruiting process. Employers can import and manage job listings, candidates can build profiles from resume text and strengths, and the platform ranks job matches using deterministic scoring with optional AI-assisted extraction and reranking.

## Why This Project

I built TalentSync to create a complete, demoable recruiting workflow instead of a single isolated feature. The project combines backend API design, frontend workflow development, local persistence, scoring logic, and optional AI integration in one end-to-end application.

## What It Does

- Imports job postings from pasted text
- Stores and filters job listings by keyword and category
- Builds candidate profiles from resume text and strengths
- Matches candidates to jobs with deterministic scoring
- Supports optional AI-assisted extraction and reranking
- Includes recruiter and candidate demo flows through both API and UI

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Frontend: React, Vite
- Database: SQLite
- Testing: Vitest

## Technical Highlights

- Designed a modular backend with controllers, services, repositories, middleware, and domain models
- Built a React interface for recruiter and candidate workflows
- Implemented deterministic matching logic with tokenization, normalization, and score ranking
- Added optional AI-powered profile extraction and top-result reranking
- Included validation, security middleware, and automated tests for core flows

## Project Structure

```text
src/
  controllers/    Request handling
  services/       Matching, ingestion, AI, profile logic
  repositories/   Data access
  routes/         Express route definitions
  middleware/     Security and request protection
  domain/         Core business models
ui/
  src/            React frontend
data/             Local SQLite files for development
```

## Running Locally

From the project root:

```bash
npm install
npm run ui:install
```

Start the frontend:

```bash
npm run ui:dev
```

In a second terminal, build and start the backend:

```bash
npm run build
npm start
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

For Linux or WSL setup:

```bash
npm run setup:linux
```

## Environment Variables

Optional AI features use environment variables. To enable them locally:

```bash
cp .env.example .env
```

Then add your own API key to `.env`.

`OPENAI_API_KEY` is optional and is not required for the application to run. The app falls back to deterministic logic when AI is unavailable.

## Testing

Run the test suite with:

```bash
npm test
```

## Documentation

- Docs index: [docs/README.md](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/docs/README.md)
- Public setup and overview: `README.md`
- Demo commands: [docs/demo-commands.md](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/docs/demo-commands.md)
- Presentation notes: [docs/presentation-cheat-sheet.md](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/docs/presentation-cheat-sheet.md)
- Team guide: [docs/team-guide.md](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/docs/team-guide.md)
- Visual Studio scaffold notes: [docs/visual-studio-project-notes.md](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/docs/visual-studio-project-notes.md)

## Public Repo Notes

This public repository excludes local editor files, generated artifacts, and local database state. Sensitive credentials are not included.
