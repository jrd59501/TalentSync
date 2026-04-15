# TalentSync Team Guide

## Purpose

This file is the quick internal guide for our team.
It explains:

- what the app does now
- how to run it
- how to demo it
- how the code is organized
- which OOP pieces we can point to and explain

This is the team-facing version, not the public project README.

## What TalentSync Is

TalentSync is a two-sided hiring workflow app.

- `Recruiter` side:
  - creates jobs
  - reviews candidates
  - runs matching
  - reviews applications

- `Candidate` side:
  - builds a profile from resume text
  - views job matches
  - submits applications

The app is intentionally simple enough for a student project, but it is structured to feel like a real product.

## Current Stack

- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite
- Database: SQLite
- Testing: Vitest

## Current Features

- recruiter login and candidate login with sample accounts
- recruiter job intake and job catalog
- recruiter candidate review and matching
- candidate profile builder
- candidate match results and application history
- backend-backed applications
- simple recruiter application review workflow
- basic auth and role protection
- input validation and lightweight security middleware

## Demo Accounts

Use these emails:

- Recruiter account:
  - `admin@talentsync.demo`

- Candidate account:
  - `candidate@talentsync.demo`

The passwords are configured locally through environment variables:

- `DEMO_ADMIN_PASSWORD`
- `DEMO_CANDIDATE_PASSWORD`

## How To Run

### Local Dev

If dependencies were installed on another platform first, reinstall them in the current environment before demoing.

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
npm run ui:install
```

Run backend:

```bash
npm run build
npm start
```

Run frontend in another terminal:

```bash
npm run ui:dev
```

Backend:

```text
http://localhost:3000
```

Frontend:

```text
http://localhost:5173
```

### Linux / WSL / Ubuntu / Container

Do not reuse `node_modules` from Windows.
Install dependencies inside Linux:

```bash
npm run setup:linux
```

Then build:

```bash
npm run build:full
```

## How To Demo

Simple demo order:

1. Sign in as Recruiter
2. Show job intake and job catalog
3. Show candidate builder and candidate matching
4. Switch to Candidate
5. Build/update the candidate profile
6. Run match results
7. Submit an application
8. Switch back to Recruiter
9. Open application review and update status

That gives a full end-to-end workflow:

`job created -> candidate matched -> application submitted -> recruiter reviews it`

## High-Level Architecture

### Backend

Main folders:

- `src/controllers/`
- `src/routes/`
- `src/repositories/`
- `src/services/`
- `src/utils/`
- `src/middleware/`

Responsibilities:

- controllers:
  handle request/response logic

- routes:
  connect endpoints to controllers and middleware

- repositories:
  handle SQLite storage

- services:
  hold higher-level business logic like matching and AI-assisted extraction

- utils:
  hold reusable helpers such as validation

- middleware:
  auth, headers, rate limiting

### Frontend

Main folders:

- `ui/src/components/`
- `ui/src/lib/`
- `ui/src/App.jsx`

Responsibilities:

- `App.jsx`
  top-level state, effects, and flow

- `components/`
  recruiter views, candidate views, login screen, shared chrome

- `lib/workspaceApi.js`
  shared frontend API class

- `lib/workspaceConfig.js`
  shared config, formatting helpers, and OOP examples

## Important Files

### Backend

- [src/app.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/app.ts)
  Express app setup, routes, middleware, frontend serving

- [src/middleware/security.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/middleware/security.ts)
  security headers, rate limiting, simple auth, role protection

- [src/controllers/jobController.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/controllers/jobController.ts)
  job endpoints

- [src/controllers/candidateController.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/controllers/candidateController.ts)
  candidate endpoints

- [src/controllers/applicationController.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/controllers/applicationController.ts)
  application endpoints

- [src/repositories/jobRepository.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/repositories/jobRepository.ts)
  SQLite job storage

- [src/repositories/candidateRepository.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/repositories/candidateRepository.ts)
  SQLite candidate storage

- [src/repositories/applicationRepository.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/repositories/applicationRepository.ts)
  SQLite application storage

- [src/utils/requestValidation.ts](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/src/utils/requestValidation.ts)
  shared controller validation helpers

### Frontend

- [ui/src/App.jsx](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/App.jsx)
  top-level app state and behavior

- [ui/src/lib/workspaceApi.js](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/lib/workspaceApi.js)
  API wrapper used by the frontend

- [ui/src/lib/workspaceConfig.js](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/lib/workspaceConfig.js)
  section definitions, formatters, status rules

- [ui/src/components/LoginScreen.jsx](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/components/LoginScreen.jsx)
  login screen

- [ui/src/components/RecruiterViews.jsx](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/components/RecruiterViews.jsx)
  recruiter-side screens

- [ui/src/components/CandidateViews.jsx](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/components/CandidateViews.jsx)
  candidate-side screens

## OOP Examples We Can Explain

These are the clearest code examples for class discussion.

### 1. Inheritance

File:

- [ui/src/lib/workspaceConfig.js](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/lib/workspaceConfig.js)

Example:

- `WorkspaceSectionDefinition` is the base class
- child classes like `JobsSectionDefinition`, `ProfileSectionDefinition`, and `ApplicationsSectionDefinition` extend it

What to say:

- one parent class defines the shared methods
- child classes inherit those methods and override them when needed

### 2. Polymorphism

File:

- [ui/src/lib/workspaceConfig.js](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/lib/workspaceConfig.js)

Example:

- `StatusRule` is the base class
- `ErrorStatusRule`, `InfoStatusRule`, and `SuccessStatusRule` respond differently to the same method calls

What to say:

- the app loops through rule objects
- each object uses the same method names
- each child class gives different behavior

### 3. Encapsulation

File:

- [ui/src/lib/workspaceApi.js](/mnt/c/Users/Justin%20Denny/Desktop/TalentSync/TalentSync/ui/src/lib/workspaceApi.js)

What to say:

- all frontend network logic is hidden in one class
- components do not need to know fetch details, auth header logic, or response parsing

### 4. Backend OOP Example

Files:

- [src/repositories/jobRepository.ts](./src/repositories/jobRepository.ts)
- [src/repositories/candidateRepository.ts](./src/repositories/candidateRepository.ts)
- [src/repositories/applicationRepository.ts](./src/repositories/applicationRepository.ts)

What to say:

- each repository is a class that encapsulates SQLite operations
- the rest of the app calls simple methods like `addJob`, `getAllCandidates`, or `updateApplicationStatus`

## Security Features Included

These are simple, not enterprise-grade, but they are real:

- security headers
- JSON request size limit
- lightweight rate limiting
- backend login
- in-memory auth token sessions
- role protection for recruiter-only routes
- input validation helpers
- email validation
- prepared SQLite statements

## Code Style Notes

Current direction:

- keep controllers focused on request/response logic
- keep repeated validation in shared utilities
- keep frontend API logic in one file
- keep role-specific UI in separate components
- keep comments short and explain architecture, not every line

## Known Limitations

- auth is demo-level, not production auth
- tests may fail in mixed Windows/Linux installs if native optional dependencies are wrong
- frontend still has one main app coordinator file, even though it is much smaller than before
- application workflow is simple by design

## Current Simplification Work Already Done

- frontend split into recruiter views and candidate views
- API wrapper extracted into its own file
- OOP/config helpers extracted into their own file
- shared backend request validation helper added
- repeated controller validation reduced

## Good Next Steps

If we keep improving the project, the next best steps are:

1. extract more frontend state into small hooks
2. reduce repeated backend `id` handling patterns
3. add more tests once the Linux dependency install is clean
4. continue simplifying state logic and demo wording as needed

## Quick Explanation Script For Team

If someone asks how the app works, use this:

> Recruiters create jobs and review applications. Candidates build profiles and apply to jobs. The backend stores jobs, candidates, and applications in SQLite. The frontend is split into recruiter and candidate views. We use a few OOP examples in the frontend config and status systems so we can explain inheritance, polymorphism, and encapsulation clearly.
