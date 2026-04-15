import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { jobsRepository } from "../repositories/jobRepository.js";
import { importJobFromText } from "../services/jobIngestionService.js";
import { findMatches } from "../services/matchingService.js";
import { parseSkills, readArgValue, readMultilineWithConfirm } from "./cliUtils.js";

const printTopMatches = async (selectedSkills: string[], summary: string) => {
    const results = await findMatches(selectedSkills, summary);
    console.log("\nTop Matches");
    for (const [index, result] of results.slice(0, 5).entries()) {
        console.log(
            `${index + 1}. ${result.jobTitle} | Score: ${result.score} ` +
            `(skills ${result.skillScore}, experience ${result.experienceScore})`
        );
    }
};

const printImportedJob = async (rawJobText: string) => {
    const imported = await importJobFromText(rawJobText, "teacher-demo");
    console.log("\nImported Job Listing");
    console.log(`- ID: ${imported.job.id}`);
    console.log(`- Title: ${imported.job.title}`);
    console.log(`- Extraction: ${imported.extractionMode}`);
    console.log(`- Skills: ${imported.job.requiredSkills.join(", ")}`);
    console.log(`- Keywords: ${imported.job.meaningKeywords.join(", ")}`);
    return imported;
};

const loadRawJobText = (jobTextArg: string | null, jobFileArg: string | null): string => {
    if (jobTextArg) {
        return jobTextArg;
    }
    if (jobFileArg !== null) {
        return readFileSync(jobFileArg, "utf8");
    }

    return "";
};

const runNonInteractiveDemo = async (rawJobText: string, skillsArg: string, summaryArg: string | null) => {
    const imported = await importJobFromText(rawJobText, "teacher-demo");
    const selectedSkills = parseSkills(skillsArg);
    if (selectedSkills.length === 0) {
        throw new Error("Please provide at least one skill.");
    }

    console.log("Imported Job Listing");
    console.log(`- ID: ${imported.job.id}`);
    console.log(`- Title: ${imported.job.title}`);
    console.log(`- Extraction: ${imported.extractionMode}`);
    await printTopMatches(selectedSkills, summaryArg ?? "");
};

const promptCandidateSkills = async (rl: ReturnType<typeof createInterface>): Promise<string[] | null> => {
    const skillsInput = await rl.question("\nCandidate skills (comma-separated, or EXIT): ");
    if (skillsInput.trim().toLowerCase() === "exit") {
        return null;
    }

    const selectedSkills = parseSkills(skillsInput);
    if (selectedSkills.length === 0) {
        console.log("Please provide at least one skill.");
        return [];
    }

    return selectedSkills;
};

const promptCandidateSummary = async (rl: ReturnType<typeof createInterface>): Promise<string | null> => {
    const summary = await rl.question("Candidate experience summary (or EXIT): ");
    return summary.trim().toLowerCase() === "exit" ? null : summary;
};

const shouldRunAnotherRound = async (rl: ReturnType<typeof createInterface>): Promise<boolean> => {
    const again = (await rl.question("\nRun another demo round? (Y/n): ")).trim().toLowerCase();
    return again !== "n" && again !== "no" && again !== "exit";
};

const run = async () => {
    // Initialize DB once before demo starts.
    jobsRepository.ensureInitialized();
    // Optional flags for "single command" demo mode.
    const jobTextArg = readArgValue("--job-text");
    const jobFileArg = readArgValue("--job-file");
    const skillsArg = readArgValue("--skills");
    const summaryArg = readArgValue("--summary");

    let rawJobText = loadRawJobText(jobTextArg, jobFileArg);

    // Fast non-interactive flow for one-liner demos.
    if (rawJobText && skillsArg !== null) {
        await runNonInteractiveDemo(rawJobText, skillsArg, summaryArg);
        return;
    }

    // Full interactive walkthrough mode.
    const rl = createInterface({ input, output });
    console.log("TalentSync Demo Wizard");
    console.log("Paste employer job text.");
    console.log("When done, press Enter on an empty line, then confirm y/n.");
    console.log("Type CANCEL to restart current paste, or EXIT to quit.");
    console.log("Example source: Indeed posting text.");

    try {
        while (true) {
            // Step 1: employer text input.
            const pasteResult = await readMultilineWithConfirm(rl);
            if (pasteResult.exited) {
                break;
            }
            if (pasteResult.cancelled) {
                console.log("Paste canceled. Start again.");
                continue;
            }

            rawJobText = pasteResult.text;
            if (!rawJobText || rawJobText.length < 20) {
                console.log("Job text must be at least 20 characters. Try again.");
                continue;
            }

            // Step 2: save parsed job listing.
            await printImportedJob(rawJobText);

            // Step 3: candidate profile input.
            const selectedSkills = await promptCandidateSkills(rl);
            if (selectedSkills === null) {
                break;
            }
            if (selectedSkills.length === 0) {
                continue;
            }

            // Step 4: rank jobs for candidate.
            const summary = await promptCandidateSummary(rl);
            if (summary === null) {
                break;
            }
            await printTopMatches(selectedSkills, summary);

            if (!await shouldRunAnotherRound(rl)) {
                break;
            }

            console.log("\nPaste next employer job text.");
            console.log("Empty line -> submit prompt | CANCEL -> retry | EXIT -> quit.");
        }
    } finally {
        // Always clean up readline handle.
        rl.close();
    }
};

try {
    await run();
} catch (error) {
    // Top-level CLI error handler.
    console.error("Demo failed:", error);
    process.exit(1);
}
