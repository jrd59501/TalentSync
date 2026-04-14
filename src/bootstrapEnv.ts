// Ensure local .env values are available in dev/test runs without requiring Node --env-file.
const tryLoadEnvFile = (path?: string): void => {
    try {
        process.loadEnvFile(path);
    } catch {
        // Missing or unreadable env file should not crash app startup.
    }
};

tryLoadEnvFile();
tryLoadEnvFile(".env.local");
