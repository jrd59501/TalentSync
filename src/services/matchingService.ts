import { jobsRepository, StoredJob } from "../repositories/jobRepository.js";
import { AiRerankInput, OpenAiReranker } from "./aiScoringService.js";

// Final response shape returned to API/CLI caller.
export type JobMatchResult = {
    jobId: number;
    jobTitle: string;
    score: number;
    skillScore: number;
    experienceScore: number;
    aiScore: number | null;
    aiReason: string | null;
    matchedSkills: string[];
    matchedKeywords: string[];
};

// Internal shape before AI rerank blend.
type BaseMatchResult = {
    jobId: number;
    jobTitle: string;
    baselineScore: number;
    skillScore: number;
    experienceScore: number;
    matchedSkills: string[];
    matchedKeywords: string[];
    requiredSkills: string[];
    meaningKeywords: string[];
};

// Small payload sent to AI reranker.
type AiCandidate = {
    jobId: number;
    jobTitle: string;
    requiredSkills: string[];
    meaningKeywords: string[];
    baselineScore: number;
};

type AiRerankOutput = Awaited<ReturnType<OpenAiReranker["rerank"]>>;

// Minimal dependency contract for reading jobs.
export type JobRepository = {
    getAllJobs: () => StoredJob[];
};

// Minimal dependency contract for AI rerank support.
export type AiReranker = {
    rerank: (input: AiRerankInput) => Promise<AiRerankOutput>;
};

// Word aliases to improve matching between related terms.
const aliasMap: Record<string, string[]> = {
    teaching: ["teacher", "education", "instruction", "classroom", "curriculum", "lesson", "student", "learning"],
    teacher: ["teaching", "education", "instruction", "classroom", "curriculum", "lesson", "student", "learning"],
    education: ["teaching", "teacher", "instruction", "classroom", "curriculum", "lesson", "student", "learning"],
    taught: ["teach", "teacher", "teaching", "instruction", "education", "classroom"],
    backend: ["server", "api"],
    frontend: ["ui", "interface"],
    nodejs: ["node"]
};

class TokenService {
    // Normalize text for case-insensitive comparisons.
    normalize(value: string): string {
        return value.toLowerCase().trim();
    }

    // Convert free text into normalized keyword tokens.
    tokenize(text: string): string[] {
        const rawTokens = text
            .toLowerCase()
            .match(/[a-z0-9]+/g);

        // No tokens found.
        if (!rawTokens) {
            return [];
        }

        // Expand each token using stemming + aliases.
        const expandedTokens = rawTokens
            .filter(token => token.length > 2)
            .flatMap(token => this.expandToken(token))
            .filter(token => token.length > 2);

        // De-duplicate tokens.
        return [...new Set(expandedTokens)];
    }

    // Check if any token appears in the lookup set.
    hasTokenOverlap(tokensToCheck: string[], lookupTokens: Set<string>): boolean {
        for (const token of tokensToCheck) {
            if (lookupTokens.has(token)) {
                return true;
            }
        }

        return false;
    }

    private expandToken(token: string): string[] {
        const lowerToken = token.toLowerCase();
        // Example: "teaching" -> "teach"
        const stemmedToken = this.stemToken(lowerToken);
        const directAliases = aliasMap[lowerToken] ?? [];
        const stemAliases = aliasMap[stemmedToken] ?? [];

        return [...new Set([lowerToken, stemmedToken, ...directAliases, ...stemAliases])];
    }

    // Very simple stemming to catch common endings.
    private stemToken(token: string): string {
        if (token.length > 5 && token.endsWith("ing")) {
            return token.slice(0, -3);
        }

        if (token.length > 4 && token.endsWith("ed")) {
            return token.slice(0, -2);
        }

        if (token.length > 4 && token.endsWith("er")) {
            return token.slice(0, -2);
        }

        if (token.length > 4 && token.endsWith("es")) {
            return token.slice(0, -2);
        }

        if (token.length > 3 && token.endsWith("s")) {
            return token.slice(0, -1);
        }

        return token;
    }
}

class MatchScorePolicy {
    // Convert matched count into a 0-100 percentage.
    computePercent(matchedCount: number, totalCount: number): number {
        if (totalCount === 0) {
            return 0;
        }

        return Math.round((matchedCount / totalCount) * 100);
    }

    // Baseline score before AI: skills are weighted more than summary context.
    computeBaselineScore(skillScore: number, experienceScore: number): number {
        // Hard skills are primary; summary context is secondary.
        return Math.round((skillScore * 0.75) + (experienceScore * 0.25));
    }

    // Final score = baseline mixed with optional AI score.
    computeFinalScore(baselineScore: number, aiScore: number | null): number {
        if (aiScore === null) {
            return baselineScore;
        }

        return Math.round((baselineScore * 0.7) + (aiScore * 0.3));
    }
}

type PreparedJob = {
    source: StoredJob;
    // Pre-tokenized forms avoid repeated tokenize() work in loops.
    requiredSkillTokens: Array<{ rawSkill: string; tokens: string[] }>;
    keywordTokens: Array<{ rawKeyword: string; tokens: string[] }>;
};

export class JobMatchingService {
    constructor(
        private readonly repository: JobRepository,
        private readonly aiReranker: AiReranker,
        private readonly tokenService: TokenService = new TokenService(),
        private readonly scorePolicy: MatchScorePolicy = new MatchScorePolicy()
    ) {}

    async findMatches(candidateSelectedSkills: string[], candidateExperienceSummary: string): Promise<JobMatchResult[]> {
        // Presentation summary:
        // 1. Clean the candidate input
        // 2. Score every job with deterministic rules
        // 3. Optionally ask AI to rerank the best few
        // 4. Return a final sorted list
        // Build normalized sets from candidate input one time.
        const normalizedSelectedSkills = new Set(candidateSelectedSkills.map(skill => this.tokenService.normalize(skill)));
        const selectedSkillTokenSet = new Set(this.tokenService.tokenize(candidateSelectedSkills.join(" ")));
        const summaryTokenSet = new Set(this.tokenService.tokenize(candidateExperienceSummary));
        // Context means skills + summary words together.
        const candidateContextTokens = new Set([...selectedSkillTokenSet, ...summaryTokenSet]);

        // Load and pre-tokenize jobs once for this request.
        const preparedJobs = this.prepareJobs(this.repository.getAllJobs());

        // PERF: this scores every job each request.
        // If job volume gets large, pre-filter by category/skills before full scoring.
        // Build deterministic baseline scores for every job.
        const baselineResults = preparedJobs.map(preparedJob => this.buildBaseMatch(
            preparedJob,
            normalizedSelectedSkills,
            selectedSkillTokenSet,
            candidateContextTokens
        ));

        // Highest baseline first, before optional AI rerank.
        baselineResults.sort((left, right) => right.baselineScore - left.baselineScore);

        // Only send top N to AI to control cost/latency.
        const aiCandidates = baselineResults
            .slice(0, this.getTopN())
            .map(matchResult => this.toAiCandidate(matchResult));
        const aiRerankResults = await this.aiReranker.rerank({
            selectedSkills: candidateSelectedSkills,
            experienceSummary: candidateExperienceSummary,
            jobs: aiCandidates
        });

        // Fast lookup: jobId -> AI score + reason.
        const aiByJobId = new Map<number, { aiScore: number; reason: string }>();
        if (aiRerankResults) {
            for (const aiResult of aiRerankResults) {
                aiByJobId.set(aiResult.jobId, {
                    aiScore: aiResult.aiScore,
                    reason: aiResult.reason
                });
            }
        }

        const finalResults = baselineResults.map(baselineMatch => {
            const aiMatch = aiByJobId.get(baselineMatch.jobId);

            // Final score blends baseline + AI when AI exists.
            return {
                jobId: baselineMatch.jobId,
                jobTitle: baselineMatch.jobTitle,
                score: this.scorePolicy.computeFinalScore(baselineMatch.baselineScore, aiMatch?.aiScore ?? null),
                skillScore: baselineMatch.skillScore,
                experienceScore: baselineMatch.experienceScore,
                aiScore: aiMatch?.aiScore ?? null,
                aiReason: aiMatch?.reason ?? null,
                matchedSkills: baselineMatch.matchedSkills,
                matchedKeywords: baselineMatch.matchedKeywords
            };
        });

        // Final sort used by API output.
        return finalResults.sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            if (right.skillScore !== left.skillScore) {
                return right.skillScore - left.skillScore;
            }

            return right.experienceScore - left.experienceScore;
        });
    }

    private prepareJobs(jobs: StoredJob[]): PreparedJob[] {
        return jobs.map(job => ({
            source: job,
            requiredSkillTokens: job.requiredSkills.map(requiredSkill => ({
                rawSkill: requiredSkill,
                tokens: this.tokenService.tokenize(this.tokenService.normalize(requiredSkill))
            })),
            keywordTokens: [...job.meaningKeywords, job.title].map(keyword => ({
                rawKeyword: keyword,
                tokens: this.tokenService.tokenize(keyword)
            }))
        }));
    }

    private buildBaseMatch(
        preparedJob: PreparedJob,
        normalizedSelectedSkills: Set<string>,
        selectedSkillTokenSet: Set<string>,
        candidateContextTokens: Set<string>
    ): BaseMatchResult {
        // This is the explainable scoring step:
        // we compare the candidate against one job before any AI is involved.
        // A required skill matches by exact value or token overlap.
        const matchedSkills = preparedJob.requiredSkillTokens
            .filter(skillEntry => {
                const normalizedRequiredSkill = this.tokenService.normalize(skillEntry.rawSkill);
                if (normalizedSelectedSkills.has(normalizedRequiredSkill)) {
                    return true;
                }

                return this.tokenService.hasTokenOverlap(skillEntry.tokens, selectedSkillTokenSet);
            })
            .map(skillEntry => skillEntry.rawSkill);

        // Keywords match against the broader candidate context set.
        const matchedKeywords = preparedJob.keywordTokens
            .filter(keywordEntry => this.tokenService.hasTokenOverlap(keywordEntry.tokens, candidateContextTokens))
            .map(keywordEntry => keywordEntry.rawKeyword);

        // Percent scores are easier to reason about than raw counts.
        const skillScore = this.scorePolicy.computePercent(matchedSkills.length, preparedJob.source.requiredSkills.length);
        const experienceScore = this.scorePolicy.computePercent(matchedKeywords.length, preparedJob.keywordTokens.length);

        return {
            jobId: preparedJob.source.id,
            jobTitle: preparedJob.source.title,
            baselineScore: this.scorePolicy.computeBaselineScore(skillScore, experienceScore),
            skillScore,
            experienceScore,
            matchedSkills,
            matchedKeywords,
            requiredSkills: preparedJob.source.requiredSkills,
            meaningKeywords: preparedJob.source.meaningKeywords
        };
    }

    private toAiCandidate(baseMatch: BaseMatchResult): AiCandidate {
        // Keep only fields the AI prompt needs.
        return {
            jobId: baseMatch.jobId,
            jobTitle: baseMatch.jobTitle,
            requiredSkills: baseMatch.requiredSkills,
            meaningKeywords: baseMatch.meaningKeywords,
            baselineScore: baseMatch.baselineScore
        };
    }

    private getTopN(): number {
        // Env override lets you tune AI rerank scope.
        const configuredTopN = Number(process.env.OPENAI_RERANK_TOP_N ?? "3");
        if (!Number.isFinite(configuredTopN) || configuredTopN < 1) {
            return 3;
        }

        return Math.floor(configuredTopN);
    }
}

// Default production wiring.
const defaultMatchingService = new JobMatchingService(
    { getAllJobs: () => jobsRepository.getAllJobs() },
    new OpenAiReranker()
);

// Public function kept for easy import in controllers/CLI.
export const findMatches = async (
    selectedSkills: string[],
    experienceSummary: string
): Promise<JobMatchResult[]> => defaultMatchingService.findMatches(selectedSkills, experienceSummary);
