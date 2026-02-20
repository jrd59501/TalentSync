type Job = {
    id: number;
    title: string;
    requiredSkills: string[];
};

const mockJobs: Job[] = [
    {
        id: 1,
        title: "Junior Backend Developer",
        requiredSkills: ["node", "typescript", "api"]
    },
    {
        id: 2,
        title: "Frontend Developer",
        requiredSkills: ["react", "javascript", "css"]
    }
];

export const findMatches = (
    selectedSkills: string[],
    experienceSummary: string
) => {
    return mockJobs.map(job => {
        const matchCount = job.requiredSkills.filter(skill =>
            selectedSkills.includes(skill)
        ).length;

        return {
            jobTitle: job.title,
            score: matchCount
        };
    }).sort((a, b) => b.score - a.score);
};