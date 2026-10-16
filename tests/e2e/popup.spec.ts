import { expect, popupUrl, test } from "./fixtures";

const FAKE_TOKEN = "e2e-fake-token";

test.describe("popup (real extension, real Chromium)", () => {
	test("logged out: shows the Discord auth gate", async ({
		context,
		extensionId,
	}) => {
		const popup = await context.newPage();
		await popup.goto(popupUrl(extensionId));

		await expect(
			popup.getByRole("button", { name: "Link with Discord" }),
		).toBeVisible();
		await expect(popup.getByAltText("AniKehai Logo")).toBeVisible();
	});

	test("logged in: shows the dashboard, idle, and a 'connecting' badge (gateway unreachable)", async ({
		context,
		extensionId,
		storage,
	}) => {
		const popup = await context.newPage();
		await popup.goto(popupUrl(extensionId));
		await storage.set(popup, { discord_token: FAKE_TOKEN });

		await expect(popup.getByText("Nothing's playing")).toBeVisible();
		await expect(
			popup.getByRole("button", { name: "Link with Discord" }),
		).toHaveCount(0);
		await expect(popup.getByText("Tuning in")).toBeVisible();
	});

	test("settings: broadcast toggle persists to extension storage", async ({
		context,
		extensionId,
		storage,
	}) => {
		const popup = await context.newPage();
		await popup.goto(popupUrl(extensionId));
		await storage.set(popup, { discord_token: FAKE_TOKEN });

		await popup.getByRole("button", { name: "Open settings" }).click();
		const toggle = popup.getByRole("switch", { name: "Broadcast to Discord" });
		await expect(toggle).toHaveAttribute("aria-checked", "true");

		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-checked", "false");
		await expect.poll(() => storage.get(popup, "activity_enabled")).toBe(false);

		await popup.reload();
		await popup.getByRole("button", { name: "Open settings" }).click();
		await expect(
			popup.getByRole("switch", { name: "Broadcast to Discord" }),
		).toHaveAttribute("aria-checked", "false");
	});

	test("settings: privacy toggle persists to extension storage", async ({
		context,
		extensionId,
		storage,
	}) => {
		const popup = await context.newPage();
		await popup.goto(popupUrl(extensionId));
		await storage.set(popup, { discord_token: FAKE_TOKEN });

		await popup.getByRole("button", { name: "Open settings" }).click();
		const toggle = popup.getByRole("switch", { name: "Privacy" });
		await expect(toggle).toHaveAttribute("aria-checked", "false");

		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-checked", "true");
		await expect.poll(() => storage.get(popup, "privacy_enabled")).toBe(true);

		await popup.reload();
		await popup.getByRole("button", { name: "Open settings" }).click();
		await expect(
			popup.getByRole("switch", { name: "Privacy" }),
		).toHaveAttribute("aria-checked", "true");
	});

	test("settings: logging out removes the token and brings back the auth gate", async ({
		context,
		extensionId,
		storage,
	}) => {
		const popup = await context.newPage();
		await popup.goto(popupUrl(extensionId));
		await storage.set(popup, { discord_token: FAKE_TOKEN });

		await popup.getByRole("button", { name: "Open settings" }).click();
		await popup.getByRole("button", { name: /log out of discord/i }).click();

		await expect(
			popup.getByRole("button", { name: "Link with Discord" }),
		).toBeVisible();
		await expect
			.poll(() => storage.get(popup, "discord_token"))
			.toBeUndefined();
	});
});
