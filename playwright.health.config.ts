import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/health",
	workers: 1,
	retries: process.env.CI ? 2 : 0,
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		trace: "on-first-retry",
	},
});
