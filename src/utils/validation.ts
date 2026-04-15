// Basic email format check (intentionally simple for prototype stage).
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared skill normalization to keep matching and storage consistent.
export const normalizeSkills = (skills: string[]): string[] => {
    return [...new Set(
        skills
            .map(skill => skill.trim().toLowerCase())
            .filter(Boolean)
            .filter(skill => skill.length <= 60)
    )];
};

// Accept undefined/null/blank as "no email", otherwise enforce format.
export const isValidOptionalEmail = (email: unknown): boolean => {
    if (email === undefined || email === null) {
        return true;
    }
    if (typeof email !== "string") {
        return false;
    }

    const trimmed = email.trim();
    if (!trimmed) {
        return true;
    }

    return EMAIL_REGEX.test(trimmed);
};
