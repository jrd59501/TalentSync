import type { ApplicationStatus } from "../repositories/applicationRepository.js";

export type SeedApplication = {
    id: number;
    jobId: number;
    jobTitle: string;
    applicantName: string;
    applicantEmail: string;
    note: string | null;
    status: ApplicationStatus;
    submittedAt: string;
};

export const seedApplications: SeedApplication[] = [
    {
        id: 1,
        jobId: 1,
        jobTitle: "Junior Backend Developer",
        applicantName: "Jordan Patel",
        applicantEmail: "jordan.patel@example.com",
        note: "3 years of Node.js and TypeScript experience. Worked on REST APIs for scheduling and payroll tools.",
        status: "Reviewing",
        submittedAt: "2026-04-10T14:32:00Z"
    },
    {
        id: 2,
        jobId: 2,
        jobTitle: "Frontend Developer",
        applicantName: "Maya Robinson",
        applicantEmail: "maya.robinson@example.com",
        note: "Frontend is my specialty — happy to share component library and accessibility work.",
        status: "Submitted",
        submittedAt: "2026-04-12T09:15:00Z"
    },
    {
        id: 3,
        jobId: 24,
        jobTitle: "Data Engineer",
        applicantName: "Ethan Nguyen",
        applicantEmail: "ethan.nguyen@example.com",
        note: "Led ETL pipeline builds for two data-heavy teams. Strong Airflow and warehouse experience.",
        status: "Accepted",
        submittedAt: "2026-04-08T11:00:00Z"
    },
    {
        id: 4,
        jobId: 36,
        jobTitle: "Sales Representative",
        applicantName: "Sophia Martinez",
        applicantEmail: "sophia.martinez@example.com",
        note: "Consistently hit 120% of quota the last three quarters. Experienced with CRM and outbound pipeline.",
        status: "Reviewing",
        submittedAt: "2026-04-14T16:45:00Z"
    },
    {
        id: 5,
        jobId: 26,
        jobTitle: "Registered Nurse",
        applicantName: "Aiden Thompson",
        applicantEmail: "aiden.thompson@example.com",
        note: "Available to start immediately. Experienced in patient intake, triage, and clinical charting.",
        status: "Submitted",
        submittedAt: "2026-04-15T08:30:00Z"
    },
    {
        id: 6,
        jobId: 38,
        jobTitle: "Project Coordinator",
        applicantName: "Olivia Kim",
        applicantEmail: "olivia.kim@example.com",
        note: "Managed cross-functional delivery timelines for 10+ concurrent projects across product teams.",
        status: "Accepted",
        submittedAt: "2026-04-07T13:20:00Z"
    },
    {
        id: 7,
        jobId: 6,
        jobTitle: "DevOps Engineer",
        applicantName: "Noah Davis",
        applicantEmail: "noah.davis@example.com",
        note: "CI/CD specialist with deep Kubernetes and AWS experience. Reduced deploy time by 60%.",
        status: "Rejected",
        submittedAt: "2026-04-09T10:00:00Z"
    },
    {
        id: 8,
        jobId: 28,
        jobTitle: "Teacher",
        applicantName: "Emma Johnson",
        applicantEmail: "emma.johnson@example.com",
        note: "Certified educator with 5 years classroom experience. Passionate about differentiated instruction.",
        status: "Reviewing",
        submittedAt: "2026-04-13T15:00:00Z"
    }
];
