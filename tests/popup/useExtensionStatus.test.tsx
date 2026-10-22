import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExtensionStatus } from "../../src/entrypoints/popup/hooks/useExtensionStatus";
import * as messages from "../../src/entrypoints/popup/lib/runtime-messages";
import type { StatusResponse } from "../../src/shared/types";

vi.mock("../../src/entrypoints/popup/lib/runtime-messages");

const status = (patch: Partial<StatusResponse> = {}): StatusResponse => ({
	hasToken: true,
	isGatewayReady: true,
	activityEnabled: true,
	privacyEnabled: false,
	authError: null,
	currentAnime: null,
	...patch,
});

const mocked = vi.mocked(messages);

/** Render and wait for the first GET_STATUS to settle. */
async function setup() {
	const hook = renderHook(() => useExtensionStatus());
	await waitFor(() => expect(hook.result.current.isBootstrapping).toBe(false));
	return hook;
}

beforeEach(() => {
	mocked.getStatus.mockResolvedValue(status());
	mocked.loginDiscord.mockResolvedValue({ status: "token" });
	mocked.logoutDiscord.mockResolvedValue({ success: true });
	mocked.setActivityEnabled.mockResolvedValue({ success: true });
	mocked.setPrivacyEnabled.mockResolvedValue({ success: true });
});

describe("bootstrapping", () => {
	it("starts bootstrapping, then reflects the background status", async () => {
		const { result } = renderHook(() => useExtensionStatus());
		expect(result.current.isBootstrapping).toBe(true);

		await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
		expect(result.current).toMatchObject({
			isAuthenticated: true,
			isGatewayReady: true,
			activityEnabled: true,
			privacyEnabled: false,
			view: "home",
			error: null,
		});
	});

	it("reports logged-out when there is no token", async () => {
		mocked.getStatus.mockResolvedValue(
			status({ hasToken: false, isGatewayReady: false }),
		);
		const { result } = await setup();
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.isGatewayReady).toBe(false);
	});

	it("defaults activityEnabled to true when the background omits it", async () => {
		mocked.getStatus.mockResolvedValue(status({ activityEnabled: undefined }));
		const { result } = await setup();
		expect(result.current.activityEnabled).toBe(true);
	});

	it("respects activityEnabled=false", async () => {
		mocked.getStatus.mockResolvedValue(status({ activityEnabled: false }));
		const { result } = await setup();
		expect(result.current.activityEnabled).toBe(false);
	});

	it("defaults privacyEnabled to false when the background omits it", async () => {
		mocked.getStatus.mockResolvedValue(status({ privacyEnabled: undefined }));
		const { result } = await setup();
		expect(result.current.privacyEnabled).toBe(false);
	});

	it("respects privacyEnabled=true", async () => {
		mocked.getStatus.mockResolvedValue(status({ privacyEnabled: true }));
		const { result } = await setup();
		expect(result.current.privacyEnabled).toBe(true);
	});

	it("finishes bootstrapping even if the background is unreachable", async () => {
		mocked.getStatus.mockRejectedValue(new Error("worker asleep"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { result } = await setup();
		expect(result.current.isAuthenticated).toBe(false);
	});
});

describe("currentAnime", () => {
	const anime = {
		title: "Frieren",
		episode: "Episode 3",
		episodeName: "Killing Magic",
		coverUrl: "https://cdn/c.jpg",
		isPaused: true,
		currentMs: 0,
		durationMs: 0,
	};

	it("maps the playing anime", async () => {
		mocked.getStatus.mockResolvedValue(status({ currentAnime: anime }));
		const { result } = await setup();
		expect(result.current.currentAnime).toEqual(anime);
	});

	it("coerces a missing isPaused to false", async () => {
		mocked.getStatus.mockResolvedValue(
			status({ currentAnime: { ...anime, isPaused: undefined as never } }),
		);
		const { result } = await setup();
		expect(result.current.currentAnime?.isPaused).toBe(false);
	});

	it.each([
		["null", null],
		["the null placeholder", { ...anime, title: null as unknown as string }],
		["an empty title", { ...anime, title: "" }],
	])("treats %s as nothing playing", async (_l, currentAnime) => {
		mocked.getStatus.mockResolvedValue(status({ currentAnime }));
		const { result } = await setup();
		expect(result.current.currentAnime).toBeNull();
	});
});

describe("polling", () => {
	beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
	afterEach(() => vi.useRealTimers());

	it("refreshes every 3 seconds", async () => {
		const { result } = await setup();
		const calls = mocked.getStatus.mock.calls.length;

		mocked.getStatus.mockResolvedValue(status({ activityEnabled: false }));
		await act(() => vi.advanceTimersByTimeAsync(3_000));

		expect(mocked.getStatus.mock.calls.length).toBeGreaterThan(calls);
		await waitFor(() => expect(result.current.activityEnabled).toBe(false));
	});

	it("stops polling on unmount", async () => {
		const { unmount } = await setup();
		unmount();
		const calls = mocked.getStatus.mock.calls.length;
		await vi.advanceTimersByTimeAsync(30_000);
		expect(mocked.getStatus.mock.calls.length).toBe(calls);
	});
});

describe("auth errors", () => {
	it("surfaces authError and clears it from storage", async () => {
		await browser.storage.local.set({ auth_error: "access denied" });
		mocked.getStatus.mockResolvedValue(
			status({ hasToken: false, authError: "access denied" }),
		);

		const { result } = await setup();
		expect(result.current.error).toBe("access denied");
		expect(
			(await browser.storage.local.get("auth_error")).auth_error,
		).toBeUndefined();
	});

	it("clears a previous error once a token exists", async () => {
		mocked.getStatus.mockResolvedValueOnce(
			status({ hasToken: false, authError: "oops" }),
		);
		const { result } = await setup();
		expect(result.current.error).toBe("oops");

		mocked.getStatus.mockResolvedValue(status({ hasToken: true }));
		await act(() => result.current.login());
		await waitFor(() => expect(result.current.error).toBeNull());
	});
});

describe("login", () => {
	beforeEach(() => {
		mocked.getStatus.mockResolvedValue(status({ hasToken: false }));
	});

	it("shows loading, then refreshes status on success", async () => {
		const { result } = await setup();
		mocked.getStatus.mockResolvedValue(status({ hasToken: true }));

		await act(() => result.current.login());

		expect(mocked.loginDiscord).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
		expect(result.current.isAuthLoading).toBe(false);
	});

	it("keeps loading while a mobile login is pending (success without token yet)", async () => {
		mocked.loginDiscord.mockResolvedValue({ status: "pending" });
		const { result } = await setup();
		await act(() => result.current.login());
		expect(result.current.isAuthLoading).toBe(true);
		expect(result.current.error).toBeNull();
	});

	it("shows the background's error message on failure", async () => {
		mocked.loginDiscord.mockResolvedValue({
			status: "failed",
			error: "Failed to obtain token.",
		});
		const { result } = await setup();
		await act(() => result.current.login());

		expect(result.current.error).toBe("Failed to obtain token.");
		expect(result.current.isAuthLoading).toBe(false);
	});

	it("uses a generic message when failure has no error text", async () => {
		mocked.loginDiscord.mockResolvedValue({ status: "failed" });
		const { result } = await setup();
		await act(() => result.current.login());
		expect(result.current.error).toBe("Login was cancelled or failed.");
	});

	it("handles a thrown error (Error instance)", async () => {
		mocked.loginDiscord.mockRejectedValue(new Error("no receiver"));
		const { result } = await setup();
		await act(() => result.current.login());
		expect(result.current.error).toBe("no receiver");
		expect(result.current.isAuthLoading).toBe(false);
	});

	it("handles a thrown non-Error", async () => {
		mocked.loginDiscord.mockRejectedValue("weird");
		const { result } = await setup();
		await act(() => result.current.login());
		expect(result.current.error).toBe("Something went wrong.");
	});
});

describe("logout", () => {
	it("calls the background and resets local state", async () => {
		mocked.getStatus.mockResolvedValue(
			status({
				currentAnime: {
					title: "X",
					episode: "E1",
					coverUrl: "",
					isPaused: false,
					currentMs: 0,
					durationMs: 0,
				},
			}),
		);
		const { result } = await setup();
		act(() => result.current.setView("settings"));
		expect(result.current.view).toBe("settings");

		await act(() => result.current.logout());

		expect(mocked.logoutDiscord).toHaveBeenCalledTimes(1);
		expect(result.current).toMatchObject({
			isAuthenticated: false,
			isGatewayReady: false,
			currentAnime: null,
			view: "home",
		});
	});
});

describe("toggleActivity", () => {
	it("optimistically updates and tells the background", async () => {
		const { result } = await setup();
		await act(() => result.current.toggleActivity(false));

		expect(mocked.setActivityEnabled).toHaveBeenCalledWith(false);
		expect(result.current.activityEnabled).toBe(false);
	});

	it("rolls back when the background call fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		mocked.setActivityEnabled.mockRejectedValue(new Error("x"));
		const { result } = await setup();

		await act(() => result.current.toggleActivity(false));
		expect(result.current.activityEnabled).toBe(true);
	});
});

describe("togglePrivacy", () => {
	it("optimistically updates and tells the background", async () => {
		const { result } = await setup();
		await act(() => result.current.togglePrivacy(true));

		expect(mocked.setPrivacyEnabled).toHaveBeenCalledWith(true);
		expect(result.current.privacyEnabled).toBe(true);
	});

	it("rolls back when the background call fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		mocked.setPrivacyEnabled.mockRejectedValue(new Error("x"));
		const { result } = await setup();

		await act(() => result.current.togglePrivacy(true));
		expect(result.current.privacyEnabled).toBe(false);
	});
});

describe("view", () => {
	it("switches between home and settings", async () => {
		const { result } = await setup();
		act(() => result.current.setView("settings"));
		expect(result.current.view).toBe("settings");
		act(() => result.current.setView("home"));
		expect(result.current.view).toBe("home");
	});
});
