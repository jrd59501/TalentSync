import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import {
    createApplication,
    getApplicationMatch,
    listApplications,
    updateApplicationStatus
} from "../controllers/applicationController.js";
import { applicationsRepository } from "../repositories/applicationRepository.js";
import { candidatesRepository } from "../repositories/candidateRepository.js";
import { findMatches } from "../services/matchingService.js";

vi.mock("../repositories/applicationRepository.js", () => ({
    applicationsRepository: {
        getApplications: vi.fn(),
        getApplicationById: vi.fn(),
        addApplication: vi.fn(),
        updateApplicationStatus: vi.fn()
    }
}));

vi.mock("../repositories/candidateRepository.js", () => ({
    candidatesRepository: {
        getCandidateByEmail: vi.fn(),
        upsertCandidateByEmail: vi.fn()
    }
}));

vi.mock("../services/matchingService.js", () => ({
    findMatches: vi.fn()
}));

const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.locals = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res as Response;
};

describe("applicationController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("lists applications with email filter", () => {
        vi.mocked(applicationsRepository.getApplications).mockReturnValue([]);
        const req = { query: { email: "candidate@talentsync.demo" } } as unknown as Request;
        const res = createMockResponse();

        listApplications(req, res);

        expect(applicationsRepository.getApplications).toHaveBeenCalledWith({
            applicantEmail: "candidate@talentsync.demo",
            status: undefined
        });
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("creates an application", () => {
        vi.mocked(applicationsRepository.addApplication).mockReturnValue({
            id: 1,
            jobId: 2,
            jobTitle: "Backend Engineer",
            applicantName: "Jordan Candidate",
            applicantEmail: "candidate@talentsync.demo",
            note: "Interested in the role.",
            candidateSkills: [],
            candidateSummary: "",
            candidateResumeText: null,
            candidateStrengthsText: null,
            status: "Submitted",
            submittedAt: "2026-03-18 10:00:00"
        });

        const req = {
            body: {
                jobId: 2,
                jobTitle: "Backend Engineer",
                applicantName: "Jordan Candidate",
                applicantEmail: "candidate@talentsync.demo",
                note: "Interested in the role."
            }
        } as Request;
        const res = createMockResponse();

        createApplication(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("saves the candidate profile from an application when provided", () => {
        vi.mocked(candidatesRepository.upsertCandidateByEmail).mockReturnValue({
            id: 9,
            fullName: "Jordan Candidate",
            email: "candidate@talentsync.demo",
            selectedSkills: ["node", "typescript"],
            experienceSummary: "Backend developer.",
            resumeText: "Resume text",
            strengthsText: null,
            createdAt: "2026-03-18 10:00:00"
        });
        vi.mocked(applicationsRepository.addApplication).mockReturnValue({
            id: 1,
            jobId: 2,
            jobTitle: "Backend Engineer",
            applicantName: "Jordan Candidate",
            applicantEmail: "candidate@talentsync.demo",
            note: "Interested in the role.",
            candidateSkills: [],
            candidateSummary: "",
            candidateResumeText: null,
            candidateStrengthsText: null,
            status: "Submitted",
            submittedAt: "2026-03-18 10:00:00"
        });

        const req = {
            body: {
                jobId: 2,
                jobTitle: "Backend Engineer",
                applicantName: "Jordan Candidate",
                applicantEmail: "candidate@talentsync.demo",
                note: "Interested in the role.",
                candidateProfile: {
                    selectedSkills: ["Node", "TypeScript"],
                    experienceSummary: "Backend developer.",
                    resumeText: "Resume text",
                    strengthsText: null
                }
            }
        } as Request;
        const res = createMockResponse();

        createApplication(req, res);

        expect(candidatesRepository.upsertCandidateByEmail).toHaveBeenCalledWith({
            fullName: "Jordan Candidate",
            email: "candidate@talentsync.demo",
            selectedSkills: ["node", "typescript"],
            experienceSummary: "Backend developer.",
            resumeText: "Resume text",
            strengthsText: null
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            candidateId: 9
        }));
    });

    it("returns recruiter match data from the application profile snapshot", async () => {
        vi.mocked(applicationsRepository.getApplicationById).mockReturnValue({
            id: 1,
            jobId: 2,
            jobTitle: "Backend Engineer",
            applicantName: "Jordan Candidate",
            applicantEmail: "candidate@talentsync.demo",
            note: "Interested in the role.",
            candidateSkills: ["node", "typescript"],
            candidateSummary: "Built backend services.",
            candidateResumeText: null,
            candidateStrengthsText: null,
            status: "Submitted",
            submittedAt: "2026-03-18 10:00:00"
        });
        vi.mocked(candidatesRepository.getCandidateByEmail).mockReturnValue(null);
        vi.mocked(findMatches).mockResolvedValue([
            {
                jobId: 2,
                jobTitle: "Backend Engineer",
                score: 85,
                skillScore: 90,
                experienceScore: 80,
                aiScore: null,
                aiReason: null,
                matchedSkills: ["node"],
                matchedKeywords: ["backend"]
            }
        ]);

        const req = { params: { id: "1" } } as unknown as Request;
        const res = createMockResponse();

        await getApplicationMatch(req, res);

        expect(findMatches).toHaveBeenCalledWith(["node", "typescript"], "Built backend services.");
        expect(res.json).toHaveBeenCalledWith({
            match: {
                score: 85,
                skillScore: 90,
                experienceScore: 80,
                matchedSkills: ["node"]
            },
            candidateName: "Jordan Candidate",
            candidateSkills: ["node", "typescript"],
            candidateSummary: "Built backend services."
        });
    });

    it("rejects invalid application email", () => {
        const req = {
            body: {
                jobId: 2,
                jobTitle: "Backend Engineer",
                applicantName: "Jordan Candidate",
                applicantEmail: "not-an-email"
            }
        } as Request;
        const res = createMockResponse();

        createApplication(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "applicantEmail must be a valid email"
        });
    });

    it("updates application status", () => {
        vi.mocked(applicationsRepository.updateApplicationStatus).mockReturnValue({
            id: 1,
            jobId: 2,
            jobTitle: "Backend Engineer",
            applicantName: "Jordan Candidate",
            applicantEmail: "candidate@talentsync.demo",
            note: "Interested in the role.",
            candidateSkills: [],
            candidateSummary: "",
            candidateResumeText: null,
            candidateStrengthsText: null,
            status: "Reviewing",
            submittedAt: "2026-03-18 10:00:00"
        });

        const req = {
            params: { id: "1" },
            body: { status: "Reviewing" }
        } as unknown as Request;
        const res = createMockResponse();

        updateApplicationStatus(req, res);

        expect(applicationsRepository.updateApplicationStatus).toHaveBeenCalledWith(1, "Reviewing");
        expect(res.json).toHaveBeenCalled();
    });
});
