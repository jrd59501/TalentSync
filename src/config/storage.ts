import { resolve } from "node:path";

const defaultLocalDbPath = resolve(process.cwd(), "data", "talentsync.db");
const defaultAzureDbPath = "/home/data/talentsync.db";

export const resolveDatabasePath = (): string => {
    const configuredPath = process.env.TALENTSYNC_DB_PATH?.trim();
    if (configuredPath) {
        return configuredPath;
    }

    // On Azure App Service Linux, /home is the persistent mount when App Service storage is enabled.
    if (process.env.WEBSITE_SITE_NAME) {
        return defaultAzureDbPath;
    }

    return defaultLocalDbPath;
};
