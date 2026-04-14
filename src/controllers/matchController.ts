import { Request, Response } from "express";
import { findMatches } from "../services/matchingService.js";
import { normalizeSkills } from "../utils/validation.js";
import { isOptionalStringWithin, isStringArray } from "../utils/requestValidation.js";

export const matchUser = async (req: Request, res: Response) => {
    // This endpoint stays thin: validate input here, then hand matching off to the service layer.
    const { selectedSkills, experienceSummary } = req.body;
    // Always force summary into a string so matching logic stays safe.
    const safeExperienceSummary = typeof experienceSummary === "string" ? experienceSummary : "";

    // Validate input shape early (fail fast).
    if (!isStringArray(selectedSkills)) {
        return res.status(400).json({
            error: "selectedSkills must be an array of strings"
        });
    }
    if (!isOptionalStringWithin(experienceSummary, 2000)) {
        return res.status(400).json({
            error: "experienceSummary must be 2000 characters or fewer"
        });
    }

    // Normalize to keep matching behavior stable regardless of client casing/spacing.
    const normalizedSkills = normalizeSkills(selectedSkills);
    if (normalizedSkills.length === 0 || normalizedSkills.length > 30) {
        return res.status(400).json({
            error: "selectedSkills must contain between 1 and 30 valid skills"
        });
    }

    // The service handles ranking so the controller stays focused on HTTP concerns.
    const results = await findMatches(normalizedSkills, safeExperienceSummary);

    // Send ranking results back to caller.
    return res.json(results);
};
