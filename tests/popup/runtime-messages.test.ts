import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getStatus,
	loginDiscord,
	logoutDiscord,
	setActivityEnabled,
} from "../../src/entrypoints/popup/lib/runtime-messages";

let sendMessage: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	sendMessage = vi.spyOn(browser.runtime, "sendMessage") as never;
});

describe("popup runtime messages", () => {
	it.each([
		["getStatus", () => getStatus(), { type: "GET_STATUS" }],
		["loginDiscord", () => loginDiscord(), { type: "LOGIN_DISCORD" }],
		["logoutDiscord", () => logoutDiscord(), { type: "LOGOUT_DISCORD" }],
		[
			"setActivityEnabled(true)",
			() => setActivityEnabled(true),
			{ type: "SET_ACTIVITY_ENABLED", enabled: true },
		],
		[
			"setActivityEnabled(false)",
			() => setActivityEnabled(false),
			{ type: "SET_ACTIVITY_ENABLED", enabled: false },
		],
	])("%s sends the right message", async (_name, call, expected) => {
		sendMessage.mockResolvedValue({ success: true } as never);
		await call();
		expect(sendMessage).toHaveBeenCalledWith(expected);
	});

	it("resolves with the background's response", async () => {
		sendMessage.mockResolvedValue({ hasToken: true } as never);
		await expect(getStatus()).resolves.toEqual({ hasToken: true });
	});

	it("propagates a rejected message (no receiver)", async () => {
		sendMessage.mockRejectedValue(new Error("no receiver") as never);
		await expect(getStatus()).rejects.toThrow("no receiver");
	});
});
