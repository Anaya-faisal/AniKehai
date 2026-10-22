import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { version } from "../../package.json";
import App from "../../src/entrypoints/popup/App";
import * as messages from "../../src/entrypoints/popup/lib/runtime-messages";
import type { StatusResponse } from "../../src/shared/types";

vi.mock("../../src/entrypoints/popup/lib/runtime-messages");
vi.mock("../../src/entrypoints/popup/style.css", () => ({}));

const mocked = vi.mocked(messages);

const status = (patch: Partial<StatusResponse> = {}): StatusResponse => ({
	hasToken: true,
	isGatewayReady: true,
	activityEnabled: true,
	privacyEnabled: false,
	authError: null,
	currentAnime: null,
	...patch,
});

beforeEach(() => {
	vi.spyOn(fakeBrowser.runtime, "getManifest").mockReturnValue({
		version,
	} as never);
	mocked.getStatus.mockResolvedValue(status());
	mocked.loginDiscord.mockResolvedValue({ status: "token" });
	mocked.logoutDiscord.mockResolvedValue({ success: true });
	mocked.setActivityEnabled.mockResolvedValue({ success: true });
	mocked.setPrivacyEnabled.mockResolvedValue({ success: true });
});

describe("<App /> (popup integration)", () => {
	it("logged in + idle: shows the dashboard, no auth modal", async () => {
		render(<App />);
		expect(await screen.findByText("Nothing's playing")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Link with Discord" }),
		).not.toBeInTheDocument();
	});

	it("logged in + watching: shows the now-playing card", async () => {
		mocked.getStatus.mockResolvedValue(
			status({
				currentAnime: {
					title: "Frieren",
					episode: "Episode 3",
					episodeName: "Killing Magic",
					coverUrl: "",
					isPaused: false,
					currentMs: 0,
					durationMs: 0,
				},
			}),
		);
		render(<App />);
		expect(
			await screen.findByRole("heading", { name: "Frieren" }),
		).toBeInTheDocument();
		expect(screen.getByText("Episode 3: Killing Magic")).toBeInTheDocument();
	});

	it("logged out: overlays the auth gate and dims the dashboard behind it", async () => {
		mocked.getStatus.mockResolvedValue(
			status({ hasToken: false, isGatewayReady: false }),
		);
		const { container } = render(<App />);

		expect(
			await screen.findByRole("button", { name: "Link with Discord" }),
		).toBeInTheDocument();
		expect(
			container.querySelector('[aria-hidden="true"].pointer-events-none'),
		).not.toBeNull();
	});

	it("clicking 'Link with Discord' starts the login flow", async () => {
		mocked.getStatus.mockResolvedValue(status({ hasToken: false }));
		render(<App />);

		await userEvent.click(
			await screen.findByRole("button", { name: "Link with Discord" }),
		);
		expect(mocked.loginDiscord).toHaveBeenCalledTimes(1);
	});

	it("shows the login error returned by the background", async () => {
		mocked.getStatus.mockResolvedValue(status({ hasToken: false }));
		mocked.loginDiscord.mockResolvedValue({
			status: "failed",
			error: "Failed to obtain token.",
		});
		render(<App />);

		await userEvent.click(
			await screen.findByRole("button", { name: "Link with Discord" }),
		);
		expect(
			await screen.findByText("Failed to obtain token."),
		).toBeInTheDocument();
	});

	it("settings: toggling broadcast calls the background", async () => {
		render(<App />);
		await userEvent.click(
			await screen.findByRole("button", { name: "Open settings" }),
		);
		await userEvent.click(
			await screen.findByRole("switch", { name: "Broadcast to Discord" }),
		);

		expect(mocked.setActivityEnabled).toHaveBeenCalledWith(false);
	});

	it("settings: toggling privacy calls the background", async () => {
		render(<App />);
		await userEvent.click(
			await screen.findByRole("button", { name: "Open settings" }),
		);
		await userEvent.click(
			await screen.findByRole("switch", { name: "Privacy" }),
		);

		expect(mocked.setPrivacyEnabled).toHaveBeenCalledWith(true);
	});

	it("settings: logging out brings the auth gate back", async () => {
		render(<App />);
		await userEvent.click(
			await screen.findByRole("button", { name: "Open settings" }),
		);
		await userEvent.click(
			await screen.findByRole("button", { name: /log out of discord/i }),
		);

		expect(mocked.logoutDiscord).toHaveBeenCalled();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Link with Discord" }),
			).toBeInTheDocument(),
		);
	});
});
