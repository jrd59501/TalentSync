import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedCandidates } from "../data/seedCandidates.js";
import { resolveDatabasePath } from "../config/storage.js";

export type StoredCandidate = {
    id: number;
    fullName: string;
    email: string | null;
    selectedSkills: string[];
    experienceSummary: string;
    resumeText: string | null;
    strengthsText: string | null;
    createdAt: string;
};

export type CreateCandidateInput = {
    fullName: string;
    email?: string | null;
    selectedSkills: string[];
    experienceSummary?: string;
    resumeText?: string | null;
    strengthsText?: string | null;
};

type StoredCandidateRow = {
    id: number;
    full_name: string;
    email: string | null;
    selected_skills: string;
    experience_summary: string;
    resume_text: string | null;
    strengths_text: string | null;
    created_at: string;
};

type NormalizedCandidateInput = {
    fullName: string;
    email: string | null;
    selectedSkills: string[];
    experienceSummary: string;
    resumeText: string | null;
    strengthsText: string | null;
};

export class SQLiteCandidateRepository {
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
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT,
                selected_skills TEXT NOT NULL,
                experience_summary TEXT NOT NULL,
                resume_text TEXT,
                strengths_text TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        this.ensureColumnExists("candidates", "resume_text", "TEXT");
        this.ensureColumnExists("candidates", "strengths_text", "TEXT");

        const upsertCandidate = this.db.prepare(`
            INSERT INTO candidates (
                id,
                full_name,
                email,
                selected_skills,
                experience_summary,
                resume_text,
                strengths_text
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                full_name = excluded.full_name,
                email = excluded.email,
                selected_skills = excluded.selected_skills,
                experience_summary = excluded.experience_summary,
                resume_text = excluded.resume_text,
                strengths_text = excluded.strengths_text
        `);

        this.db.exec("BEGIN");
        try {
            for (const candidate of seedCandidates) {
                upsertCandidate.run(
                    candidate.id,
                    candidate.fullName,
                    candidate.email,
                    JSON.stringify(candidate.selectedSkills),
                    candidate.experienceSummary,
                    candidate.resumeText,
                    candidate.strengthsText
                );
            }
            this.db.exec("COMMIT");
        } catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }

        this.initialized = true;
    }

    addCandidate(input: CreateCandidateInput): StoredCandidate {
        this.ensureInitialized();
        const normalized = this.normalizeCandidateInput(input);

        return this.insertCandidate(normalized);
    }

    upsertCandidateByEmail(input: CreateCandidateInput): StoredCandidate {
        this.ensureInitialized();
        const normalized = this.normalizeCandidateInput(input);

        // Email is the link between an application and the saved candidate profile.
        // If a profile for that email exists, update it instead of creating duplicates.
        if (!normalized.email) {
            return this.insertCandidate(normalized);
        }

        const existing = this.db.prepare(`
            SELECT id
            FROM candidates
            WHERE LOWER(email) = LOWER(?)
            ORDER BY id DESC
            LIMIT 1
        `).get(normalized.email) as { id: number } | undefined;

        if (!existing) {
            return this.insertCandidate(normalized);
        }

        const row = this.db.prepare(`
            UPDATE candidates
            SET full_name = ?,
                email = ?,
                selected_skills = ?,
                experience_summary = ?,
                resume_text = ?,
                strengths_text = ?
            WHERE id = ?
            RETURNING id, full_name, email, selected_skills, experience_summary, resume_text, strengths_text, created_at
        `).get(
            normalized.fullName,
            normalized.email,
            JSON.stringify(normalized.selectedSkills),
            normalized.experienceSummary,
            normalized.resumeText,
            normalized.strengthsText,
            existing.id
        ) as StoredCandidateRow | undefined;

        if (!row) {
            throw new Error("Failed to update candidate");
        }

        return this.mapStoredCandidateRow(row);
    }

    private normalizeCandidateInput(input: CreateCandidateInput): NormalizedCandidateInput {
        // Normalize once so every save path stores candidates in the same format.
        const fullName = input.fullName.trim();
        const selectedSkills = [...new Set(input.selectedSkills.map(skill => skill.trim()).filter(Boolean))];
        const experienceSummary = (input.experienceSummary ?? "").trim();
        const resumeText = input.resumeText ? input.resumeText.trim().slice(0, 30000) : null;
        const strengthsText = input.strengthsText ? input.strengthsText.trim().slice(0, 10000) : null;
        const email = input.email ? input.email.trim().toLowerCase() : null;
        if (!fullName) {
            throw new Error("fullName is required");
        }
        if (selectedSkills.length === 0) {
            throw new Error("selectedSkills must include at least one skill");
        }

        return {
            fullName,
            email,
            selectedSkills,
            experienceSummary,
            resumeText,
            strengthsText
        };
    }

    private insertCandidate(input: NormalizedCandidateInput): StoredCandidate {
        const row = this.db.prepare(`
            INSERT INTO candidates (full_name, email, selected_skills, experience_summary, resume_text, strengths_text)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, full_name, email, selected_skills, experience_summary, resume_text, strengths_text, created_at
        `).get(
            input.fullName,
            input.email,
            JSON.stringify(input.selectedSkills),
            input.experienceSummary,
            input.resumeText,
            input.strengthsText
        ) as StoredCandidateRow | undefined;

        if (!row) {
            throw new Error("Failed to save candidate");
        }

        return this.mapStoredCandidateRow(row);
    }

    getAllCandidates(): StoredCandidate[] {
        this.ensureInitialized();
        const rows = this.db.prepare(`
            SELECT id, full_name, email, selected_skills, experience_summary, resume_text, strengths_text, created_at
            FROM candidates
            ORDER BY id DESC
        `).all() as StoredCandidateRow[];

        return rows.map(row => this.mapStoredCandidateRow(row));
    }

    getCandidateById(candidateId: number): StoredCandidate | null {
        this.ensureInitialized();
        const row = this.db.prepare(`
            SELECT id, full_name, email, selected_skills, experience_summary, resume_text, strengths_text, created_at
            FROM candidates
            WHERE id = ?
        `).get(candidateId) as StoredCandidateRow | undefined;

        if (!row) {
            return null;
        }

        return this.mapStoredCandidateRow(row);
    }

    getCandidateByEmail(email: string): StoredCandidate | null {
        this.ensureInitialized();
        const row = this.db.prepare(`
            SELECT id, full_name, email, selected_skills, experience_summary, resume_text, strengths_text, created_at
            FROM candidates
            WHERE LOWER(email) = LOWER(?)
            ORDER BY id DESC
            LIMIT 1
        `).get(email.trim()) as StoredCandidateRow | undefined;
        return row ? this.mapStoredCandidateRow(row) : null;
    }

    deleteCandidateById(candidateId: number): boolean {
        this.ensureInitialized();
        const result = this.db.prepare("DELETE FROM candidates WHERE id = ?").run(candidateId) as { changes?: number };
        return (result.changes ?? 0) > 0;
    }

    private mapStoredCandidateRow(row: StoredCandidateRow): StoredCandidate {
        return {
            id: row.id,
            fullName: row.full_name,
            email: row.email,
            selectedSkills: JSON.parse(row.selected_skills),
            experienceSummary: row.experience_summary,
            resumeText: row.resume_text,
            strengthsText: row.strengths_text,
            createdAt: row.created_at
        };
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

export const candidatesRepository = new SQLiteCandidateRepository();
