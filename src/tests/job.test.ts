import { describe, it, expect } from "vitest";
import { Job } from "../domain/Job.js";
import { Skill } from "../domain/Skill.js";
import { SkillProfile } from "../domain/SkillProfile.js";

describe("Job Matching", () => { // Test suite for job matching functionality

    it("should calculate correct match percentage", () => { // Test case to verify that the match percentage is calculated correctly

        const job = new Job(1, "Backend Dev", [ // Create a new job with an ID, title, and required skills
            new Skill("Node"),
            new Skill("TypeScript"),
            new Skill("SQL")
        ]);

        const profile = new SkillProfile([ // Create a skill profile with a set of skills
            new Skill("Node"),
            new Skill("TypeScript")
        ]);

        const result = job.calculateMatch(profile); // Calculate the match score for the given job and skill profile

        expect(result.score).toBeCloseTo(66.66, 1); // Assert that the calculated match percentage is approximately 66.66% (2 out of 3 skills match)
    });

    it("should return 0 if no skills match", () => { // Test case to verify that the match percentage is 0% when there are no matching skills
        const job = new Job(1, "Backend Dev", [ // Create a new job with an ID, title, and required skills
            new Skill("Node")
        ]);

        const profile = new SkillProfile([ // Create a skill profile with a set of skills that do not match the job's required skills
            new Skill("Python")
        ]);

        const result = job.calculateMatch(profile);// Calculate the match score for the given job and skill profile

        expect(result.score).toBe(0); // Assert that the calculated match percentage is 0% (no skills match)
    });

});