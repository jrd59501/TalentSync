# TalentSync Presentation Cheat Sheet

## 1. One-Sentence Pitch

TalentSync is a simple hiring workflow app where recruiters create jobs and review applications, while candidates build profiles, get matched to jobs, and apply.

## 2. The Problem We Wanted To Solve

We wanted to model a realistic hiring process in a way that was:

- simple enough for a student project
- structured enough to feel like a real application
- clear enough that we could explain the code and architecture

Our main idea was:

`job created -> candidate profile built -> match generated -> application submitted -> recruiter reviews it`

## 3. Why We Chose This Scope

We did not want to build an overcomplicated enterprise app.
We wanted something that was:

- believable
- presentation-friendly
- technically explainable
- built with patterns we understand

So we chose:

- simple backend auth
- two clear user roles
- SQLite for storage
- React for the frontend
- Express for the backend
- matching logic that can be explained step by step

## 4. The Two Sides Of The App

### Recruiter Side

The recruiter side is for the company worker using the system.

They can:

- create jobs
- review candidate profiles
- run matching
- review submitted applications

### Candidate Side

The candidate side is for the outside applicant.

They can:

- build a profile
- paste resume text
- view job matches
- apply to jobs

## 5. Main Design Thought Process

We tried to keep the app realistic, but not too hard to explain.

Our thought process was:

1. Start with a full hiring workflow
2. Keep the roles separate
3. Keep the data model simple
4. Keep security basic but real
5. Use code structure that supports explanation

That is why we used:

- separate recruiter and candidate views
- repositories for database logic
- controllers for request handling
- services for matching and profile logic
- small OOP examples in the frontend

## 6. Architecture In Simple Terms

### Frontend

The frontend is split into:

- `App.jsx`
  - top-level state and flow
- `components/`
  - actual recruiter/candidate screens
- `lib/workspaceApi.js`
  - API calls
- `lib/workspaceConfig.js`
  - shared config and OOP examples

### Backend

The backend is split into:

- `routes`
  - define endpoints
- `controllers`
  - handle request and response logic
- `repositories`
  - talk to SQLite
- `services`
  - business logic like matching
- `middleware`
  - auth, headers, rate limiting
- `utils`
  - reusable validation helpers

## 7. OOP Talking Points

If asked where OOP is used, point to these.

### Inheritance

File:

- `ui/src/lib/workspaceConfig.js`

Example:

- `WorkspaceSectionDefinition` is the parent class
- specific section classes extend it

What to say:

- the parent class defines shared methods
- child classes reuse that structure and override what changes

### Polymorphism

File:

- `ui/src/lib/workspaceConfig.js`

Example:

- `StatusRule`
- `ErrorStatusRule`
- `InfoStatusRule`
- `SuccessStatusRule`

What to say:

- the app calls the same methods on different rule objects
- each child class behaves differently
- that is polymorphism

### Encapsulation

File:

- `ui/src/lib/workspaceApi.js`

What to say:

- all frontend API logic is grouped in one class
- components do not need to know fetch/auth details
- that keeps the app easier to maintain and explain

## 8. Security Talking Points

We kept security simple, but we did include real protections:

- backend login
- auth token for protected routes
- role protection for recruiter-only actions
- security headers
- rate limiting
- input validation
- prepared SQL statements

What to say:

We did not build enterprise security, but we added enough real protections to show that we thought about access control and input safety.

## 9. Why The Code Is Structured This Way

We simplified the code so it is easier to explain:

- frontend views are split by role
- shared API logic is in one file
- repeated backend validation is centralized
- comments were added around architecture and OOP concepts

What to say:

We intentionally refactored away from giant files so the code would be easier for the team to present and maintain.

## 10. Demo Flow Script

Use this order:

1. Start on login
2. Sign in as Recruiter
3. Show recruiter job intake
4. Show recruiter candidate review
5. Show recruiter match results
6. Switch to Candidate
7. Show candidate profile builder
8. Show candidate job matches
9. Submit an application
10. Switch back to Recruiter
11. Show application review and update status

## 11. If Someone Asks “What Makes This Real?”

Answer:

- separate user roles
- backend-backed data
- recruiter workflow
- candidate workflow
- stored applications
- route protection
- matching logic

## 12. If Someone Asks “What Did You Keep Simple On Purpose?”

Answer:

- simple login instead of full auth system
- SQLite instead of a larger database
- simple application workflow
- simple role model
- lightweight security instead of enterprise security

## 13. If Someone Asks “What Would You Do Next?”

Answer:

- improve tests after a clean Linux dependency install
- add more edit/update flows
- extract more frontend state into hooks
- improve backend auth if the project grows
- add more recruiter reporting/dashboard features

## 14. Best Closing Line

We designed TalentSync to feel like a real hiring app while keeping the architecture simple enough that every major part of the system can be explained clearly.
