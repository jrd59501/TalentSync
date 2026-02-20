import { Skill } from "./Skill.js";
import { SkillProfile } from "./SkillProfile.js";
import { MatchScore } from "./MatchScore.js";

export class Job { // A job with required skills
    constructor( // Initialize the job with an ID, title, and required skills
        public id: number,
        public title: string,
        public requiredSkills: Skill[]
    ) { }

    calculateMatch(profile: SkillProfile): MatchScore { // Calculate how well a skill profile matches the job's required skills
        let matchCount = 0;

        for (const skill of this.requiredSkills) { // Iterate through each required skill
            if (profile.hasSkill(skill)) {
                matchCount++;
            }
        }

        const percentage = // Calculate the match percentage based on the number of matching skills and total required skills
            this.requiredSkills.length === 0  // Avoid division by zero; if there are no required skills, consider it a perfect match
                ? 0
                : (matchCount / this.requiredSkills.length) * 100; // Calculate the match percentage as a value between 0 and 100

        return new MatchScore(this, percentage); // Return a MatchScore object containing the job and the calculated match percentage
    }
}