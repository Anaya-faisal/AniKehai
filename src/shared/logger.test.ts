import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadLogger(initialEnabled?: boolean) {
	if (initialEnabled !== undefined) {
		await browser.storage.local.set({ enable_logs: initialEnabled });
	}
	vi.resetModules();
	const mod = await import("./logger");

	await new Promise((r) => setTimeout(r, 0));
	return mod.logger;
}

let log: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	log = vi.spyOn(console, "log").mockImplementation(() => {});
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>).enable_logs;
});

describe("logger", () => {
	it("is silent by default", async () => {
		const logger = await loadLogger();
		logger.log("a");
		logger.warn("b");
		logger.error("c");
		expect(log).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});

	it("logs with level prefixes when enabled in storage", async () => {
		const logger = await loadLogger(true);
		logger.log("hello", 1);
		logger.warn("careful");
		logger.error("boom");

		expect(log).toHaveBeenCalledWith("[INFO]", "hello", 1);
		expect(warn).toHaveBeenCalledWith("[WARN]", "careful");
		expect(error).toHaveBeenCalledWith("[ERROR]", "boom");
	});

	it("stays silent when storage explicitly says false", async () => {
		const logger = await loadLogger(false);
		logger.error("nope");
		expect(error).not.toHaveBeenCalled();
	});

	it("exposes globalThis.enable_logs and persists changes", async () => {
		const logger = await loadLogger();
		const g = globalThis as unknown as { enable_logs: boolean };

		expect(g.enable_logs).toBe(false);
		g.enable_logs = true;

		expect(g.enable_logs).toBe(true);
		expect((await browser.storage.local.get("enable_logs")).enable_logs).toBe(
			true,
		);
		logger.log("now visible");
		expect(log).toHaveBeenCalledWith("[INFO]", "now visible");
	});

	it("reacts to storage changes made elsewhere (e.g. the popup)", async () => {
		const logger = await loadLogger();
		await browser.storage.local.set({ enable_logs: true });
		logger.warn("enabled remotely");
		expect(warn).toHaveBeenCalledWith("[WARN]", "enabled remotely");

		await browser.storage.local.set({ enable_logs: false });
		warn.mockClear();
		logger.warn("disabled remotely");
		expect(warn).not.toHaveBeenCalled();
	});
});
