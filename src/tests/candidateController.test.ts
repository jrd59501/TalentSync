import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import {
    createCandidate,
    deleteCandidate,
    getCandidateById,
    importCandidateProfile,
    listCandidates,
    matchSavedCandidate
} from "../controllers/candidateController.js";
import { candidatesRepository } from "../repositories/candidateRepository.js";
import { findMatches } from "../services/matchingService.js";
import { buildCandidateProfile } from "../services/candidateProfileService.js";

vi.mock("../repositories/candidateRepository.js", () => ({
    candidatesRepository: {
        getAllCandidates: vi.fn(),
        getCandidateById: vi.fn(),
        addCandidate: vi.fn(),
        deleteCandidateById: vi.fn()
    }
}));

vi.mock("../services/matchingService.js", () => ({
    findMatches: vi.fn()
}));

vi.mock("../services/candidateProfileService.js", () => ({
    buildCandidateProfile: vi.fn()
}));

const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res as Response;
};

describe("candidateController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("lists candidates", () => {
        vi.mocked(candidatesRepository.getAllCandidates).mockReturnValue([
            {
                id: 1,
                fullName: "Jane Doe",
                email: "jane@example.com",
                selectedSkills: ["react"],
                experienceSummary: "frontend dev",
                resumeText: null,
                strengthsText: null,
                createdAt: "2026-03-18 10:00:00"
            }
        ]);
        const req = {} as Request;
        const res = createMockResponse();
        listCandidates(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it("creates candidate with valid input", () => {
        vi.mocked(candidatesRepository.addCandidate).mockReturnValue({
            id: 2,
            fullName: "John Smith",
            email: null,
            selectedSkills: ["node"],
            experienceSummary: "backend",
            resumeText: null,
            strengthsText: null,
            createdAt: "2026-03-18 10:00:00"
        });
        const req = {
            body: {
                fullName: "John Smith",
                selectedSkills: ["node"],
                experienceSummary: "backend"
            }
        } as Request;
        const res = createMockResponse();
        createCandidate(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 for invalid create payload", () => {
        const req = {
            body: {
                fullName: "",
                selectedSkills: "node"
            }
        } as unknown as Request;
        const res = createMockResponse();
        createCandidate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid email on create", () => {
        const req = {
            body: {
                fullName: "Test User",
                email: "not-an-email",
                selectedSkills: ["node"]
            }
        } as unknown as Request;
        const res = createMockResponse();
        createCandidate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "email must be valid if provided"
        });
    });

    it("gets candidate by id", () => {
        vi.mocked(candidatesRepository.getCandidateById).mockReturnValue({
            id: 3,
            fullName: "A",
            email: null,
            selectedSkills: ["sql"],
            experienceSummary: "",
            resumeText: null,
            strengthsText: null,
            createdAt: "2026-03-18 10:00:00"
        });
        const req = { params: { id: "3" } } as unknown as Request;
        const res = createMockResponse();
        getCandidateById(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it("matches saved candidate", async () => {
        vi.mocked(candidatesRepository.getCandidateById).mockReturnValue({
            id: 4,
            fullName: "B",
            email: null,
            selectedSkills: ["typescript"],
            experienceSummary: "api",
            resumeText: null,
            strengthsText: null,
            createdAt: "2026-03-18 10:00:00"
        });
        vi.mocked(findMatches).mockResolvedValue([
            {
                jobId: 1,
                jobTitle: "Backend",
                score: 70,
                skillScore: 70,
                experienceScore: 70,
                aiScore: null,
                aiReason: null,
                matchedSkills: ["typescript"],
                matchedKeywords: ["api"]
            }
        ]);
        const req = { params: { id: "4" } } as unknown as Request;
        const res = createMockResponse();
        await matchSavedCandidate(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it("deletes candidate by id", () => {
        vi.mocked(candidatesRepository.deleteCandidateById).mockReturnValue(true);
        const req = { params: { id: "5" } } as unknown as Request;
        const res = createMockResponse();
        deleteCandidate(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it("imports candidate profile from resume + strengths", async () => {
        vi.mocked(buildCandidateProfile).mockResolvedValue({
            extractionMode: "ai",
            profile: {
                selectedSkills: ["node", "typescript"],
                experienceSummary: "Built APIs and backend services."
            }
        });

        vi.mocked(candidatesRepository.addCandidate).mockReturnValue({
            id: 11,
            fullName: "Resume User",
            email: "resume@example.com",
            selectedSkills: ["node", "typescript"],
            experienceSummary: "Built APIs and backend services.",
            resumeText: "Resume long text...",
            strengthsText: "I am strong at backend architecture.",
            createdAt: "2026-03-18 10:00:00"
        });

        const req = {
            body: {
                fullName: "Resume User",
                email: "resume@example.com",
                resumeText: "This is resume text with lots of information and skills.",
                strengthsText: "I am strong at backend architecture."
            }
        } as Request;
        const res = createMockResponse();

        await importCandidateProfile(req, res);

        expect(buildCandidateProfile).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 when import resume text is too short", async () => {
        const req = {
            body: {
                fullName: "Short Resume User",
                resumeText: "too short"
            }
        } as Request;
        const res = createMockResponse();
        await importCandidateProfile(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "resumeText must be at least 20 characters"
        });
    });

    it("returns 400 when import email is invalid", async () => {
        const req = {
            body: {
                fullName: "Bad Email User",
                email: "bad-email",
                resumeText: "This is a valid resume text with enough length to pass checks."
            }
        } as Request;
        const res = createMockResponse();
        await importCandidateProfile(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "email must be valid if provided"
        });
    });
});
