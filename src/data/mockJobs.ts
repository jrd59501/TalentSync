export type MockJob = {
    id: number;
    title: string;
    requiredSkills: string[];
};

// Test-friendly in-memory jobs. Replace this module with DB calls later.
export const mockJobs: MockJob[] = [
    {
        id: 1,
        title: "Junior Backend Developer",
        requiredSkills: ["node", "typescript", "api"]
    },
    {
        id: 2,
        title: "Frontend Developer",
        requiredSkills: ["react", "javascript", "css"]
    },
    {
        id: 3,
        title: "Full Stack Developer",
        requiredSkills: ["node", "react", "typescript", "sql"]
    },
    {
        id: 4,
        title: "QA Engineer",
        requiredSkills: ["testing", "automation", "api"]
    },
    {
        id: 5,
        title: "Support Engineer",
        requiredSkills: []
    }
];
