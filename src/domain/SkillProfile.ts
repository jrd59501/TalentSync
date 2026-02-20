import { Skill } from "./Skill.js";

export class SkillProfile { // A profile of skills that a person has
    constructor(public skills: Skill[]) { } // Initialize with an array of skills

    hasSkill(skill: Skill): boolean { // Check if the profile has a specific skill

        return this.skills.some( // Check if any skill in the profile matches the given skill (case-insensitive)

            s => s.name.toLowerCase() === skill.name.toLowerCase() // Compare skill names in a case-insensitive manner
        );
    }
}