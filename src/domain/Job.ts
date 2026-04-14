import { Skill } from "./Skill.js";
import { SkillProfile } from "./SkillProfile.js";
import { MatchScore } from "./MatchScore.js";

export class Job {
    // A Job has an id, title, and the skills needed for that role.
    constructor(
        public id: number,
        public title: string,
        public requiredSkills: Skill[]
    ) { }

    calculateMatch(profile: SkillProfile): MatchScore {
        // Count how many required job skills appear in the user's profile.
        let matchCount = 0;

        for (const skill of this.requiredSkills) {
            if (profile.hasSkill(skill)) {
                matchCount++;
            }
        }

        // Score is the total number of matching skills.
        // If there are no required skills, matchCount is naturally 0.
        return new MatchScore(this, matchCount);
    }
}
