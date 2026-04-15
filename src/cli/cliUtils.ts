import { createInterface } from "node:readline/promises";

// Convert comma-separated text into a clean unique array.
export const parseSkills = (raw: string): string[] => {
    return [...new Set(raw
        .split(",")
        .map(skill => skill.trim())
        .filter(Boolean))];
};

// Read optional CLI argument value (e.g. --skills value).
export const readArgValue = (name: string): string | null => {
    const index = process.argv.indexOf(name);
    if (index === -1 || index + 1 >= process.argv.length) {
        return null;
    }

    return process.argv[index + 1];
};

export type MultilineReadResult = {
    text: string;
    cancelled: boolean;
    exited: boolean;
};

// Read multiline text with support for END / CANCEL / EXIT commands.
export const readMultilineControlled = async (
    rl: ReturnType<typeof createInterface>,
    endToken: string,
    cancelToken: string = "CANCEL",
    exitToken: string = "EXIT"
): Promise<MultilineReadResult> => {
    const lines: string[] = [];
    while (true) {
        const line = await rl.question("");
        const trimmed = line.trim();
        if (trimmed.toUpperCase() === exitToken.toUpperCase()) {
            return { text: "", cancelled: false, exited: true };
        }
        if (trimmed.toUpperCase() === cancelToken.toUpperCase()) {
            return { text: "", cancelled: true, exited: false };
        }
        if (trimmed.toUpperCase() === endToken.toUpperCase()) {
            break;
        }
        lines.push(line);
    }

    return { text: lines.join("\n").trim(), cancelled: false, exited: false };
};

const isYes = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
};

// Read multiline text and submit with Enter + yes/no confirmation.
// Flow:
// - User pastes lines.
// - User hits Enter on an empty line.
// - CLI asks "Submit this pasted text? (y/n)".
// - y submits, n continues editing/pasting.
// Supports CANCEL (discard this paste) and EXIT (leave current flow).
export const readMultilineWithConfirm = async (
    rl: ReturnType<typeof createInterface>,
    cancelToken: string = "CANCEL",
    exitToken: string = "EXIT"
): Promise<MultilineReadResult> => {
    let lines: string[] = [];

    while (true) {
        const line = await rl.question("");
        const trimmed = line.trim();

        if (trimmed.toUpperCase() === exitToken.toUpperCase()) {
            return { text: "", cancelled: false, exited: true };
        }
        if (trimmed.toUpperCase() === cancelToken.toUpperCase()) {
            return { text: "", cancelled: true, exited: false };
        }

        // Empty line means "attempt submit".
        if (trimmed.length === 0) {
            if (lines.length === 0) {
                continue;
            }

            const submitAnswer = await rl.question("Submit this pasted text? (y/n): ");
            if (isYes(submitAnswer)) {
                return {
                    text: lines.join("\n").trim(),
                    cancelled: false,
                    exited: false
                };
            }

            const keepAnswer = await rl.question("Keep current text and continue? (y/n): ");
            if (!isYes(keepAnswer)) {
                lines = [];
                console.log("Paste reset. Start again.");
            }
            continue;
        }

        lines.push(line);
    }
};
