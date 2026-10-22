import { vi } from "vitest";
import type { ExtensionStatus } from "../../src/entrypoints/popup/hooks/useExtensionStatus";

export function makeStatus(
	patch: Partial<ExtensionStatus> = {},
): ExtensionStatus {
	return {
		isAuthenticated: true,
		isGatewayReady: true,
		activityEnabled: true,
		privacyEnabled: false,
		currentAnime: null,
		isBootstrapping: false,
		isAuthLoading: false,
		error: null,
		view: "home",
		setView: vi.fn(),
		login: vi.fn(),
		logout: vi.fn(),
		toggleActivity: vi.fn(),
		togglePrivacy: vi.fn(),
		...patch,
	};
}

export const ANIME = {
	title: "Frieren",
	episode: "Episode 3",
	episodeName: "Killing Magic",
	coverUrl: "https://cdn/cover.jpg",
	isPaused: false,
	currentMs: 0,
	durationMs: 0,
};
