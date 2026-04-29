import { Request, Response } from "express";
import { applicationsRepository, ApplicationStatus } from "../repositories/applicationRepository.js";
import { candidatesRepository } from "../repositories/candidateRepository.js";
import { findMatches } from "../services/matchingService.js";
import { normalizeSkills } from "../utils/validation.js";
import { parsePositiveIntegerId } from "../utils/http.js";
import { isValidOptionalEmail } from "../utils/validation.js";
import { DemoSession } from "../middleware/security.js";
import {
    isOptionalNullableString,
    isOptionalStringWithin,
    isRequiredString
} from "../utils/requestValidation.js";

const VALID_STATUSES = new Set<ApplicationStatus>(["Submitted", "Reviewing", "Accepted", "Rejected"]);

export const listApplications = (req: Request, res: Response) => {
    const currentUser = res.locals.currentUser as DemoSession | undefined;
    const requestedEmail = typeof req.query.email === "string" ? req.query.email : undefined;
    const requestedStatus = typeof req.query.status === "string" ? req.query.status : undefined;
    // Candidates can only see their own history; recruiters may filter by any applicant email.
    const effectiveEmail = currentUser?.role === "candidate" ? currentUser.email : requestedEmail;

    if (effectiveEmail !== undefined && !isValidOptionalEmail(effectiveEmail)) {
        return res.status(400).json({ error: "email must be valid if provided" });
    }
    if (requestedStatus !== undefined && !VALID_STATUSES.has(requestedStatus as ApplicationStatus)) {
        return res.status(400).json({ error: "status must be one of Submitted, Reviewing, Accepted, Rejected" });
    }

    return res.json(applicationsRepository.getApplications({
        applicantEmail: effectiveEmail,
        status: requestedStatus as ApplicationStatus | undefined
    }));
};

export const createApplication = (req: Request, res: Response) => {
    const currentUser = res.locals.currentUser as DemoSession | undefined;
    const { jobId, jobTitle, applicantName, applicantEmail, note } = req.body ?? {};

    // Validate first so repository code can assume the payload is already safe and complete.
    if (!Number.isInteger(jobId) || jobId < 1) {
        return res.status(400).json({ error: "jobId must be a positive integer" });
    }
    if (!isRequiredString(jobTitle, 120)) {
        return res.status(400).json({ error: "jobTitle is required and must be 120 characters or fewer" });
    }
    if (!isRequiredString(applicantName, 120)) {
        return res.status(400).json({ error: "applicantName is required and must be 120 characters or fewer" });
    }
    if (typeof applicantEmail !== "string" || !applicantEmail.trim() || !isValidOptionalEmail(applicantEmail)) {
        return res.status(400).json({ error: "applicantEmail must be a valid email" });
    }
    // Candidate users are only allowed to submit using the email tied to their signed-in account.
    if (currentUser?.role === "candidate" && applicantEmail.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
        return res.status(403).json({ error: "Candidates can only submit applications for their own email" });
    }
    if (!isOptionalNullableString(note)) {
        return res.status(400).json({ error: "note must be a string if provided" });
    }
    if (!isOptionalStringWithin(note ?? undefined, 2000)) {
        return res.status(400).json({ error: "note must be 2000 characters or fewer" });
    }

    try {
        const application = applicationsRepository.addApplication({
            jobId,
            jobTitle,
            applicantName,
            applicantEmail,
            note: typeof note === "string" ? note : null
        });

        return res.status(201).json(application);
    } catch (error) {
        return res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to save application"
        });
    }
};

export const getApplicationMatch = async (req: Request, res: Response) => {
    const applicationId = parsePositiveIntegerId(req.params.id);
    if (applicationId === null) {
        return res.status(400).json({ error: "id must be a positive integer" });
    }

    const application = applicationsRepository.getApplicationById(applicationId);
    if (!application) {
        return res.status(404).json({ error: "Application not found" });
    }

    const candidate = candidatesRepository.getCandidateByEmail(application.applicantEmail);
    if (!candidate || candidate.selectedSkills.length === 0) {
        return res.json({ match: null, message: "Candidate profile not found in system" });
    }

    const normalizedSkills = normalizeSkills(candidate.selectedSkills);
    const allMatches = await findMatches(normalizedSkills, candidate.experienceSummary);
    const jobMatch = allMatches.find(m => m.jobId === application.jobId);

    if (!jobMatch) {
        return res.json({ match: null, message: "Job not found in matching results" });
    }

    return res.json({
        match: {
            score: jobMatch.score,
            skillScore: jobMatch.skillScore,
            experienceScore: jobMatch.experienceScore,
            matchedSkills: jobMatch.matchedSkills
        },
        candidateName: candidate.fullName,
        candidateSkills: candidate.selectedSkills
    });
};

export const updateApplicationStatus = (req: Request, res: Response) => {
    const parsedApplicationId = parsePositiveIntegerId(req.params.id);
    const nextStatus = req.body?.status;

    // Recruiters use this endpoint to move an application through the review workflow.
    if (parsedApplicationId === null) {
        return res.status(400).json({ error: "id must be a positive integer" });
    }
    if (typeof nextStatus !== "string" || !VALID_STATUSES.has(nextStatus as ApplicationStatus)) {
        return res.status(400).json({ error: "status must be one of Submitted, Reviewing, Accepted, Rejected" });
    }

    const updated = applicationsRepository.updateApplicationStatus(parsedApplicationId, nextStatus as ApplicationStatus);
    if (!updated) {
        return res.status(404).json({ error: "application not found" });
    }

    return res.json(updated);
};
