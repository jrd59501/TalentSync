import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { findMatches } from "../services/matchingService.js";
import { jobsRepository } from "../repositories/jobRepository.js";
import { parseSkills, readArgValue } from "./cliUtils.js";

// Run matcher and print human-friendly output rows.
const printResults = async (selectedSkills: string[], experienceSummary: string) => {
    const results = await findMatches(selectedSkills, experienceSummary);
    console.log("\nTop Matches");
    results.slice(0, 10).forEach((result, index) => {
        const aiInfo = result.aiScore === null
            ? "AI: off/fallback"
            : `AI: ${result.aiScore}`;
        // Reason is only present when AI rerank returns one.
        const reason = result.aiReason ? ` | Reason: ${result.aiReason}` : "";

        console.log(
            `${index + 1}. ${result.jobTitle} | Score: ${result.score} | ` +
            `Skills: ${result.skillScore} | Experience: ${result.experienceScore} | ${aiInfo}`
        );
        console.log(`   Matched Skills: ${result.matchedSkills.join(", ") || "none"}`);
        console.log(`   Matched Keywords: ${result.matchedKeywords.join(", ") || "none"}${reason}`);
    });
};

const run = async () => {
    // Ensure database exists before any query.
    jobsRepository.ensureInitialized();

    // Non-interactive mode support:
    // npm run cli:match -- --skills "node,ts" --summary "..."
    const skillArg = readArgValue("--skills");
    const summaryArg = readArgValue("--summary") ?? "";
    if (skillArg) {
        const selectedSkills = parseSkills(skillArg);
        if (selectedSkills.length === 0) {
            throw new Error("No valid skills provided in --skills.");
        }

        await printResults(selectedSkills, summaryArg);
        return;
    }

    // Interactive mode for manual use.
    const rl = createInterface({ input, output });
    console.log("TalentSync CLI Matcher");
    console.log("Type comma-separated skills, then a short experience summary.");

    try {
        while (true) {
            // Loop until user types "exit".
            const skillInput = await rl.question("\nSkills (comma-separated, or 'exit'): ");
            if (skillInput.trim().toLowerCase() === "exit") {
                break;
            }

            const selectedSkills = parseSkills(skillInput);
            if (selectedSkills.length === 0) {
                console.log("Please enter at least one skill.");
                continue;
            }

            const experienceSummary = await rl.question("Experience summary: ");
            await printResults(selectedSkills, experienceSummary);
        }
    } finally {
        // Always close readline no matter what.
        rl.close();
    }

    console.log("Goodbye.");
};

run().catch(error => {
    // Top-level error handler for CLI process.
    console.error("CLI failed:", error);
    process.exit(1);
});
