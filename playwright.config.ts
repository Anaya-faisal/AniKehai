import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: { trace: "retain-on-failure" },
});
