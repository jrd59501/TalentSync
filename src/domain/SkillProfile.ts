import { Skill } from "./Skill.js";

export class SkillProfile {
    // A SkillProfile is the list of skills a person has.
    constructor(public skills: Skill[]) { }

    hasSkill(skill: Skill): boolean {
        // Compare names in lowercase so "Node" and "node" are treated the same.
        return this.skills.some(
            s => s.name.toLowerCase() === skill.name.toLowerCase()
        );
    }
}
