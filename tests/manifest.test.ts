import { describe, expect, it } from "vitest";
import { extractMatches } from "../src/scraper/extractor";
import { strategies } from "../src/scraper/sites";
import config from "../wxt.config";

type Manifest = {
	name: string;
	key?: string;
	permissions: string[];
	host_permissions: string[];
	browser_specific_settings?: {
		gecko?: { id: string; strict_min_version: string };
	};
};

const build = (browser: "chrome" | "firefox"): Manifest => {
	const manifest = (config as { manifest: unknown }).manifest;
	if (typeof manifest !== "function")
		throw new Error("manifest must be a function");
	return manifest({ browser }) as Manifest;
};

describe("wxt.config manifest", () => {
	it("grants host permission for every supported site and player iframe", () => {
		const { host_permissions } = build("chrome");
		for (const match of extractMatches(strategies)) {
			expect(host_permissions).toContain(match);
		}
	});

	it("grants Discord REST + gateway access", () => {
		const { host_permissions } = build("chrome");
		expect(host_permissions).toEqual(
			expect.arrayContaining([
				"https://discord.com/*",
				"wss://gateway.discord.gg/*",
			]),
		);
	});

	it("chrome: requests identity permission and pins the extension key", () => {
		const m = build("chrome");
		expect(m.permissions).toEqual(
			expect.arrayContaining(["storage", "tabs", "scripting", "identity"]),
		);
		expect(m.key).toBeTypeOf("string");
	});

	it("firefox: no identity permission and no key (OAuth uses the mobile/tab flow)", () => {
		const m = build("firefox");
		expect(m.permissions).toEqual(
			expect.arrayContaining(["storage", "tabs", "scripting"]),
		);
		expect(m.permissions).not.toContain("identity");
		expect(m.key).toBeUndefined();
	});

	it("firefox: declares a gecko id and no data collection", () => {
		const gecko = build("firefox").browser_specific_settings
			?.gecko as unknown as {
			id: string;
			data_collection_permissions: { required: string[] };
		};
		expect(gecko.id).toBe("anime-rpc@minkxx.dev");
		expect(gecko.data_collection_permissions.required).toEqual(["none"]);
	});

	it("is named AniKehai", () => {
		expect(build("chrome").name).toBe("AniKehai");
	});
});
