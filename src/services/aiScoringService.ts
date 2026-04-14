export type AiRerankInput = {
    // Candidate profile pieces.
    selectedSkills: string[];
    experienceSummary: string;
    // Shortlisted jobs to rerank.
    jobs: Array<{
        jobId: number;
        jobTitle: string;
        requiredSkills: string[];
        meaningKeywords: string[];
        baselineScore: number;
    }>;
};

export type AiRerankResult = {
    // Must map back to original job ID.
    jobId: number;
    // AI fit score from 0-100.
    aiScore: number;
    // Human-readable short explanation.
    reason: string;
};

export type ExtractedJobProfile = {
    // Job title extracted from raw text.
    title: string;
    // Core skills AI thinks are required.
    requiredSkills: string[];
    // Supporting keywords for matching context.
    meaningKeywords: string[];
    // Broad group for filtering, e.g. Education/Engineering.
    category?: string | null;
};

export type ExtractedCandidateProfile = {
    selectedSkills: string[];
    experienceSummary: string;
};

// Chat Completions endpoint used by both AI flows.
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

// Safety helper to keep scores inside 0..100.
const clampScore = (value: number): number => {
    if (Number.isNaN(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
};

// Parse AI output for reranking (expects JSON array).
const parseJsonArray = (content: string): AiRerankResult[] => {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced ? fenced[1].trim() : trimmed;

    const parsed = JSON.parse(jsonText) as unknown;
    // If model did not return array, treat as unusable.
    if (!Array.isArray(parsed)) {
        return [];
    }

    // Keep only well-formed rows.
    return parsed
        .map(item => {
            if (!item || typeof item !== "object") {
                return null;
            }

            const candidate = item as Partial<AiRerankResult>;

            if (typeof candidate.jobId !== "number") {
                return null;
            }

            // Normalize score and trim reason text.
            const aiScore = clampScore(Number(candidate.aiScore));
            const reason = typeof candidate.reason === "string" ? candidate.reason.trim().slice(0, 220) : "";

            return {
                jobId: candidate.jobId,
                aiScore,
                reason
            };
        })
        .filter((item): item is AiRerankResult => item !== null);
};

// Normalize array-like AI values into clean lowercase list.
const normalizeList = (value: unknown, maxSize: number): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalized = value
        .map(item => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter(Boolean);

    return [...new Set(normalized)].slice(0, maxSize);
};

// Parse AI output for extractor flow (expects JSON object).
const parseJsonObject = (content: string): Record<string, unknown> | null => {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced ? fenced[1].trim() : trimmed;
    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
    }

    return parsed as Record<string, unknown>;
};

export class OpenAiReranker {
    constructor(
        private readonly apiUrl: string = OPENAI_API_URL,
        private readonly model?: string
    ) {}

    async rerank(input: AiRerankInput): Promise<AiRerankResult[] | null> {
        // If key is missing, run in deterministic fallback mode.
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || input.jobs.length === 0) {
            return null;
        }

        // Per-request timeout so API call cannot hang forever.
        const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? "8000");
        const model = this.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const promptPayload = {
            selectedSkills: input.selectedSkills,
            experienceSummary: input.experienceSummary,
            jobs: input.jobs
        };

        try {
            // Ask AI to score shortlisted jobs against candidate profile.
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model,
                    temperature: 0.2,
                    messages: [
                        {
                            role: "system",
                            content: "You score job fit from 0-100. Return only valid JSON array with objects: jobId(number), aiScore(number), reason(string max 25 words)."
                        },
                        {
                            role: "user",
                            content: `Score each job for candidate fit.\n${JSON.stringify(promptPayload)}`
                        }
                    ]
                })
            });

            // Any non-200 response returns null (caller uses fallback).
            if (!response.ok) {
                return null;
            }

            const data = await response.json() as {
                choices?: Array<{
                    message?: {
                        content?: string;
                    };
                }>;
            };

            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                return null;
            }

            // Parse and sanitize model response.
            return parseJsonArray(content);
        } catch {
            // Network/JSON errors should not crash matching.
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export class OpenAiJobProfileExtractor {
    constructor(
        private readonly apiUrl: string = OPENAI_API_URL,
        private readonly model?: string
    ) {}

    async extract(rawText: string): Promise<ExtractedJobProfile | null> {
        // If key missing or no text provided, skip AI extraction.
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || !rawText.trim()) {
            return null;
        }

        const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? "8000");
        const model = this.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // Ask AI to convert raw job post text into structured fields.
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model,
                    temperature: 0.1,
                    messages: [
                        {
                            role: "system",
                            content: "Extract a job profile from text. Return only JSON object with fields: title(string), requiredSkills(string[]), meaningKeywords(string[]), category(string short label)."
                        },
                        {
                            role: "user",
                            content: rawText
                        }
                    ]
                })
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json() as {
                choices?: Array<{
                    message?: {
                        content?: string;
                    };
                }>;
            };

            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                return null;
            }

            const parsed = parseJsonObject(content);
            if (!parsed) {
                return null;
            }

            // Validate and normalize extracted fields.
            const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
            const requiredSkills = normalizeList(parsed.requiredSkills, 15);
            const meaningKeywords = normalizeList(parsed.meaningKeywords, 20);
            const category = typeof parsed.category === "string" ? parsed.category.trim().slice(0, 80) : null;
            if (!title || requiredSkills.length === 0 || meaningKeywords.length === 0) {
                return null;
            }

            return {
                title: title.slice(0, 120),
                requiredSkills,
                meaningKeywords,
                category
            };
        } catch {
            // Any parse/network issue falls back to deterministic extractor.
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export class OpenAiCandidateProfileExtractor {
    constructor(
        private readonly apiUrl: string = OPENAI_API_URL,
        private readonly model?: string
    ) {}

    async extract(input: { resumeText: string; strengthsText: string }): Promise<ExtractedCandidateProfile | null> {
        const apiKey = process.env.OPENAI_API_KEY;
        const combined = `${input.resumeText}\n\n${input.strengthsText}`.trim();
        if (!apiKey || !combined) {
            return null;
        }

        const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? "8000");
        const model = this.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model,
                    temperature: 0.1,
                    messages: [
                        {
                            role: "system",
                            content: "Extract candidate profile from resume and strengths text. Return only JSON object with selectedSkills(string[]) and experienceSummary(string, max 120 words)."
                        },
                        {
                            role: "user",
                            content: JSON.stringify(input)
                        }
                    ]
                })
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json() as {
                choices?: Array<{
                    message?: {
                        content?: string;
                    };
                }>;
            };

            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                return null;
            }

            const parsed = parseJsonObject(content);
            if (!parsed) {
                return null;
            }

            const selectedSkills = normalizeList(parsed.selectedSkills, 20);
            const experienceSummary = typeof parsed.experienceSummary === "string"
                ? parsed.experienceSummary.trim().slice(0, 1200)
                : "";

            if (selectedSkills.length === 0) {
                return null;
            }

            return {
                selectedSkills,
                experienceSummary
            };
        } catch {
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }
}

// Default singleton instance for backward-compatible helper export.
const defaultOpenAiReranker = new OpenAiReranker();

// Compatibility export for existing call sites.
export const rerankJobsWithAI = async (
    input: AiRerankInput
): Promise<AiRerankResult[] | null> => {
    return defaultOpenAiReranker.rerank(input);
};
