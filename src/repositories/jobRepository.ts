import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedJobs } from "../data/seedJobs.js";

// Shape used across app when we talk about a saved job.
export type StoredJob = {
    id: number;
    title: string;
    requiredSkills: string[];
    meaningKeywords: string[];
    category?: string | null;
};

// Input shape for creating/importing a new job row.
export type CreateStoredJobInput = {
    title: string;
    requiredSkills: string[];
    meaningKeywords: string[];
    category?: string | null;
    sourceText?: string | null;
    sourceType?: string | null;
};

// Raw SQLite row shape (snake_case column names from DB).
type StoredJobRow = {
    id: number;
    title: string;
    required_skills: string;
    meaning_keywords: string;
    category: string | null;
};

export class SQLiteJobRepository {
    // Low-level sqlite connection object.
    private readonly db: DatabaseSync;
    // One-time flag so setup work is not repeated.
    private initialized = false;

    constructor(databasePath: string = resolve(process.cwd(), "data", "talentsync.db")) {
        // Ensure ./data exists before opening SQLite file.
        mkdirSync(dirname(databasePath), { recursive: true });
        this.db = new DatabaseSync(databasePath);
        // Try WAL mode first; some filesystems (especially mounted drives) may reject it.
        try {
            this.db.exec("PRAGMA journal_mode = WAL;");
        } catch {
            // Fallback keeps DB usable even when WAL is unsupported.
            try {
                this.db.exec("PRAGMA journal_mode = DELETE;");
            } catch {
                // If database is locked during mode switch, continue with current mode.
            }
        }
        // Wait up to 5s if DB is busy instead of failing fast.
        this.db.exec("PRAGMA busy_timeout = 5000;");
    }

    ensureInitialized(): void {
        // Skip if already initialized in this process.
        if (this.initialized) {
            return;
        }

        // Create base table if missing.
        this.db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            required_skills TEXT NOT NULL,
            meaning_keywords TEXT NOT NULL,
            category TEXT,
            source_text TEXT,
            source_type TEXT
        );
    `);
        // Backward-safe migration: add columns if older DB is missing them.
        this.ensureColumnExists("jobs", "category", "TEXT");
        this.ensureColumnExists("jobs", "source_text", "TEXT");
        this.ensureColumnExists("jobs", "source_type", "TEXT");
        // Basic indexes to speed category filters and default sort use-cases.
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);");

        // Upsert seed jobs so default catalog is always present/updated.
        const upsertJob = this.db.prepare(`
        INSERT INTO jobs (id, title, required_skills, meaning_keywords, category)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            required_skills = excluded.required_skills,
            meaning_keywords = excluded.meaning_keywords,
            category = excluded.category
    `);

        // Transaction keeps seed write atomic.
        this.db.exec("BEGIN");
        try {
            for (const job of seedJobs) {
                upsertJob.run(
                    job.id,
                    job.title,
                    JSON.stringify(job.requiredSkills),
                    JSON.stringify(job.meaningKeywords),
                    null
                );
            }
            this.db.exec("COMMIT");
        } catch (error) {
            this.db.exec("ROLLBACK");
            throw error;
        }

        // Mark setup as complete.
        this.initialized = true;
    }

    getAllJobs(): StoredJob[] {
        // Auto-init DB on first call.
        this.ensureInitialized();
        const rows = this.db
            .prepare("SELECT id, title, required_skills, meaning_keywords, category FROM jobs")
            .all() as StoredJobRow[];

        // Convert DB JSON strings into real arrays.
        return rows.map(row => this.mapStoredJobRow(row));
    }

    getJobById(jobId: number): StoredJob | null {
        this.ensureInitialized();
        // Query one row by PK.
        const row = this.db
            .prepare("SELECT id, title, required_skills, meaning_keywords, category FROM jobs WHERE id = ?")
            .get(jobId) as StoredJobRow | undefined;
        if (!row) {
            return null;
        }

        // Convert row format into app format.
        return this.mapStoredJobRow(row);
    }

    addJob(input: CreateStoredJobInput): StoredJob {
        this.ensureInitialized();
        // Basic cleanup so we avoid empty strings and duplicates.
        const title = input.title.trim();
        const requiredSkills = [...new Set(input.requiredSkills.map(skill => skill.trim()).filter(Boolean))];
        const meaningKeywords = [...new Set(input.meaningKeywords.map(keyword => keyword.trim()).filter(Boolean))];
        const category = input.category ? input.category.trim().slice(0, 80) : null;
        if (!title) {
            throw new Error("Job title is required.");
        }

        // Insert imported/manual job and return saved row.
        const insertJob = this.db.prepare(`
            INSERT INTO jobs (title, required_skills, meaning_keywords, category, source_text, source_type)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, title, required_skills, meaning_keywords, category
        `);

        const row = insertJob.get(
            title,
            JSON.stringify(requiredSkills),
            JSON.stringify(meaningKeywords),
            category,
            input.sourceText ?? null,
            input.sourceType ?? "manual"
        ) as StoredJobRow | undefined;
        if (!row) {
            throw new Error("Failed to save job.");
        }

        // Convert DB row to app object.
        return this.mapStoredJobRow(row);
    }

    searchJobs(filters?: { category?: string; query?: string }): StoredJob[] {
        this.ensureInitialized();
        const normalizedCategory = filters?.category?.trim();
        const normalizedQuery = filters?.query?.trim();
        if (!normalizedCategory && !normalizedQuery) {
            return this.getAllJobs();
        }

        // Build SQL dynamically so we filter in SQLite instead of JS memory.
        const whereClauses: string[] = [];
        const params: Array<string> = [];

        if (normalizedCategory) {
            whereClauses.push("LOWER(COALESCE(category, '')) = LOWER(?)");
            params.push(normalizedCategory);
        }

        if (normalizedQuery) {
            // JSON fields are stored as text, so LIKE is a pragmatic first pass.
            // PERF: leading wildcard (`%query%`) usually cannot use indexes efficiently.
            // If this becomes hot, consider SQLite FTS5 or a dedicated search table.
            whereClauses.push(`(
                LOWER(title) LIKE LOWER(?)
                OR LOWER(COALESCE(category, '')) LIKE LOWER(?)
                OR LOWER(required_skills) LIKE LOWER(?)
                OR LOWER(meaning_keywords) LIKE LOWER(?)
            )`);
            const likePattern = `%${normalizedQuery}%`;
            params.push(likePattern, likePattern, likePattern, likePattern);
        }

        const querySql = `
            SELECT id, title, required_skills, meaning_keywords, category
            FROM jobs
            WHERE ${whereClauses.join(" AND ")}
            ORDER BY id DESC
        `;

        const rows = this.db
            .prepare(querySql)
            .all(...params) as StoredJobRow[];

        return rows.map(row => this.mapStoredJobRow(row));
    }

    deleteJobById(jobId: number): boolean {
        this.ensureInitialized();
        // SQLite returns number of affected rows in `changes`.
        const result = this.db
            .prepare("DELETE FROM jobs WHERE id = ?")
            .run(jobId) as { changes?: number };

        // True if something was actually deleted.
        return (result.changes ?? 0) > 0;
    }

    private ensureColumnExists(tableName: string, columnName: string, columnDefinition: string): void {
        // Read table schema.
        const rows = this.db.prepare(`PRAGMA table_info(${tableName});`).all() as Array<{ name: string }>;
        const exists = rows.some(row => row.name === columnName);
        if (exists) {
            return;
        }

        // Add column only when missing.
        this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
    }

    private mapStoredJobRow(row: StoredJobRow): StoredJob {
        return {
            id: row.id,
            title: row.title,
            requiredSkills: JSON.parse(row.required_skills),
            meaningKeywords: JSON.parse(row.meaning_keywords),
            category: row.category
        };
    }
}

// Shared singleton repository used by app/services.
export const jobsRepository = new SQLiteJobRepository();

// Compatibility exports for existing call sites.
export const ensureJobsDatabase = () => {
    jobsRepository.ensureInitialized();
};

export const getAllJobs = (): StoredJob[] => {
    return jobsRepository.getAllJobs();
};

export const searchJobs = (filters?: { category?: string; query?: string }): StoredJob[] => {
    return jobsRepository.searchJobs(filters);
};

export const getJobById = (jobId: number): StoredJob | null => {
    return jobsRepository.getJobById(jobId);
};

export const deleteJobById = (jobId: number): boolean => {
    return jobsRepository.deleteJobById(jobId);
};
