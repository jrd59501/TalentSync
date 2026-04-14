import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import {
    createApplication,
    listApplications,
    updateApplicationStatus
} from "../controllers/applicationController.js";
import { applicationsRepository } from "../repositories/applicationRepository.js";

vi.mock("../repositories/applicationRepository.js", () => ({
    applicationsRepository: {
        getApplications: vi.fn(),
        addApplication: vi.fn(),
        updateApplicationStatus: vi.fn()
    }
}));

const createMockResponse = () => {
    const res: Partial<Response> = {};
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
