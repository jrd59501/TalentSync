import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { jobsRepository } from "../repositories/jobRepository.js";
import { importJobFromText } from "../services/jobIngestionService.js";
import { findMatches } from "../services/matchingService.js";
import { parseSkills, readArgValue, readMultilineWithConfirm } from "./cliUtils.js";

const run = async () => {
    // Initialize DB once before demo starts.
    jobsRepository.ensureInitialized();
    // Optional flags for "single command" demo mode.
    const jobTextArg = readArgValue("--job-text");
    const jobFileArg = readArgValue("--job-file");
    const skillsArg = readArgValue("--skills");
    const summaryArg = readArgValue("--summary");

    let rawJobText = jobTextArg ?? "";
    // Optional: load long job text from file.
    if (!rawJobText && jobFileArg) {
        rawJobText = readFileSync(jobFileArg, "utf8");
    }

    // Fast non-interactive flow for one-liner demos.
    if (rawJobText && skillsArg) {
        const imported = await importJobFromText(rawJobText, "teacher-demo");
        const selectedSkills = parseSkills(skillsArg);
        if (selectedSkills.length === 0) {
            throw new Error("Please provide at least one skill.");
        }

        const results = await findMatches(selectedSkills, summaryArg ?? "");
        console.log("Imported Job Listing");
        console.log(`- ID: ${imported.job.id}`);
        console.log(`- Title: ${imported.job.title}`);
        console.log(`- Extraction: ${imported.extractionMode}`);
        console.log("\nTop Matches");
        results.slice(0, 5).forEach((result, index) => {
            console.log(
                `${index + 1}. ${result.jobTitle} | Score: ${result.score} ` +
                `(skills ${result.skillScore}, experience ${result.experienceScore})`
            );
        });
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
            const imported = await importJobFromText(rawJobText, "teacher-demo");
            console.log("\nImported Job Listing");
            console.log(`- ID: ${imported.job.id}`);
            console.log(`- Title: ${imported.job.title}`);
            console.log(`- Extraction: ${imported.extractionMode}`);
            console.log(`- Skills: ${imported.job.requiredSkills.join(", ")}`);
            console.log(`- Keywords: ${imported.job.meaningKeywords.join(", ")}`);

            // Step 3: candidate profile input.
            const skillsInput = await rl.question("\nCandidate skills (comma-separated, or EXIT): ");
            if (skillsInput.trim().toLowerCase() === "exit") {
                break;
            }
            const selectedSkills = parseSkills(skillsInput);
            if (selectedSkills.length === 0) {
                console.log("Please provide at least one skill.");
                continue;
            }

            // Step 4: rank jobs for candidate.
            const summary = await rl.question("Candidate experience summary (or EXIT): ");
            if (summary.trim().toLowerCase() === "exit") {
                break;
            }
            const results = await findMatches(selectedSkills, summary);

            console.log("\nTop Matches");
            results.slice(0, 5).forEach((result, index) => {
                console.log(
                    `${index + 1}. ${result.jobTitle} | Score: ${result.score} ` +
                    `(skills ${result.skillScore}, experience ${result.experienceScore})`
                );
            });

            const again = (await rl.question("\nRun another demo round? (Y/n): ")).trim().toLowerCase();
            if (again === "n" || again === "no" || again === "exit") {
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

run().catch(error => {
    // Top-level CLI error handler.
    console.error("Demo failed:", error);
    process.exit(1);
});
