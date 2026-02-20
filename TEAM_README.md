
# TalentSync – Team README

## Current Status (Phase 1 Complete)

We have completed the initial backend foundation of TalentSync.

The system is structured using TypeScript, Node.js, and Express with a layered architecture.

Core domain logic and scoring are implemented and tested.

---

## What Has Been Implemented So Far

### 1. Project Setup

* Initialized Node project using `npm init`
* Configured TypeScript (`tsconfig.json`)
* Installed dependencies:

  * express
  * tsx (development runtime)
  * typescript
  * vitest (unit testing)
  * @types/node
  * @types/express

---

## Development Scripts

Inside `package.json`:

```json
"scripts": {
  "dev": "tsx watch src/app.ts",
  "build": "tsc",
  "start": "node dist/app.js",
  "test": "vitest"
}
```

These scripts allow:

* `npm run dev` → Run development server
* `npm run build` → Compile TypeScript
* `npm run start` → Run compiled production build
* `npm run test` → Run unit tests

---

## How to Run the Project

### 1. Clone Repository


### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Server runs at:

[http://localhost:3000](http://localhost:3000)

---

## How to Run Tests

```bash
npm run test
```

Vitest runs in watch mode and automatically re-tests when files change.

---

## Architecture Overview

TalentSync uses a layered architecture.

### Domain Layer

Location: `src/domain/`

Contains:

* Job.ts
* Skill.ts
* SkillProfile.ts
* MatchScore.ts

Responsibilities:

* Contains core business logic
* Independent from Express and HTTP
* Fully unit tested

Scoring Logic (v1):

* Each required skill = 1 point
* Score = (matched skills / required skills) × 100
* Binary matching only (exact match)

---

### Services Layer

Location: `src/services/`

Responsibilities:

* Coordinates domain objects
* Handles ranking logic
* Returns sorted results

---

### Controllers Layer

Location: `src/controllers/`

Responsibilities:

* Handles HTTP requests
* Calls services
* Returns responses

---

### Routes Layer

Location: `src/routes/`

Responsibilities:

* Defines API endpoints
* Connects routes to controllers

---

## Current API Endpoints

* `GET /`

  * Returns API health message

* `POST /match`

  * Connected to scoring logic (basic implementation)

---

## Design Decisions

* Started with binary scoring intentionally (kept simple)
* Domain logic isolated from HTTP layer
* Unit tests implemented before adding complexity
* No database integration yet
* No AI integration yet

The focus was to stabilize the core scoring engine before expanding features.

---

## Next Planned Steps

1. Implement ranking across multiple jobs // team will work together to extend scoring to handle multiple job matches and return ranked results
2. Integrate MongoDB // Work together to set up database and connect domain models
3. Add AI-based skill extraction // Justin will attempt this after MongoDB is integrated
4. Introduce weighted or partial scoring // if we have time
5. Build frontend integration // React app to consume API

---

## Important Rules for Contributors

* Do not put business logic inside controllers
* Scoring logic must remain in the domain layer
* Any scoring updates must include unit tests
* Maintain separation of concerns
