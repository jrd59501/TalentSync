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
    isOptionalNullableStringWithin,
    isOptionalStringWithin,
    isRequiredString,
    isStringArray
} from "../utils/requestValidation.js";

const VALID_STATUSES = new Set<ApplicationStatus>(["Submitted", "Reviewing", "Accepted", "Rejected"]);

type ApplicationCandidateProfile = {
    selectedSkills: string[];
    experienceSummary: string;
    resumeText: string | null;
    strengthsText: string | null;
};

type ReviewCandidateProfile = {
    fullName: string;
    selectedSkills: string[];
    experienceSummary: string;
};

const parseApplicationCandidateProfile = (candidateProfile: unknown): {
    profile?: ApplicationCandidateProfile;
    error?: string;
} => {
    // Applications may include a profile snapshot so recruiters can review it later.
    // This parser keeps that optional profile safe before it reaches the database.
    if (candidateProfile === undefined || candidateProfile === null) {
        return {};
    }
    if (typeof candidateProfile !== "object" || Array.isArray(candidateProfile)) {
        return { error: "candidateProfile must be an object if provided" };
    }

    const profile = candidateProfile as Record<string, unknown>;
    if (!isStringArray(profile.selectedSkills)) {
        return { error: "candidateProfile.selectedSkills must be an array of strings" };
    }
    if (!isOptionalStringWithin(profile.experienceSummary, 2000)) {
        return { error: "candidateProfile.experienceSummary must be 2000 characters or fewer" };
    }
    if (!isOptionalNullableStringWithin(profile.resumeText, 30000)) {
        return { error: "candidateProfile.resumeText must be 30000 characters or fewer" };
    }
    if (!isOptionalNullableStringWithin(profile.strengthsText, 10000)) {
        return { error: "candidateProfile.strengthsText must be 10000 characters or fewer" };
    }

    const selectedSkills = normalizeSkills(profile.selectedSkills);
    if (selectedSkills.length === 0 || selectedSkills.length > 30) {
        return { error: "candidateProfile.selectedSkills must contain between 1 and 30 valid skills" };
    }

    return {
        profile: {
            selectedSkills,
            experienceSummary: typeof profile.experienceSummary === "string" ? profile.experienceSummary : "",
            resumeText: typeof profile.resumeText === "string" ? profile.resumeText : null,
            strengthsText: typeof profile.strengthsText === "string" ? profile.strengthsText : null
        }
    };
};

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
    const { jobId, jobTitle, applicantName, applicantEmail, note, candidateProfile } = req.body ?? {};

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

    const parsedCandidateProfile = parseApplicationCandidateProfile(candidateProfile);
    if (parsedCandidateProfile.error) {
        return res.status(400).json({ error: parsedCandidateProfile.error });
    }

    try {
        // When a candidate applies, save their current profile under their email.
        // That is what lets the recruiter open the application and see the profile.
        const savedCandidate = parsedCandidateProfile.profile
            ? candidatesRepository.upsertCandidateByEmail({
                fullName: applicantName,
                email: applicantEmail,
                selectedSkills: parsedCandidateProfile.profile.selectedSkills,
                experienceSummary: parsedCandidateProfile.profile.experienceSummary,
                resumeText: parsedCandidateProfile.profile.resumeText,
                strengthsText: parsedCandidateProfile.profile.strengthsText
            })
            : null;

        const application = applicationsRepository.addApplication({
            jobId,
            jobTitle,
            applicantName,
            applicantEmail,
            note: typeof note === "string" ? note : null,
            candidateSkills: parsedCandidateProfile.profile?.selectedSkills,
            candidateSummary: parsedCandidateProfile.profile?.experienceSummary,
            candidateResumeText: parsedCandidateProfile.profile?.resumeText,
            candidateStrengthsText: parsedCandidateProfile.profile?.strengthsText
        });

        return res.status(201).json({
            ...application,
            candidateId: savedCandidate?.id ?? null
        });
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

    // Recruiter review starts from the application profile snapshot.
    // If the snapshot is empty, fall back to the saved candidate profile by email.
    const candidate = candidatesRepository.getCandidateByEmail(application.applicantEmail);
    const reviewProfile: ReviewCandidateProfile | null = application.candidateSkills.length > 0
        ? {
            fullName: application.applicantName,
            selectedSkills: application.candidateSkills,
            experienceSummary: application.candidateSummary || application.note || ""
        }
        : candidate
            ? {
                fullName: candidate.fullName,
                selectedSkills: candidate.selectedSkills,
                experienceSummary: candidate.experienceSummary
            }
            : application.note
                ? {
                    fullName: application.applicantName,
                    selectedSkills: [],
                    experienceSummary: application.note
                }
                : null;

    if (!reviewProfile) {
        return res.json({ match: null, message: "No candidate profile or application note is available for matching." });
    }

    // Run the same matching logic used elsewhere, then return only the score for this job.
    const normalizedSkills = normalizeSkills(reviewProfile.selectedSkills);
    const allMatches = await findMatches(normalizedSkills, reviewProfile.experienceSummary);
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
        candidateName: reviewProfile.fullName,
        candidateSkills: reviewProfile.selectedSkills,
        candidateSummary: reviewProfile.experienceSummary
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
