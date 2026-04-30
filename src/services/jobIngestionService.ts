import { seedJobs } from "../data/seedJobs.js";
import { CreateStoredJobInput, jobsRepository, StoredJob } from "../repositories/jobRepository.js";
import { ExtractedJobProfile, OpenAiJobProfileExtractor } from "./aiScoringService.js";

// Returned after import so caller can see what happened.
export type JobImportResult = {
    job: StoredJob;
    extractionMode: "ai" | "heuristic";
    extractedProfile: ExtractedJobProfile;
};

export type JobPreviewResult = {
    extractionMode: "ai" | "heuristic";
    extractedProfile: ExtractedJobProfile;
};

// Minimal repository write contract.
type JobWriter = {
    addJob: (input: CreateStoredJobInput) => StoredJob;
};

// Minimal extraction contract (AI or other parser).
type JobProfileExtractor = {
    extract: (rawText: string) => Promise<ExtractedJobProfile | null>;
};

const CATEGORY_RULES: Array<{ category: string; terms: string[] }> = [
    { category: "Education", terms: ["teacher", "teaching", "classroom", "curriculum", "student", "school"] },
    { category: "Healthcare", terms: ["patient", "clinical", "nurse", "medical", "hospital", "triage"] },
    { category: "Engineering", terms: ["software", "backend", "frontend", "api", "developer", "typescript", "python"] },
    { category: "Data", terms: ["sql", "analytics", "etl", "airflow", "warehouse", "data"] },
    { category: "Sales", terms: ["sales", "crm", "pipeline", "prospecting", "account"] },
    { category: "Operations", terms: ["operations", "logistics", "inventory", "workflow", "process"] },
    { category: "Customer Support", terms: ["support", "ticket", "customer service", "incident"] }
];

// Common filler words to ignore in heuristic extraction.
const STOP_WORDS = new Set([
    "the", "and", "for", "with", "you", "your", "our", "are", "this", "that", "from", "will", "can",
    "have", "has", "their", "they", "about", "work", "role", "job", "position", "requirements", "required",
    "experience", "skills", "ability", "team", "into", "using", "use", "plus", "year", "years", "including"
]);

// Generic words that are usually too broad to be useful skills.
const GENERIC_TERMS = new Set([
    "experience", "work", "role", "team", "support", "analysis", "management", "communication", "development",
    "operations", "service", "services", "engineer", "developer", "professional", "senior", "junior"
]);

// Basic tokenizer used by heuristic frequency scoring.
const tokenize = (text: string): string[] => {
    return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(token => token.length > 2);
};

// Remove duplicates/empty values.
const unique = (values: string[]): string[] => {
    return [...new Set(values.map(value => value.trim()).filter(Boolean))];
};

// Escape regex control chars before building a dynamic regex.
const escapeRegex = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
};

// Check whether a full term appears in text.
const containsWholeTerm = (text: string, term: string): boolean => {
    const normalizedTerm = escapeRegex(term).replace(/\s+/g, String.raw`\s+`);
    const pattern = `${String.raw`\b`}${normalizedTerm}${String.raw`\b`}`;
    return new RegExp(pattern, "i").test(text);
};

// Keep only useful terms (not too generic, not stop words).
const isSpecificTerm = (term: string): boolean => {
    const normalized = term.toLowerCase().trim();
    if (!normalized || STOP_WORDS.has(normalized) || GENERIC_TERMS.has(normalized)) {
        return false;
    }

    return normalized.length >= 3;
};

export class JobIngestionService {
    // PERF: seed-derived lexicons do not change at runtime, so cache once.
    private readonly requiredSkillLexicon = this.buildRequiredSkillLexicon();
    private readonly keywordLexicon = this.buildKeywordLexicon();

    constructor(
        private readonly jobWriter: JobWriter,
        private readonly extractor: JobProfileExtractor
    ) {}

    async importFromText(
        rawText: string,
        sourceType: string = "manual-paste",
        categoryHint?: string | null
    ): Promise<JobImportResult> {
        const preview = await this.previewFromText(rawText, categoryHint);
        const category = this.resolveCategory(
            preview.extractedProfile.category ?? null,
            categoryHint ?? null,
            rawText,
            preview.extractedProfile.requiredSkills,
            preview.extractedProfile.meaningKeywords
        );
        // Save parsed job into DB.
        const saved = this.jobWriter.addJob({
            title: preview.extractedProfile.title,
            requiredSkills: preview.extractedProfile.requiredSkills,
            meaningKeywords: preview.extractedProfile.meaningKeywords,
            category,
            sourceText: rawText.slice(0, 12000),
            sourceType: sourceType.slice(0, 60)
        });

        // Return both saved row and extraction details for UI/debugging.
        return {
            job: saved,
            extractionMode: preview.extractionMode,
            extractedProfile: preview.extractedProfile
        };
    }

    async previewFromText(rawText: string, categoryHint?: string | null): Promise<JobPreviewResult> {
        // Preview mode is useful in demos because we can show extracted fields
        // before committing anything to the database.
        // Try AI extraction first.
        const aiProfile = await this.extractor.extract(rawText);
        // If AI unavailable/fails, fallback to deterministic heuristic parse.
        const extractedProfile = aiProfile ?? this.heuristicExtract(rawText);
        const category = this.resolveCategory(
            extractedProfile.category ?? null,
            categoryHint ?? null,
            rawText,
            extractedProfile.requiredSkills,
            extractedProfile.meaningKeywords
        );

        return {
            extractionMode: aiProfile ? "ai" : "heuristic",
            extractedProfile: {
                ...extractedProfile,
                category
            }
        };
    }

    private heuristicExtract(rawText: string): ExtractedJobProfile {
        // This fallback keeps the project working even if AI is turned off.
        // It uses simple text rules so the logic is easy to explain in class.
        // Normalize line endings first.
        const normalizedText = rawText.replace(/\r/g, "");
        // Match known required skills mentioned in raw text.
        const matchedSkills = this.requiredSkillLexicon
            .filter(term => isSpecificTerm(term) && containsWholeTerm(normalizedText, term));
        // Match broader keyword terms mentioned in raw text.
        const matchedKeywordsFromLexicon = this.keywordLexicon
            .filter(term => isSpecificTerm(term) && containsWholeTerm(normalizedText, term));
        // Guess title from top lines.
        const title = this.extractTitle(normalizedText);
        // Frequency map helps pull repeated important words.
        const frequency = new Map<string, number>();

        for (const token of tokenize(normalizedText)) {
            // Skip filler tokens.
            if (STOP_WORDS.has(token)) {
                continue;
            }

            frequency.set(token, (frequency.get(token) ?? 0) + 1);
        }

        // Most frequent meaningful terms first.
        const rankedTokens = [...frequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([token]) => token)
            .filter(isSpecificTerm);

        // Keep lists short and unique for better DB quality.
        const requiredSkills = unique(matchedSkills).slice(0, 12);
        const keywordPool = unique([...matchedKeywordsFromLexicon, ...matchedSkills, ...rankedTokens]);
        const meaningKeywords = keywordPool.slice(0, 16);

        return {
            title,
            // If no required skills found, use top keywords as fallback.
            requiredSkills: requiredSkills.length > 0 ? requiredSkills : keywordPool.slice(0, 6),
            // Always return at least one keyword to avoid empty arrays.
            meaningKeywords: meaningKeywords.length > 0 ? meaningKeywords : ["general"],
            category: this.inferCategory(normalizedText, requiredSkills, meaningKeywords)
        };
    }

    private buildRequiredSkillLexicon(): string[] {
        // Required skills from seed data act as known-skill dictionary.
        const terms = unique(seedJobs.flatMap(job => job.requiredSkills.map(term => term.toLowerCase())));

        return terms.sort((a, b) => b.length - a.length);
    }

    private buildKeywordLexicon(): string[] {
        // Keywords + skills from seed data form broader extraction vocabulary.
        const seededTerms = seedJobs.flatMap(job => [...job.requiredSkills, ...job.meaningKeywords]);
        const terms = unique(seededTerms.map(term => term.toLowerCase()).filter(isSpecificTerm));

        // Prioritize multi-word terms first so phrase matches are captured before generic tokens.
        return terms.sort((a, b) => b.length - a.length);
    }

    private extractTitle(rawText: string): string {
        // Split into trimmed non-empty lines for simple heuristics.
        const lines = rawText
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
        // Prefer explicit "Title: ..." line when present.
        const labeledTitle = lines.find(line => /^title\s*[:-]/i.test(line));
        if (labeledTitle) {
            return labeledTitle.replace(/^title\s*[:-]\s*/i, "").slice(0, 120) || "Imported Job Listing";
        }

        // Else use first line if it looks like a title.
        const firstLine = lines[0] ?? "";
        if (firstLine.length >= 4 && firstLine.length <= 120) {
            return firstLine;
        }

        // Last resort fallback.
        return "Imported Job Listing";
    }

    private resolveCategory(
        extractedCategory: string | null,
        categoryHint: string | null,
        rawText: string,
        requiredSkills: string[],
        meaningKeywords: string[]
    ): string | null {
        const preferred = categoryHint?.trim() || extractedCategory?.trim();
        if (preferred) {
            return preferred.slice(0, 80);
        }

        return this.inferCategory(rawText, requiredSkills, meaningKeywords);
    }

    private inferCategory(rawText: string, requiredSkills: string[], meaningKeywords: string[]): string | null {
        // Simple rule-based category guess:
        // count which category vocabulary appears most often.
        const corpus = `${rawText} ${requiredSkills.join(" ")} ${meaningKeywords.join(" ")}`.toLowerCase();
        let bestCategory: string | null = null;
        let bestScore = 0;

        for (const rule of CATEGORY_RULES) {
            let score = 0;
            for (const term of rule.terms) {
                if (corpus.includes(term.toLowerCase())) {
                    score += 1;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestCategory = rule.category;
            }
        }

        return bestScore > 0 ? bestCategory : "General";
    }
}

// Default production wiring.
const defaultJobIngestionService = new JobIngestionService(
    jobsRepository,
    new OpenAiJobProfileExtractor()
);

// Convenience export used by controller/CLI.
export const importJobFromText = async (
    rawText: string,
    sourceType?: string,
    categoryHint?: string | null
): Promise<JobImportResult> => {
    return defaultJobIngestionService.importFromText(rawText, sourceType, categoryHint);
};

export const previewJobFromText = async (
    rawText: string,
    categoryHint?: string | null
): Promise<JobPreviewResult> => {
    return defaultJobIngestionService.previewFromText(rawText, categoryHint);
};
