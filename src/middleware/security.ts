import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

// Minimal security headers suitable for an API-first prototype.
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // API-focused CSP that allows only same-origin resources.
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    next();
};

type RateLimitConfig = {
    windowMs: number;
    maxRequests: number;
    pathPrefixes: string[];
};

type Bucket = {
    count: number;
    resetAt: number;
};

export const createSimpleRateLimiter = (config: RateLimitConfig) => {
    // In-memory buckets are enough for single-instance prototype/demo use.
    const buckets = new Map<string, Bucket>();

    return (req: Request, res: Response, next: NextFunction) => {
        // Only apply to configured route prefixes.
        const shouldLimit = config.pathPrefixes.some(prefix => req.path.startsWith(prefix));
        if (!shouldLimit) {
            return next();
        }

        const now = Date.now();
        const key = `${req.ip || "unknown"}:${req.path}`;
        const existing = buckets.get(key);
        // New window starts at first request.
        if (!existing || now > existing.resetAt) {
            buckets.set(key, {
                count: 1,
                resetAt: now + config.windowMs
            });
            return next();
        }

        existing.count += 1;
        if (existing.count > config.maxRequests) {
            // Tell clients when they can retry.
            const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
            res.setHeader("Retry-After", String(retryAfterSeconds));
            return res.status(429).json({
                error: "Too many requests. Please retry shortly."
            });
        }

        return next();
    };
};

export type DemoUserRole = "admin" | "candidate";

export type DemoSession = {
    token: string;
    role: DemoUserRole;
    name: string;
    email: string;
};

const defaultDemoPasswords = {
    DEMO_ADMIN_PASSWORD: "TalentSyncRecruiter2026!",
    DEMO_CANDIDATE_PASSWORD: "TalentSyncCandidate2026!"
} as const;

const getDemoPassword = (envName: "DEMO_ADMIN_PASSWORD" | "DEMO_CANDIDATE_PASSWORD"): string => {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    return defaultDemoPasswords[envName];
};

// These sample users are enough to demonstrate recruiter vs candidate access.
const demoUsers = [
    {
        role: "admin" as const,
        name: "Riley Recruiter",
        email: "admin@talentsync.demo",
        password: getDemoPassword("DEMO_ADMIN_PASSWORD")
    },
    {
        role: "candidate" as const,
        name: "Jordan Candidate",
        email: "candidate@talentsync.demo",
        password: getDemoPassword("DEMO_CANDIDATE_PASSWORD")
    }
];

// In-memory sessions keep auth simple for a student project.
const demoSessions = new Map<string, DemoSession>();

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
    if (!authorizationHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    return token || null;
};

export const loginDemoUser = (email: string, password: string): DemoSession | null => {
    const matchedUser = demoUsers.find(user =>
        user.email.toLowerCase() === email.trim().toLowerCase() &&
        user.password === password
    );
    if (!matchedUser) {
        return null;
    }

    // A random token lets the frontend prove who is signed in on later requests.
    const token = crypto.randomUUID();
    const session: DemoSession = {
        token,
        role: matchedUser.role,
        name: matchedUser.name,
        email: matchedUser.email
    };
    demoSessions.set(token, session);
    return session;
};

export const clearDemoSession = (token: string | null): void => {
    if (!token) {
        return;
    }

    demoSessions.delete(token);
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = getBearerToken(req.header("authorization"));
    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const session = demoSessions.get(token);
    if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
    }

    // Store the current user once so downstream controllers do not repeat auth lookup logic.
    res.locals.currentUser = session;
    return next();
};

export const requireRole = (role: DemoUserRole) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const currentUser = res.locals.currentUser as DemoSession | undefined;
        if (!currentUser) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (currentUser.role !== role) {
            return res.status(403).json({ error: "You do not have access to this resource" });
        }

        // This is the simple authorization check that separates recruiter-only actions.
        return next();
    };
};
