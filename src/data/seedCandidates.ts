export type SeedCandidate = {
    id: number;
    fullName: string;
    email: string | null;
    selectedSkills: string[];
    experienceSummary: string;
    resumeText: string | null;
    strengthsText: string | null;
};

export const seedCandidates: SeedCandidate[] = [
    {
        id: 1,
        fullName: "Jordan Patel",
        email: "jordan.patel@example.com",
        selectedSkills: ["node", "typescript", "express", "sql"],
        experienceSummary: "Built backend APIs for scheduling and payroll tools across two startups.",
        resumeText: "Backend engineer with 3 years Node.js and TypeScript experience. Built REST APIs and SQL data models.",
        strengthsText: "Strong at API design, debugging production issues, and communication with frontend teams."
    },
    {
        id: 2,
        fullName: "Maya Robinson",
        email: "maya.robinson@example.com",
        selectedSkills: ["react", "javascript", "css", "accessibility"],
        experienceSummary: "Frontend developer focused on component libraries and accessible design systems.",
        resumeText: "Frontend engineer with React and JavaScript background. Worked on reusable UI components.",
        strengthsText: "I am best at UI quality, accessibility, and translating designs into polished pages."
    },
    {
        id: 3,
        fullName: "Ethan Nguyen",
        email: "ethan.nguyen@example.com",
        selectedSkills: ["python", "sql", "airflow", "etl"],
        experienceSummary: "Data engineer with pipeline orchestration and warehouse optimization experience.",
        resumeText: "Built ETL pipelines in Python and Airflow, focused on warehouse reliability and observability.",
        strengthsText: "Strong at data modeling, automation, and breaking down messy reporting problems."
    },
    {
        id: 4,
        fullName: "Sophia Martinez",
        email: "sophia.martinez@example.com",
        selectedSkills: ["customer service", "communication", "crm", "negotiation"],
        experienceSummary: "Sales representative with SaaS account growth and retention results.",
        resumeText: "Sales professional with CRM workflows and outbound pipeline management experience.",
        strengthsText: "I am good at discovery calls, relationship building, and objection handling."
    },
    {
        id: 5,
        fullName: "Aiden Thompson",
        email: "aiden.thompson@example.com",
        selectedSkills: ["patient care", "charting", "triage", "communication"],
        experienceSummary: "Clinical candidate with hospital intake and patient support experience.",
        resumeText: "Worked in clinic setting handling patient intake, charting, and appointment support.",
        strengthsText: "Calm under pressure and strong at patient communication and accurate documentation."
    },
    {
        id: 6,
        fullName: "Olivia Kim",
        email: "olivia.kim@example.com",
        selectedSkills: ["project management", "scheduling", "documentation", "stakeholder"],
        experienceSummary: "Project coordinator supporting timelines, reporting, and cross-team delivery.",
        resumeText: "Managed project plans, meeting notes, and stakeholder updates across product teams.",
        strengthsText: "I organize teams well and keep projects on track with clear communication."
    },
    {
        id: 7,
        fullName: "Noah Davis",
        email: "noah.davis@example.com",
        selectedSkills: ["aws", "docker", "kubernetes", "ci/cd"],
        experienceSummary: "DevOps engineer with cloud deployment and CI pipeline ownership.",
        resumeText: "Implemented CI/CD pipelines and containerized services on AWS and Kubernetes.",
        strengthsText: "Best at automation, deployment reliability, and reducing downtime."
    },
    {
        id: 8,
        fullName: "Emma Johnson",
        email: "emma.johnson@example.com",
        selectedSkills: ["teaching", "classroom management", "curriculum", "assessment"],
        experienceSummary: "Educator with classroom instruction and student performance planning experience.",
        resumeText: "Teacher with experience in lesson planning, classroom instruction, and student support.",
        strengthsText: "I am good at explaining complex topics clearly and supporting different learning styles."
    }
];
