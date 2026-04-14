import { Request, Response } from "express";
import { clearDemoSession, loginDemoUser } from "../middleware/security.js";

export const login = (req: Request, res: Response) => {
    // Keep login validation simple and explicit so it is easy to explain.
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "email is required" });
    }
    if (typeof password !== "string" || !password.trim()) {
        return res.status(400).json({ error: "password is required" });
    }

    const session = loginDemoUser(email, password);
    if (!session) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    // The frontend stores this token and sends it back on protected requests.
    return res.json(session);
};

export const logout = (req: Request, res: Response) => {
    const authorizationHeader = req.header("authorization");
    const token = authorizationHeader?.startsWith("Bearer ")
        ? authorizationHeader.slice("Bearer ".length).trim()
        : null;
    // Logout just removes the in-memory session for the current token.
    clearDemoSession(token);
    return res.status(204).send();
};
