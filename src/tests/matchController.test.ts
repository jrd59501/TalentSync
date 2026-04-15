import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";
import { matchUser } from "../controllers/matchController.js";

const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
};

describe("matchUser controller", () => {
    it("should return 400 when selectedSkills is invalid", async () => {
        const req = {
            body: {
                selectedSkills: "not-an-array",
                experienceSummary: "2 years"
            }
        } as Request;
        const res = createMockResponse();

        await matchUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "selectedSkills must be an array of strings"
        });
    });

    it("should return ranked results with deterministic scoring when AI is disabled", async () => {
        const req = {
            body: {
                selectedSkills: ["react", "javascript", "css"],
                experienceSummary: "Built frontend component integration work"
            }
        } as Request;
        const res = createMockResponse();

        await matchUser(req, res);

        expect(res.status).not.toHaveBeenCalled();

        const payload = vi.mocked(res.json).mock.calls[0][0];
        expect(Array.isArray(payload)).toBe(true);
        expect(payload[0].jobId).toBe(2);
        expect(payload[0].jobTitle).toBe("Frontend Developer");
        expect(payload[0].score).toBe(86);
        expect(payload[0].skillScore).toBe(100);
        expect(payload[0].experienceScore).toBe(43);
        expect(payload[0].aiScore).toBeNull();
        expect(payload[0].aiReason).toBeNull();
        expect(payload[0].matchedSkills).toEqual(["react", "javascript", "css"]);
        expect(payload[0].matchedKeywords).toContain("component");
        expect(payload[0].matchedKeywords).toContain("frontend");
        const fullStack = payload.find((job: { jobTitle: string }) => job.jobTitle === "Full Stack Developer");
        expect(fullStack).toBeDefined();
        expect(fullStack.jobId).toBe(3);
        expect(fullStack.score).toBeGreaterThan(0);
        expect(fullStack.skillScore).toBe(25);
        expect(fullStack.experienceScore).toBeGreaterThan(0);
        expect(fullStack.aiScore).toBeNull();
        expect(fullStack.aiReason).toBeNull();
        expect(fullStack.matchedSkills).toContain("react");
        expect(fullStack.matchedKeywords).toContain("frontend");
        expect(fullStack.matchedKeywords).toContain("integration");
        expect(payload.some((job: { jobTitle: string }) => job.jobTitle === "Support Engineer")).toBe(true);
    });

    it("should match selected skills case-insensitively", async () => {
        const req = {
            body: {
                selectedSkills: ["React", "JavaScript", "CSS"],
                experienceSummary: "Built FRONTEND apps"
            }
        } as Request;
        const res = createMockResponse();

        await matchUser(req, res);

        const payload = vi.mocked(res.json).mock.calls[0][0];
        expect(payload[0].jobTitle).toBe("Frontend Developer");
        expect(payload[0].matchedSkills).toEqual(["react", "javascript", "css"]);
        expect(payload[0].matchedKeywords).toContain("frontend");
    });

    it("should rank education jobs for teaching-related input", async () => {
        const req = {
            body: {
                selectedSkills: ["teaching"],
                experienceSummary: "I am a teacher focused on classroom instruction"
            }
        } as Request;
        const res = createMockResponse();

        await matchUser(req, res);

        const payload = vi.mocked(res.json).mock.calls[0][0] as Array<{
            jobTitle: string;
            score: number;
        }>;
        const topFiveTitles = payload.slice(0, 5).map(job => job.jobTitle);
        expect(topFiveTitles).toContain("Teacher");
        expect(topFiveTitles).toContain("Teacher Assistant");

        const teacher = payload.find(job => job.jobTitle === "Teacher");
        expect(teacher).toBeDefined();
        expect(teacher?.score).toBeGreaterThan(0);
    });
});
