import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import {
    deleteJobListing,
    getJobListingById,
    importJobListing,
    listJobCategories,
    listJobListings
} from "../controllers/jobController.js";
import { importJobFromText } from "../services/jobIngestionService.js";
import { jobsRepository } from "../repositories/jobRepository.js";

vi.mock("../services/jobIngestionService.js", () => ({
    importJobFromText: vi.fn()
}));
vi.mock("../repositories/jobRepository.js", () => ({
    jobsRepository: {
        getAllJobs: vi.fn(),
        searchJobs: vi.fn(),
        getJobById: vi.fn(),
        deleteJobById: vi.fn()
    }
}));

const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res as Response;
};

describe("importJobListing controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 when rawText is missing or too short", async () => {
        const req = { body: { rawText: "too short" } } as Request;
        const res = createMockResponse();

        await importJobListing(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "rawText must be a string with at least 20 characters"
        });
    });

    it("returns 201 and imported payload on success", async () => {
        const mockedImport = vi.mocked(importJobFromText);
        mockedImport.mockResolvedValue({
            job: {
                id: 200,
                title: "Backend Engineer",
                requiredSkills: ["node", "typescript"],
                meaningKeywords: ["api", "backend", "service"],
                category: null
            },
            extractionMode: "heuristic",
            extractedProfile: {
                title: "Backend Engineer",
                requiredSkills: ["node", "typescript"],
                meaningKeywords: ["api", "backend", "service"],
                category: null
            }
        });

        const req = {
            body: {
                rawText: "Title: Backend Engineer\nNeed Node and TypeScript with API integration background.",
                sourceType: "indeed-copy-paste"
            }
        } as Request;
        const res = createMockResponse();

        await importJobListing(req, res);

        expect(mockedImport).toHaveBeenCalledWith(
            "Title: Backend Engineer\nNeed Node and TypeScript with API integration background.",
            "indeed-copy-paste",
            null
        );
        expect(res.status).toHaveBeenCalledWith(201);
        const payload = vi.mocked(res.json).mock.calls[0][0];
        expect(payload.job.id).toBe(200);
        expect(payload.extractionMode).toBe("heuristic");
    });
});

describe("list/get job controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns all jobs for list endpoint", () => {
        const mockedSearch = vi.mocked(jobsRepository.searchJobs);
        mockedSearch.mockReturnValue([
            { id: 1, title: "A", requiredSkills: ["x"], meaningKeywords: ["k"], category: "Education" },
            { id: 2, title: "B", requiredSkills: ["y"], meaningKeywords: ["m"], category: "Engineering" }
        ]);

        const req = { query: {} } as unknown as Request;
        const res = createMockResponse();
        listJobListings(req, res);

        expect(mockedSearch).toHaveBeenCalledWith({ category: undefined, query: undefined });
        const payload = vi.mocked(res.json).mock.calls[0][0];
        expect(payload).toHaveLength(2);
        expect(payload[0].id).toBe(1);
    });

    it("passes category and query filters to repository search", () => {
        const mockedSearch = vi.mocked(jobsRepository.searchJobs);
        mockedSearch.mockReturnValue([]);

        const req = {
            query: {
                category: "Education",
                q: "teacher"
            }
        } as unknown as Request;
        const res = createMockResponse();
        listJobListings(req, res);

        expect(mockedSearch).toHaveBeenCalledWith({
            category: "Education",
            query: "teacher"
        });
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 400 for too-long query filters", () => {
        const req = {
            query: {
                category: "x".repeat(81),
                q: "teacher"
            }
        } as unknown as Request;
        const res = createMockResponse();
        listJobListings(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "category must be 80 characters or fewer"
        });
    });

    it("returns categories list", () => {
        const mockedGetAll = vi.mocked(jobsRepository.getAllJobs);
        mockedGetAll.mockReturnValue([
            { id: 1, title: "A", requiredSkills: ["x"], meaningKeywords: ["k"], category: "Engineering" },
            { id: 2, title: "B", requiredSkills: ["y"], meaningKeywords: ["m"], category: "Education" },
            { id: 3, title: "C", requiredSkills: ["z"], meaningKeywords: ["n"], category: "Engineering" }
        ]);

        const req = {} as Request;
        const res = createMockResponse();
        listJobCategories(req, res);

        expect(res.json).toHaveBeenCalledWith(["Education", "Engineering"]);
    });

    it("returns a single job for valid id", () => {
        const mockedGetById = vi.mocked(jobsRepository.getJobById);
        mockedGetById.mockReturnValue({
            id: 3,
            title: "Backend Engineer",
            requiredSkills: ["node"],
            meaningKeywords: ["api"],
            category: "Engineering"
        });

        const req = { params: { id: "3" } } as unknown as Request;
        const res = createMockResponse();
        getJobListingById(req, res);

        expect(mockedGetById).toHaveBeenCalledWith(3);
        const payload = vi.mocked(res.json).mock.calls[0][0];
        expect(payload.id).toBe(3);
    });

    it("returns 404 for missing job id", () => {
        const mockedGetById = vi.mocked(jobsRepository.getJobById);
        mockedGetById.mockReturnValue(null);

        const req = { params: { id: "404" } } as unknown as Request;
        const res = createMockResponse();
        getJobListingById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "job not found" });
    });
});

describe("deleteJobListing controller", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 for invalid id", () => {
        const req = { params: { id: "abc" } } as unknown as Request;
        const res = createMockResponse();

        deleteJobListing(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "id must be a positive integer"
        });
    });

    it("returns 404 when job does not exist", () => {
        const mockedDelete = vi.mocked(jobsRepository.deleteJobById);
        mockedDelete.mockReturnValue(false);
        const req = { params: { id: "99999" } } as unknown as Request;
        const res = createMockResponse();

        deleteJobListing(req, res);

        expect(mockedDelete).toHaveBeenCalledWith(99999);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: "job not found"
        });
    });

    it("returns 204 when job is deleted", () => {
        const mockedDelete = vi.mocked(jobsRepository.deleteJobById);
        mockedDelete.mockReturnValue(true);
        const req = { params: { id: "101" } } as unknown as Request;
        const res = createMockResponse();

        deleteJobListing(req, res);

        expect(mockedDelete).toHaveBeenCalledWith(101);
        expect(res.status).toHaveBeenCalledWith(204);
        expect(vi.mocked(res.send)).toHaveBeenCalled();
    });
});
