import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveDatabasePath } from "../config/storage.js";

export type ApplicationStatus = "Submitted" | "Reviewing" | "Accepted" | "Rejected";

export type StoredApplication = {
    id: number;
    jobId: number;
    jobTitle: string;
    applicantName: string;
    applicantEmail: string;
    note: string | null;
    status: ApplicationStatus;
    submittedAt: string;
};

export type CreateApplicationInput = {
    jobId: number;
    jobTitle: string;
    applicantName: string;
    applicantEmail: string;
    note?: string | null;
};

type StoredApplicationRow = {
    id: number;
    job_id: number;
    job_title: string;
    applicant_name: string;
    applicant_email: string;
    note: string | null;
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
                status TEXT NOT NULL DEFAULT 'Submitted',
                submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(applicant_email);");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);");
        this.initialized = true;
    }

    addApplication(input: CreateApplicationInput): StoredApplication {
        this.ensureInitialized();
        const row = this.db.prepare(`
            INSERT INTO applications (job_id, job_title, applicant_name, applicant_email, note, status)
            VALUES (?, ?, ?, ?, ?, 'Submitted')
            RETURNING id, job_id, job_title, applicant_name, applicant_email, note, status, submitted_at
        `).get(
            input.jobId,
            input.jobTitle.trim(),
            input.applicantName.trim(),
            input.applicantEmail.trim().toLowerCase(),
            input.note?.trim() || null
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
            SELECT id, job_id, job_title, applicant_name, applicant_email, note, status, submitted_at
            FROM applications
            ${whereSql}
            ORDER BY id DESC
        `).all(...params) as StoredApplicationRow[];

        return rows.map(row => this.mapStoredApplicationRow(row));
    }

    updateApplicationStatus(applicationId: number, status: ApplicationStatus): StoredApplication | null {
        this.ensureInitialized();
        const row = this.db.prepare(`
            UPDATE applications
            SET status = ?
            WHERE id = ?
            RETURNING id, job_id, job_title, applicant_name, applicant_email, note, status, submitted_at
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
            status: row.status,
            submittedAt: row.submitted_at
        };
    }
}

export const applicationsRepository = new SQLiteApplicationRepository();
