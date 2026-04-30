import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabasePath } from "../config/storage.js";
import { seedApplications } from "../data/seedApplications.js";

export type ApplicationStatus = "Submitted" | "Reviewing" | "Accepted" | "Rejected";

export type StoredApplication = {
    id: number;
    jobId: number;
    jobTitle: string;
    applicantName: string;
    applicantEmail: string;
    note: string | null;
    candidateSkills: string[];
    candidateSummary: string;
    candidateResumeText: string | null;
    candidateStrengthsText: string | null;
    status: ApplicationStatus;
    submittedAt: string;
};

export type CreateApplicationInput = {
    jobId: number;
    jobTitle: string;
    applicantName: string;
    applicantEmail: string;
    note?: string | null;
    candidateSkills?: string[];
    candidateSummary?: string;
    candidateResumeText?: string | null;
    candidateStrengthsText?: string | null;
};

type StoredApplicationRow = {
    id: number;
    job_id: number;
    job_title: string;
    applicant_name: string;
    applicant_email: string;
    note: string | null;
    candidate_skills: string | null;
    candidate_summary: string | null;
    candidate_resume_text: string | null;
    candidate_strengths_text: string | null;
    status: ApplicationStatus;
    submitted_at: string;
};

export class SQLiteApplicationRepository {
    private readonly db: DatabaseSync;
    private initialized = false;

    constructor(databasePath: string = resolveDatabasePath()) {
        mkdirSync(dirname(databasePath), { recursive: true });
        this.db = new DatabaseSync(databasePath);
        try {
            this.db.exec("PRAGMA journal_mode = WAL;");
        } catch {
            try {
                this.db.exec("PRAGMA journal_mode = DELETE;");
            } catch {
                // If database is locked during mode switch, continue with current mode.
            }
        }
        this.db.exec("PRAGMA busy_timeout = 5000;");
    }

    ensureInitialized(): void {
        if (this.initialized) {
            return;
        }

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY,
                job_id INTEGER NOT NULL,
                job_title TEXT NOT NULL,
                applicant_name TEXT NOT NULL,
                applicant_email TEXT NOT NULL,
                note TEXT,
                candidate_skills TEXT,
                candidate_summary TEXT,
                candidate_resume_text TEXT,
                candidate_strengths_text TEXT,
                status TEXT NOT NULL DEFAULT 'Submitted',
                submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        this.ensureColumnExists("applications", "candidate_skills", "TEXT");
        this.ensureColumnExists("applications", "candidate_summary", "TEXT");
        this.ensureColumnExists("applications", "candidate_resume_text", "TEXT");
        this.ensureColumnExists("applications", "candidate_strengths_text", "TEXT");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(applicant_email);");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);");

        const upsertApplication = this.db.prepare(`
            INSERT INTO applications (
                id,
                job_id,
                job_title,
                applicant_name,
                applicant_email,
                note,
                candidate_skills,
                candidate_summary,
                candidate_resume_text,
                candidate_strengths_text,
                status,
                submitted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                job_id = excluded.job_id,
                job_title = excluded.job_title,
                applicant_name = excluded.applicant_name,
                applicant_email = excluded.applicant_email,
                note = excluded.note,
                candidate_skills = COALESCE(excluded.candidate_skills, applications.candidate_skills),
                candidate_summary = COALESCE(excluded.candidate_summary, applications.candidate_summary),
                candidate_resume_text = COALESCE(excluded.candidate_resume_text, applications.candidate_resume_text),
                candidate_strengths_text = COALESCE(excluded.candidate_strengths_text, applications.candidate_strengths_text),
                status = excluded.status,
                submitted_at = excluded.submitted_at
        `);

        this.db.exec("BEGIN");
        try {
            for (const app of seedApplications) {
                upsertApplication.run(
                    app.id,
                    app.jobId,
                    app.jobTitle,
                    app.applicantName,
                    app.applicantEmail,
                    app.note,
                    null,
                    null,
                    null,
                    null,
                    app.status,
                    app.submittedAt
                );
            }
            this.db.exec("COMMIT");
        } catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }

        this.initialized = true;
    }

    addApplication(input: CreateApplicationInput): StoredApplication {
        this.ensureInitialized();
        const candidateSkills = [...new Set((input.candidateSkills ?? []).map(skill => skill.trim()).filter(Boolean))];
        const row = this.db.prepare(`
            INSERT INTO applications (
                job_id,
                job_title,
                applicant_name,
                applicant_email,
                note,
                candidate_skills,
                candidate_summary,
                candidate_resume_text,
                candidate_strengths_text,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
            RETURNING
                id,
                job_id,
                job_title,
                applicant_name,
                applicant_email,
                note,
                candidate_skills,
                candidate_summary,
                candidate_resume_text,
                candidate_strengths_text,
                status,
                submitted_at
        `).get(
            input.jobId,
            input.jobTitle.trim(),
            input.applicantName.trim(),
            input.applicantEmail.trim().toLowerCase(),
            input.note?.trim() || null,
            candidateSkills.length > 0 ? JSON.stringify(candidateSkills) : null,
            input.candidateSummary?.trim() || null,
            input.candidateResumeText?.trim().slice(0, 30000) || null,
            input.candidateStrengthsText?.trim().slice(0, 10000) || null
        ) as StoredApplicationRow | undefined;

        if (!row) {
            throw new Error("Failed to save application");
        }

        return this.mapStoredApplicationRow(row);
    }

    getApplications(filters?: { applicantEmail?: string; status?: ApplicationStatus }): StoredApplication[] {
        this.ensureInitialized();
        const whereClauses: string[] = [];
        const params: string[] = [];

        if (filters?.applicantEmail) {
            whereClauses.push("LOWER(applicant_email) = LOWER(?)");
            params.push(filters.applicantEmail.trim());
        }

        if (filters?.status) {
            whereClauses.push("status = ?");
            params.push(filters.status);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const rows = this.db.prepare(`
            SELECT
                id,
                job_id,
                job_title,
                applicant_name,
                applicant_email,
                note,
                candidate_skills,
                candidate_summary,
                candidate_resume_text,
                candidate_strengths_text,
                status,
                submitted_at
            FROM applications
            ${whereSql}
            ORDER BY id DESC
        `).all(...params) as StoredApplicationRow[];

        return rows.map(row => this.mapStoredApplicationRow(row));
    }

    getApplicationById(applicationId: number): StoredApplication | null {
        this.ensureInitialized();
        const row = this.db.prepare(`
            SELECT
                id,
                job_id,
                job_title,
                applicant_name,
                applicant_email,
                note,
                candidate_skills,
                candidate_summary,
                candidate_resume_text,
                candidate_strengths_text,
                status,
                submitted_at
            FROM applications WHERE id = ?
        `).get(applicationId) as StoredApplicationRow | undefined;
        return row ? this.mapStoredApplicationRow(row) : null;
    }

    updateApplicationStatus(applicationId: number, status: ApplicationStatus): StoredApplication | null {
        this.ensureInitialized();
        const row = this.db.prepare(`
            UPDATE applications
            SET status = ?
            WHERE id = ?
            RETURNING
                id,
                job_id,
                job_title,
                applicant_name,
                applicant_email,
                note,
                candidate_skills,
                candidate_summary,
                candidate_resume_text,
                candidate_strengths_text,
                status,
                submitted_at
        `).get(status, applicationId) as StoredApplicationRow | undefined;

        return row ? this.mapStoredApplicationRow(row) : null;
    }

    private mapStoredApplicationRow(row: StoredApplicationRow): StoredApplication {
        return {
            id: row.id,
            jobId: row.job_id,
            jobTitle: row.job_title,
            applicantName: row.applicant_name,
            applicantEmail: row.applicant_email,
            note: row.note,
            candidateSkills: this.parseCandidateSkills(row.candidate_skills),
            candidateSummary: row.candidate_summary ?? "",
            candidateResumeText: row.candidate_resume_text,
            candidateStrengthsText: row.candidate_strengths_text,
            status: row.status,
            submittedAt: row.submitted_at
        };
    }

    private parseCandidateSkills(rawSkills: string | null): string[] {
        if (!rawSkills) {
            return [];
        }

        try {
            const parsed = JSON.parse(rawSkills);
            return Array.isArray(parsed) ? parsed.filter((skill): skill is string => typeof skill === "string") : [];
        } catch {
            return [];
        }
    }

    private ensureColumnExists(tableName: string, columnName: string, columnDefinition: string): void {
        const rows = this.db.prepare(`PRAGMA table_info(${tableName});`).all() as Array<{ name: string }>;
        const exists = rows.some(row => row.name === columnName);
        if (exists) {
            return;
        }

        this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
    }
}

export const applicationsRepository = new SQLiteApplicationRepository();
