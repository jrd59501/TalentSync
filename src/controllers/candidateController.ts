import { Request, Response } from "express";
import { candidatesRepository } from "../repositories/candidateRepository.js";
import { findMatches } from "../services/matchingService.js";
import { buildCandidateProfile } from "../services/candidateProfileService.js";
import { parsePositiveIntegerId } from "../utils/http.js";
import { isValidOptionalEmail, normalizeSkills } from "../utils/validation.js";
import {
    isOptionalNullableString,
    isOptionalNullableStringWithin,
    isOptionalString,
    isOptionalStringWithin,
    isRequiredString,
    isStringArray
} from "../utils/requestValidation.js";

const INVALID_ID_ERROR = "id must be a positive integer";
const NOT_FOUND_ERROR = "candidate not found";

export const listCandidates = (req: Request, res: Response) => {
    return res.json(candidatesRepository.getAllCandidates());
};

export const getCandidateById = (req: Request, res: Response) => {
    const parsedCandidateId = parsePositiveIntegerId(req.params.id);
    if (parsedCandidateId === null) {
        return res.status(400).json({ error: INVALID_ID_ERROR });
    }

    const candidate = candidatesRepository.getCandidateById(parsedCandidateId);
    if (!candidate) {
        return res.status(404).json({ error: NOT_FOUND_ERROR });
    }

    return res.json(candidate);
};

export const createCandidate = (req: Request, res: Response) => {
    // Read request body fields once.
    const { fullName, email, selectedSkills, experienceSummary, resumeText, strengthsText } = req.body ?? {};
    // Keep validation very explicit so bad input fails early.
    if (!isRequiredString(fullName, 120)) {
        return res.status(400).json({
            error: "fullName is required and must be 120 characters or fewer"
        });
    }
    if (!isStringArray(selectedSkills)) {
        return res.status(400).json({
            error: "selectedSkills must be an array of strings"
        });
    }
    if (!isOptionalString(experienceSummary)) {
        return res.status(400).json({
            error: "experienceSummary must be a string if provided"
        });
    }
    if (!isOptionalNullableString(resumeText)) {
        return res.status(400).json({
            error: "resumeText must be a string if provided"
        });
    }
    if (!isOptionalNullableString(strengthsText)) {
        return res.status(400).json({
            error: "strengthsText must be a string if provided"
        });
    }
    if (!isValidOptionalEmail(email)) {
        return res.status(400).json({
            error: "email must be valid if provided"
        });
    }
    if (!isOptionalStringWithin(experienceSummary, 2000)) {
        return res.status(400).json({
            error: "experienceSummary must be 2000 characters or fewer"
        });
    }
    if (!isOptionalNullableStringWithin(resumeText, 30000)) {
        return res.status(400).json({
            error: "resumeText must be 30000 characters or fewer"
        });
    }
    if (!isOptionalNullableStringWithin(strengthsText, 10000)) {
        return res.status(400).json({
            error: "strengthsText must be 10000 characters or fewer"
        });
    }

    // Normalize and dedupe skill tags before save.
    const normalizedSkills = normalizeSkills(selectedSkills);
    if (normalizedSkills.length === 0 || normalizedSkills.length > 30) {
        return res.status(400).json({
            error: "selectedSkills must contain between 1 and 30 valid skills"
        });
    }

    try {
        const candidate = candidatesRepository.addCandidate({
            fullName,
            email: email ?? null,
            selectedSkills: normalizedSkills,
            experienceSummary: experienceSummary ?? "",
            resumeText: typeof resumeText === "string" ? resumeText : null,
            strengthsText: typeof strengthsText === "string" ? strengthsText : null
        });
        return res.status(201).json(candidate);
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to save candidate"
        });
    }
};

export const previewCandidateProfile = async (req: Request, res: Response) => {
    const { resumeText, strengthsText } = req.body ?? {};
    if (typeof resumeText !== "string" || resumeText.trim().length < 20) {
        return res.status(400).json({ error: "resumeText must be at least 20 characters" });
    }
    if (resumeText.length > 30000) {
        return res.status(400).json({ error: "resumeText must be 30000 characters or fewer" });
    }
    if (!isOptionalNullableString(strengthsText)) {
        return res.status(400).json({ error: "strengthsText must be a string if provided" });
    }
    if (!isOptionalNullableStringWithin(strengthsText, 10000)) {
        return res.status(400).json({ error: "strengthsText must be 10000 characters or fewer" });
    }

    try {
        const built = await buildCandidateProfile({
            resumeText,
            strengthsText: strengthsText ?? ""
        });

        return res.json({
            extractedProfile: built.profile,
            extractionMode: built.extractionMode
        });
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to preview candidate profile"
        });
    }
};

export const importCandidateProfile = async (req: Request, res: Response) => {
    // Import path takes raw resume + strengths text.
    const { fullName, email, resumeText, strengthsText } = req.body ?? {};
    if (!isRequiredString(fullName, 120)) {
        return res.status(400).json({ error: "fullName is required and must be 120 characters or fewer" });
    }
    if (typeof resumeText !== "string" || resumeText.trim().length < 20) {
        return res.status(400).json({ error: "resumeText must be at least 20 characters" });
    }
    if (resumeText.length > 30000) {
        return res.status(400).json({ error: "resumeText must be 30000 characters or fewer" });
    }
    if (!isOptionalString(strengthsText)) {
        return res.status(400).json({ error: "strengthsText must be a string if provided" });
    }
    if (!isOptionalStringWithin(strengthsText, 10000)) {
        return res.status(400).json({ error: "strengthsText must be 10000 characters or fewer" });
    }
    if (!isValidOptionalEmail(email)) {
        return res.status(400).json({ error: "email must be valid if provided" });
    }

    try {
        // Build profile with AI first, fallback heuristic if needed.
        const built = await buildCandidateProfile({
            resumeText,
            strengthsText: strengthsText ?? ""
        });

        // Save extracted profile as a new candidate record.
        const candidate = candidatesRepository.addCandidate({
            fullName,
            email: email ?? null,
            selectedSkills: built.profile.selectedSkills,
            experienceSummary: built.profile.experienceSummary,
            resumeText,
            strengthsText: strengthsText ?? ""
        });

        return res.status(201).json({
            candidate,
            extractedProfile: built.profile,
            extractionMode: built.extractionMode
        });
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to import candidate profile"
        });
    }
};

export const deleteCandidate = (req: Request, res: Response) => {
    const parsedCandidateId = parsePositiveIntegerId(req.params.id);
    if (parsedCandidateId === null) {
        return res.status(400).json({ error: INVALID_ID_ERROR });
    }

    const deleted = candidatesRepository.deleteCandidateById(parsedCandidateId);
    if (!deleted) {
        return res.status(404).json({ error: NOT_FOUND_ERROR });
    }

    return res.status(204).send();
};

export const matchSavedCandidate = async (req: Request, res: Response) => {
    const parsedCandidateId = parsePositiveIntegerId(req.params.id);
    if (parsedCandidateId === null) {
        return res.status(400).json({ error: INVALID_ID_ERROR });
    }

    const candidate = candidatesRepository.getCandidateById(parsedCandidateId);
    if (!candidate) {
        return res.status(404).json({ error: NOT_FOUND_ERROR });
    }

    // Reuse the same matching pipeline used by direct /match.
    const matches = await findMatches(
        normalizeSkills(candidate.selectedSkills),
        candidate.experienceSummary.slice(0, 2000)
    );
    return res.json({
        candidate,
        matches
    });
};
