import path from "node:path";
import {
	type BrowserContext,
	test as base,
	chromium,
	type Page,
} from "@playwright/test";

// chrome only exists inside the extension page
// biome-ignore lint/suspicious/noExplicitAny: ambient browser global
declare const chrome: any;

export const EXTENSION_PATH = path.resolve(process.cwd(), ".output/chrome-mv3");

type Fixtures = {
	context: BrowserContext;
	extensionId: string;
	storage: {
		set(page: Page, items: Record<string, unknown>): Promise<void>;
		get(page: Page, key: string): Promise<unknown>;
	};
};

export const test = base.extend<Fixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
	context: async ({}, use) => {
		const context = await chromium.launchPersistentContext("", {
			channel: "chromium",
			args: [
				`--disable-extensions-except=${EXTENSION_PATH}`,
				`--load-extension=${EXTENSION_PATH}`,
				"--host-resolver-rules=MAP discord.com 127.0.0.1, MAP gateway.discord.gg 127.0.0.1",
			],
		});
		await use(context);
		await context.close();
	},

	extensionId: async ({ context }, use) => {
		let [worker] = context.serviceWorkers();
		if (!worker) worker = await context.waitForEvent("serviceworker");
		await use(new URL(worker.url()).host);
	},

	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
	storage: async ({}, use) => {
		await use({
			set: (page, items) =>
				page.evaluate((i) => chrome.storage.local.set(i), items),
			get: (page, key) =>
				page.evaluate(async (k) => (await chrome.storage.local.get(k))[k], key),
		});
	},
});

export const expect = test.expect;

export const popupUrl = (extensionId: string) =>
	`chrome-extension://${extensionId}/popup.html`;
