// Convert an `:id` path value into a safe positive integer.
// Returns null when the value is missing/invalid.
export const parsePositiveIntegerId = (rawId: string): number | null => {
    const parsedId = Number(rawId);
    if (!Number.isInteger(parsedId) || parsedId < 1) {
        return null;
    }

    return parsedId;
};
