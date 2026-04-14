import { afterEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SQLiteJobRepository } from "../repositories/jobRepository.js";
import { SQLiteCandidateRepository } from "../repositories/candidateRepository.js";
import { JobIngestionService } from "../services/jobIngestionService.js";
import { CandidateProfileService } from "../services/candidateProfileService.js";
import { JobMatchingService } from "../services/matchingService.js";

const cleanupFiles = (basePath: string) => {
    const candidates = [basePath, `${basePath}-wal`, `${basePath}-shm`];
    for (const file of candidates) {
        if (existsSync(file)) {
            rmSync(file, { force: true });
        }
    }
};

describe("integration flow", () => {
    const tempDbPath = join(tmpdir(), `talentsync-integration-${Date.now()}.db`);

    afterEach(() => {
        cleanupFiles(tempDbPath);
    });

    it("imports job, builds candidate profile, matches, and deletes both records", async () => {
        const jobRepo = new SQLiteJobRepository(tempDbPath);
        const candidateRepo = new SQLiteCandidateRepository(tempDbPath);
        jobRepo.ensureInitialized();
        candidateRepo.ensureInitialized();

        const jobIngestion = new JobIngestionService(
            jobRepo,
            { extract: async () => null } // force deterministic path for stable test output
        );
        const imported = await jobIngestion.importFromText(
            "Title: Classroom Learning Mentor\n" +
            "Need teaching, curriculum planning, classroom management, and student instruction experience.",
            "integration-test",
            "Education"
        );

        const profileService = new CandidateProfileService({
            extract: async () => null // force deterministic path for stable test output
        });
        const builtProfile = await profileService.buildProfile({
            resumeText:
                `Experienced with ${imported.job.requiredSkills.join(", ")} and ${imported.job.meaningKeywords.join(", ")}.`,
            strengthsText: "I am strong in classroom instruction, lesson planning, and student engagement."
        });

        const savedCandidate = candidateRepo.addCandidate({
            fullName: "Integration Candidate",
            email: "integration@example.com",
            selectedSkills: builtProfile.profile.selectedSkills,
            experienceSummary: builtProfile.profile.experienceSummary
        });

        const matcher = new JobMatchingService(
            { getAllJobs: () => jobRepo.getAllJobs() },
            { rerank: async () => null }
        );
        const matches = await matcher.findMatches(
            savedCandidate.selectedSkills,
            savedCandidate.experienceSummary
        );

        expect(matches.length).toBeGreaterThan(0);
        expect(matches.some(match => match.jobId === imported.job.id)).toBe(true);

        const deletedCandidate = candidateRepo.deleteCandidateById(savedCandidate.id);
        const deletedJob = jobRepo.deleteJobById(imported.job.id);

        expect(deletedCandidate).toBe(true);
        expect(deletedJob).toBe(true);
        expect(candidateRepo.getCandidateById(savedCandidate.id)).toBeNull();
        expect(jobRepo.getJobById(imported.job.id)).toBeNull();
    });
});
