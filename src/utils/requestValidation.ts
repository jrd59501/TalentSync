// Shared request validators keep controller files smaller and easier to explain.
export const isStringArray = (value: unknown): value is string[] => {
    return Array.isArray(value) && value.every(item => typeof item === "string");
};

// "Required" means the value must be a non-empty string within the given limit.
export const isRequiredString = (value: unknown, maxLength: number): value is string => {
    return typeof value === "string" && Boolean(value.trim()) && value.trim().length <= maxLength;
};

export const isOptionalString = (value: unknown): value is string | undefined => {
    return typeof value === "undefined" || typeof value === "string";
};

export const isOptionalNullableString = (value: unknown): value is string | null | undefined => {
    return typeof value === "undefined" || value === null || typeof value === "string";
};

export const isOptionalStringWithin = (value: unknown, maxLength: number): value is string | undefined => {
    return isOptionalString(value) && (typeof value !== "string" || value.length <= maxLength);
};

export const isOptionalNullableStringWithin = (value: unknown, maxLength: number): value is string | null | undefined => {
    return isOptionalNullableString(value) && (typeof value !== "string" || value.length <= maxLength);
};
