import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { jobsRepository } from "../repositories/jobRepository.js";
import { importJobFromText } from "../services/jobIngestionService.js";
import { readMultilineWithConfirm } from "./cliUtils.js";

// Print latest jobs (last 20) for quick review.
const printJobs = () => {
    const jobs = jobsRepository.getAllJobs();
    console.log(`\nTotal Jobs: ${jobs.length}`);
    jobs.slice(-20).reverse().forEach(job => {
        console.log(`${job.id}. ${job.title}`);
    });
};

const promptDeleteJob = async (rl: ReturnType<typeof createInterface>) => {
    // Show recent jobs first so user can pick an ID easily.
    printJobs();
    const rawId = await rl.question("\nJob id to delete: ");
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) {
        console.log("ID must be a positive integer.");
        return;
    }

    const deleted = jobsRepository.deleteJobById(id);
    if (!deleted) {
        console.log("Job not found.");
        return;
    }

    console.log(`Deleted job #${id}.`);
};

const showMenu = () => {
    console.log("\nChoose an action:");
    console.log("1) List jobs");
    console.log("2) Import pasted job text");
    console.log("3) Delete a job by id");
    console.log("4) Exit");
};

const shouldDeleteFromList = async (rl: ReturnType<typeof createInterface>) => {
    const shouldDelete = (await rl.question("\nDelete one of these now? (y/N): ")).trim().toLowerCase();
    return shouldDelete === "y" || shouldDelete === "yes";
};

const importPastedJob = async (rl: ReturnType<typeof createInterface>) => {
    console.log("\nPaste job text now.");
    console.log("Press Enter on an empty line to submit, then confirm y/n.");
    console.log("Type CANCEL to restart paste, or EXIT to return to menu.");
    const pasteResult = await readMultilineWithConfirm(rl);
    if (pasteResult.exited) {
        console.log("Paste exited. Returning to menu.");
        return;
    }
    if (pasteResult.cancelled) {
        console.log("Paste canceled. Returning to menu.");
        return;
    }

    const rawText = pasteResult.text;
    if (rawText.length < 20) {
        console.log("Job text must be at least 20 characters.");
        return;
    }

    const result = await importJobFromText(rawText, "employer-cli");
    console.log(`Imported #${result.job.id}: ${result.job.title} (${result.extractionMode})`);
};

const run = async () => {
    // Ensure DB exists and seed jobs loaded.
    jobsRepository.ensureInitialized();
    const rl = createInterface({ input, output });

    console.log("TalentSync Employer CLI");
    console.log("Manage listings: list, import, delete");

    try {
        while (true) {
            // Simple menu loop for employer actions.
            showMenu();
            const choice = (await rl.question("> ")).trim();

            if (choice === "1") {
                // List recent jobs.
                printJobs();
                // Optional quick-delete flow from list screen.
                if (await shouldDeleteFromList(rl)) {
                    await promptDeleteJob(rl);
                }
                continue;
            }

            if (choice === "2") {
                // Import new listing from pasted text.
                await importPastedJob(rl);
                continue;
            }

            if (choice === "3") {
                // Delete by ID.
                await promptDeleteJob(rl);
                continue;
            }

            // Exit option.
            if (choice === "4" || choice.toLowerCase() === "exit") {
                break;
            }

            // Any other key is invalid.
            console.log("Invalid option. Choose 1, 2, 3, or 4.");
        }
    } finally {
        // Ensure terminal input is properly closed.
        rl.close();
    }
};

try {
    await run();
} catch (error) {
    // Top-level CLI error handler.
    console.error("Employer CLI failed:", error);
    process.exit(1);
}
