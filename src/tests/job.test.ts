import { describe, it, expect } from "vitest";
import { Job } from "../domain/Job.js";
import { Skill } from "../domain/Skill.js";
import { SkillProfile } from "../domain/SkillProfile.js";

describe("Job Matching", () => {

    it("should calculate score as the number of matched skills", () => {

        const job = new Job(1, "Backend Dev", [
            new Skill("Node"),
            new Skill("TypeScript"),
            new Skill("SQL")
        ]);

        const profile = new SkillProfile([
            new Skill("Node"),
            new Skill("TypeScript")
        ]);

        const result = job.calculateMatch(profile);

        // 2 required skills match.
        expect(result.score).toBe(2);
    });

    it("should return 0 if no skills match", () => {
        const job = new Job(1, "Backend Dev", [
            new Skill("Node")
        ]);

        const profile = new SkillProfile([
            new Skill("Python")
        ]);

        const result = job.calculateMatch(profile);

        // No required skills match, so score should be 0.
        expect(result.score).toBe(0);
    });

    it("should return 0 when job has no required skills", () => {
        const job = new Job(2, "Generalist", []);
        const profile = new SkillProfile([
            new Skill("Node"),
            new Skill("TypeScript")
        ]);

        const result = job.calculateMatch(profile);

        // Current behavior: if no required skills exist, score is 0.
        expect(result.score).toBe(0);
    });

});
