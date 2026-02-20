# TalentSync
TalentSync is a TypeScript-based backend service designed to match users to job opportunities based on selected skills. The system uses object-oriented domain modeling and a scoring engine to rank job matches.
**
Project Goals**

Build a modular backend using TypeScript and Node

Implement domain-driven design principles

Create a scoring engine for job matching

Maintain clean separation of concerns

Prepare architecture for future AI-based skill parsing

**Current Features (v1)**

Express backend API

Structured domain layer (OOP design)

Binary skill matching

Match percentage calculation

Job ranking logic

Unit testing with Vitest

Modular and extensible architecture
Architecture Overview

**TalentSync follows a layered architecture: **

Domain Layer

Contains core business logic.

Job

Skill

SkillProfile

MatchScore

This layer is independent of Express and HTTP.

Services Layer

Coordinates domain objects and ranking logic.

Controllers Layer

Handles incoming API requests.

Routes Layer

Defines API endpoints.
