import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	APPLICATION_ID,
	CHECK_ACTIVITY_INTERVAL,
	DISCORD_SERVER_URL,
	EXTENSION_VERSION,
	RESET_ACTIVITY_TIMEOUT,
} from "./constants";

const pkg = JSON.parse(
	readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { version: string };

describe("constants", () => {
	it("EXTENSION_VERSION matches package.json (they must be bumped together)", () => {
		expect(EXTENSION_VERSION).toBe(pkg.version);
	});

	it("EXTENSION_VERSION is valid semver", () => {
		expect(EXTENSION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("APPLICATION_ID is a Discord snowflake", () => {
		expect(APPLICATION_ID).toMatch(/^\d{17,20}$/);
	});

	it("DISCORD_SERVER_URL is an https discord invite", () => {
		expect(DISCORD_SERVER_URL).toMatch(/^https:\/\/discord\.gg\/\w+$/);
	});

	it("the idle timeout outlasts the polling interval (else presence flickers off)", () => {
		expect(RESET_ACTIVITY_TIMEOUT).toBeGreaterThan(CHECK_ACTIVITY_INTERVAL);
	});
});
