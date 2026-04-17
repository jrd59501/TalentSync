import "./bootstrapEnv.js";
import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import matchRoutes from "./routes/matchRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { jobsRepository } from "./repositories/jobRepository.js";
import { candidatesRepository } from "./repositories/candidateRepository.js";
import { applicationsRepository } from "./repositories/applicationRepository.js";
import { createSimpleRateLimiter, securityHeaders } from "./middleware/security.js";

// Create one Express app instance for the whole API.
const app = express();
// Port where local server listens.
const port = process.env.PORT || 3000;
app.disable("x-powered-by");
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const uiDistPath = path.resolve(currentDirectoryPath, "../ui/dist");
const hasBuiltFrontend = existsSync(uiDistPath);

// Make sure DB tables exist before handling requests.
// This also seeds the default jobs if needed.
jobsRepository.ensureInitialized();
candidatesRepository.ensureInitialized();
applicationsRepository.ensureInitialized();

// Basic security headers on every response.
app.use(securityHeaders);
// Let Express parse JSON request bodies into req.body.
app.use(express.json({ limit: "1mb" }));
// Lightweight API-level rate limiting for expensive routes.
app.use(createSimpleRateLimiter({
    windowMs: 60_000,
    maxRequests: 120,
    pathPrefixes: ["/match", "/jobs/import", "/candidates/import-profile", "/candidates/", "/auth/login"]
}));
app.use("/auth", authRoutes);
// Candidate matching endpoints.
app.use("/match", matchRoutes);
// Employer job management endpoints (list/import/delete).
app.use("/jobs", jobRoutes);
// Candidate management endpoints (save/list/delete/match-saved).
app.use("/candidates", candidateRoutes);
// Application endpoints for candidate submissions and recruiter review.
app.use("/applications", applicationRoutes);
// In production/container builds, serve the compiled React frontend from Express.
if (hasBuiltFrontend) {
    app.use(express.static(uiDistPath));
}

// Quick status endpoint for backend health.
app.get("/health", (req, res) => {
    res.json({ message: "TalentSync API running" });
});

// Serve the frontend entry point when a production UI build exists.
app.get("/", (req, res) => {
    if (hasBuiltFrontend) {
        res.sendFile(path.join(uiDistPath, "index.html"));
        return;
    }
    res.json({ message: "TalentSync API running" });
});

// Let React handle client-side routes in container/prod mode.
app.get(/^\/(?!auth|match|jobs|candidates|applications|health).*/, (req, res, next) => {
    if (!hasBuiltFrontend) {
        next();
        return;
    }
    res.sendFile(path.join(uiDistPath, "index.html"));
});

// Start listening for incoming HTTP requests.
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
