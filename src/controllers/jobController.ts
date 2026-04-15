import { Request, Response } from "express";
import { importJobFromText, previewJobFromText } from "../services/jobIngestionService.js";
import { jobsRepository } from "../repositories/jobRepository.js";
import { parsePositiveIntegerId } from "../utils/http.js";
import { normalizeSkills } from "../utils/validation.js";
import {
    isOptionalNullableString,
    isOptionalNullableStringWithin,
    isOptionalString,
    isOptionalStringWithin,
    isRequiredString,
    isStringArray
} from "../utils/requestValidation.js";

const INVALID_ID_ERROR = "id must be a positive integer";
const NOT_FOUND_ERROR = "job not found";

type CreateJobListingBody = {
    title?: unknown;
    requiredSkills?: unknown;
    meaningKeywords?: unknown;
    category?: unknown;
    sourceType?: unknown;
    sourceText?: unknown;
};

type CreateJobListingInput = {
    title: string;
    requiredSkills: string[];
    meaningKeywords: string[];
    category: string | null;
    sourceType: string;
    sourceText: string | null;
};

const getCreateJobListingError = (body: CreateJobListingBody): string | null => {
    if (!isRequiredString(body.title, 120)) {
        return "title is required and must be 120 characters or fewer";
    }
    if (!isStringArray(body.requiredSkills)) {
        return "requiredSkills must be an array of strings";
    }
    if (!isStringArray(body.meaningKeywords)) {
        return "meaningKeywords must be an array of strings";
    }
    if (!isOptionalNullableString(body.category)) {
        return "category must be a string if provided";
    }
    if (!isOptionalNullableStringWithin(body.category, 80)) {
        return "category must be 80 characters or fewer";
    }
    if (!isOptionalNullableString(body.sourceType)) {
        return "sourceType must be a string if provided";
    }
    if (!isOptionalNullableString(body.sourceText)) {
        return "sourceText must be a string if provided";
    }
    if (!isOptionalNullableStringWithin(body.sourceText, 20000)) {
        return "sourceText must be 20000 characters or fewer";
    }

    return null;
};

const normalizeCreateJobListingInput = (body: CreateJobListingBody): CreateJobListingInput => {
    const normalizedRequiredSkills = normalizeSkills(body.requiredSkills as string[]).slice(0, 20);
    const normalizedMeaningKeywords = normalizeSkills(body.meaningKeywords as string[]).slice(0, 30);

    return {
        title: (body.title as string).trim(),
        requiredSkills: normalizedRequiredSkills,
        meaningKeywords: normalizedMeaningKeywords,
        category: typeof body.category === "string" ? body.category : null,
        sourceType: typeof body.sourceType === "string" ? body.sourceType : "ui-draft-save",
        sourceText: typeof body.sourceText === "string" ? body.sourceText.slice(0, 12000) : null
    };
};

export const listJobListings = (req: Request, res: Response) => {
    // Optional query filters for employer browsing.
    const requestedCategory = typeof req.query.category === "string" ? req.query.category : undefined;
    const freeTextQuery = typeof req.query.q === "string" ? req.query.q : undefined;
    if (!isOptionalStringWithin(requestedCategory, 80)) {
        return res.status(400).json({ error: "category must be 80 characters or fewer" });
    }
    if (!isOptionalStringWithin(freeTextQuery, 120)) {
        return res.status(400).json({ error: "q must be 120 characters or fewer" });
    }
    const jobs = jobsRepository.searchJobs({ category: requestedCategory, query: freeTextQuery });
    return res.json(jobs);
};

export const listJobCategories = (req: Request, res: Response) => {
    // PERF: this loads all jobs then dedupes in memory.
    // If data grows a lot, move this to SELECT DISTINCT category in repository.
    const categories = [...new Set(
        jobsRepository
            .getAllJobs()
            .map(job => job.category?.trim())
            .filter((value): value is string => Boolean(value))
    )].sort((a, b) => a.localeCompare(b));

    return res.json(categories);
};

export const getJobListingById = (req: Request, res: Response) => {
    // Parse and validate job id once.
    const parsedJobId = parsePositiveIntegerId(req.params.id);
    if (parsedJobId === null) {
        return res.status(400).json({
            error: INVALID_ID_ERROR
        });
    }

    // Lookup by primary key.
    const job = jobsRepository.getJobById(parsedJobId);
    if (!job) {
        // Job does not exist.
        return res.status(404).json({
            error: NOT_FOUND_ERROR
        });
    }

    // Found job, return it.
    return res.json(job);
};

export const importJobListing = async (req: Request, res: Response) => {
    // rawText = pasted job listing text from employer/source site.
    const { rawText, sourceType, category: categoryInput } = req.body ?? {};
    // Basic validation so parser has enough input.
    if (typeof rawText !== "string" || rawText.trim().length < 20) {
        return res.status(400).json({
            error: "rawText must be a string with at least 20 characters"
        });
    }
    if (rawText.length > 20000) {
        return res.status(400).json({
            error: "rawText must be 20000 characters or fewer"
        });
    }
    if (!isOptionalString(sourceType)) {
        return res.status(400).json({
            error: "sourceType must be a string if provided"
        });
    }
    if (!isOptionalNullableString(categoryInput)) {
        return res.status(400).json({
            error: "category must be a string if provided"
        });
    }
    if (!isOptionalNullableStringWithin(categoryInput, 80)) {
        return res.status(400).json({
            error: "category must be 80 characters or fewer"
        });
    }

    // Keep source type consistent for auditing/debugging.
    const normalizedSourceType = typeof sourceType === "string" ? sourceType : "manual-paste";
    const normalizedCategory = typeof categoryInput === "string" ? categoryInput : null;
    // AI-first extraction with fallback is handled inside service.
    const result = await importJobFromText(rawText, normalizedSourceType, normalizedCategory);
    // 201 = created.
    return res.status(201).json(result);
};

export const previewJobListing = async (req: Request, res: Response) => {
    const { rawText, category: categoryInput } = req.body ?? {};
    if (typeof rawText !== "string" || rawText.trim().length < 20) {
        return res.status(400).json({
            error: "rawText must be a string with at least 20 characters"
        });
    }
    if (rawText.length > 20000) {
        return res.status(400).json({
            error: "rawText must be 20000 characters or fewer"
        });
    }
    if (!isOptionalNullableString(categoryInput)) {
        return res.status(400).json({
            error: "category must be a string if provided"
        });
    }
    if (!isOptionalNullableStringWithin(categoryInput, 80)) {
        return res.status(400).json({
            error: "category must be 80 characters or fewer"
        });
    }

    const normalizedCategory = typeof categoryInput === "string" ? categoryInput : null;
    const result = await previewJobFromText(rawText, normalizedCategory);
    return res.json(result);
};

export const createJobListing = (req: Request, res: Response) => {
    const body = (req.body ?? {}) as CreateJobListingBody;
    const validationError = getCreateJobListingError(body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const normalizedInput = normalizeCreateJobListingInput(body);

    if (normalizedInput.requiredSkills.length === 0) {
        return res.status(400).json({ error: "requiredSkills must contain at least one valid skill" });
    }
    if (normalizedInput.meaningKeywords.length === 0) {
        return res.status(400).json({ error: "meaningKeywords must contain at least one valid keyword" });
    }

    try {
        const job = jobsRepository.addJob(normalizedInput);

        return res.status(201).json(job);
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to save job"
        });
    }
};

export const deleteJobListing = (req: Request, res: Response) => {
    // Parse and validate job id once.
    const parsedJobId = parsePositiveIntegerId(req.params.id);
    if (parsedJobId === null) {
        return res.status(400).json({
            error: INVALID_ID_ERROR
        });
    }

    // Attempt delete in repository.
    const deleted = jobsRepository.deleteJobById(parsedJobId);
    if (!deleted) {
        // Nothing deleted usually means unknown ID.
        return res.status(404).json({
            error: NOT_FOUND_ERROR
        });
    }

    // 204 = success with no response body.
    return res.status(204).send();
};
