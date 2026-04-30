// Convert an `:id` path value into a safe positive integer.
// Returns null when the value is missing/invalid.
export const parsePositiveIntegerId = (rawId: string | string[] | undefined): number | null => {
    if (typeof rawId !== "string") {
        return null;
    }

    const parsedId = Number(rawId);
    if (!Number.isInteger(parsedId) || parsedId < 1) {
        return null;
    }

    return parsedId;
};
