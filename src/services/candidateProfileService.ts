import { seedJobs } from "../data/seedJobs.js";
import { ExtractedCandidateProfile, OpenAiCandidateProfileExtractor } from "./aiScoringService.js";

export type CandidateProfileBuildInput = {
    resumeText: string;
    strengthsText: string;
};

export type CandidateProfileBuildResult = {
    profile: ExtractedCandidateProfile;
    extractionMode: "ai" | "heuristic";
};

type CandidateProfileExtractor = {
    extract: (input: CandidateProfileBuildInput) => Promise<ExtractedCandidateProfile | null>;
};

// Common filler words excluded from heuristic token scoring.
const STOP_WORDS = new Set([
    "the", "and", "for", "with", "you", "your", "our", "are", "this", "that", "from", "will", "can",
    "have", "has", "their", "they", "about", "work", "role", "job", "position", "requirements", "required",
    "experience", "skills", "ability", "team", "into", "using", "use", "plus", "year", "years", "including"
]);

// Normalize and dedupe list values for stable downstream behavior.
const unique = (values: string[]): string[] => {
    return [...new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean))];
};

// Very simple tokenization for fallback extraction.
const tokenize = (text: string): string[] => {
    return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(token => token.length > 2);
};

const escapeRegex = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Phrase-level match helper used against skill lexicon.
const containsWholeTerm = (text: string, term: string): boolean => {
    const pattern = `\\b${escapeRegex(term).replace(/\s+/g, "\\s+")}\\b`;
    return new RegExp(pattern, "i").test(text);
};

export class CandidateProfileService {
    // PERF: seedJobs is static, so cache this lexicon once per service instance.
    private readonly skillLexicon = unique(seedJobs.flatMap(job => [...job.requiredSkills, ...job.meaningKeywords]));

    constructor(private readonly extractor: CandidateProfileExtractor) {}

    async buildProfile(input: CandidateProfileBuildInput): Promise<CandidateProfileBuildResult> {
        // AI-first extraction.
        const ai = await this.extractor.extract(input);
        if (ai && ai.selectedSkills.length > 0) {
            return {
                profile: {
                    selectedSkills: unique(ai.selectedSkills).slice(0, 20),
                    experienceSummary: ai.experienceSummary.trim()
                },
                extractionMode: "ai"
            };
        }

        return {
            // Deterministic fallback when AI is unavailable/empty.
            profile: this.heuristicProfile(input),
            extractionMode: "heuristic"
        };
    }

    private heuristicProfile(input: CandidateProfileBuildInput): ExtractedCandidateProfile {
        // Combine both user-provided text sources for richer extraction.
        const combinedText = `${input.resumeText}\n\n${input.strengthsText}`.trim();
        // Use seeded job vocabulary as a practical skill/keyword lexicon.
        const matchedTerms = this.skillLexicon
            .filter(term => containsWholeTerm(combinedText, term))
            .slice(0, 24);

        const frequency = new Map<string, number>();
        for (const token of tokenize(combinedText)) {
            if (STOP_WORDS.has(token)) {
                continue;
            }
            frequency.set(token, (frequency.get(token) ?? 0) + 1);
        }

        const rankedTokens = [...frequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([token]) => token)
            .slice(0, 20);

        const selectedSkills = unique([...matchedTerms, ...rankedTokens]).slice(0, 20);
        // Strengths text gets priority for summary tone when available.
        const experienceSummary = (input.strengthsText.trim() || input.resumeText.trim()).slice(0, 1200);

        return {
            selectedSkills: selectedSkills.length > 0 ? selectedSkills : ["general"],
            experienceSummary
        };
    }
}

const defaultCandidateProfileService = new CandidateProfileService(new OpenAiCandidateProfileExtractor());

export const buildCandidateProfile = async (input: CandidateProfileBuildInput): Promise<CandidateProfileBuildResult> => {
    return defaultCandidateProfileService.buildProfile(input);
};
