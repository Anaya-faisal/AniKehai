import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { version } from "../../package.json";
import { AppShell } from "../../src/entrypoints/popup/components/AppShell";
import { AuthGateModal } from "../../src/entrypoints/popup/components/AuthGateModal";
import { InkDivider } from "../../src/entrypoints/popup/components/decor/InkDivider";
import { Header } from "../../src/entrypoints/popup/components/Header";
import { IdlePanel } from "../../src/entrypoints/popup/components/IdlePanel";
import { NowPlayingCard } from "../../src/entrypoints/popup/components/NowPlayingCard";
import { SettingsView } from "../../src/entrypoints/popup/components/SettingsView";
import { StatusBadge } from "../../src/entrypoints/popup/components/StatusBadge";
import { ToggleSwitch } from "../../src/entrypoints/popup/components/ToggleSwitch";
import { DISCORD_SERVER_URL } from "../../src/shared/constants";
import { ANIME, makeStatus } from "../helpers/status";

beforeEach(() => {
	vi.spyOn(fakeBrowser.runtime, "getManifest").mockReturnValue({
		version,
	} as never);
});

describe("ToggleSwitch", () => {
	it("exposes an accessible switch reflecting `checked`", () => {
		const { rerender } = render(
			<ToggleSwitch checked={false} onChange={() => {}} label="Broadcast" />,
		);
		const sw = screen.getByRole("switch", { name: "Broadcast" });
		expect(sw).toHaveAttribute("aria-checked", "false");

		rerender(<ToggleSwitch checked onChange={() => {}} label="Broadcast" />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
	});

	it("calls onChange with the opposite value", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<ToggleSwitch checked={false} onChange={onChange} label="X" />,
		);
		await userEvent.click(screen.getByRole("switch"));
		expect(onChange).toHaveBeenLastCalledWith(true);

		rerender(<ToggleSwitch checked onChange={onChange} label="X" />);
		await userEvent.click(screen.getByRole("switch"));
		expect(onChange).toHaveBeenLastCalledWith(false);
	});

	it("renders the label and optional description", () => {
		render(
			<ToggleSwitch
				checked
				onChange={() => {}}
				label="Label"
				description="Helpful text"
			/>,
		);
		expect(screen.getByText("Label")).toBeInTheDocument();
		expect(screen.getByText("Helpful text")).toBeInTheDocument();
	});

	it("omits the description when not provided", () => {
		const { container } = render(
			<ToggleSwitch checked onChange={() => {}} label="Label" />,
		);
		expect(container.querySelectorAll("p")).toHaveLength(1);
	});
});

describe("StatusBadge", () => {
	it("connecting shows 'Connecting'", () => {
		render(<StatusBadge />);
		expect(screen.getByText("Connecting")).toBeInTheDocument();
	});
});

describe("IdlePanel", () => {
	it("tells the user nothing is playing", () => {
		render(<IdlePanel />);
		expect(screen.getByText("Nothing's playing")).toBeInTheDocument();
		expect(screen.getByText(/supported site/i)).toBeInTheDocument();
	});
});

describe("InkDivider", () => {
	it("is decorative (hidden from assistive tech) and accepts a className", () => {
		const { container } = render(<InkDivider className="mt-4" />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg).toHaveClass("mt-4");
	});
});

describe("NowPlayingCard", () => {
	it("shows title, 'NOW WATCHING' and 'episode: name'", () => {
		render(<NowPlayingCard anime={ANIME} />);
		expect(
			screen.getByRole("heading", { name: "Frieren" }),
		).toBeInTheDocument();
		expect(screen.getByText("NOW WATCHING")).toBeInTheDocument();
		expect(screen.getByText("Episode 3: Killing Magic")).toBeInTheDocument();
	});

	it("shows only the episode when there's no episode name", () => {
		render(<NowPlayingCard anime={{ ...ANIME, episodeName: undefined }} />);
		expect(screen.getByText("Episode 3")).toBeInTheDocument();
	});

	it("renders the cover image when available", () => {
		const { container } = render(<NowPlayingCard anime={ANIME} />);
		expect(container.querySelector("img")).toHaveAttribute(
			"src",
			ANIME.coverUrl,
		);
	});

	it("shows a placeholder when there's no cover", () => {
		const { container } = render(
			<NowPlayingCard anime={{ ...ANIME, coverUrl: "" }} />,
		);
		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByText("No cover art yet")).toBeInTheDocument();
	});

	it("shows REC while playing and PAUSED when paused", () => {
		const { rerender } = render(<NowPlayingCard anime={ANIME} />);
		expect(screen.getByText("REC")).toBeInTheDocument();

		rerender(<NowPlayingCard anime={{ ...ANIME, isPaused: true }} />);
		expect(screen.getByText("PAUSED")).toBeInTheDocument();
	});
});

describe("Header", () => {
	it("shows the app name and a settings button", () => {
		render(<Header state="live" view="home" onToggleSettings={() => {}} />);
		expect(screen.getByText("AniKehai")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Open settings" }),
		).toBeInTheDocument();
	});

	it("labels the button 'Back to now playing' in the settings view", () => {
		render(<Header state="live" view="settings" onToggleSettings={() => {}} />);
		expect(
			screen.getByRole("button", { name: "Back to now playing" }),
		).toBeInTheDocument();
	});

	it("fires onToggleSettings when clicked", async () => {
		const onToggle = vi.fn();
		render(<Header state="live" view="home" onToggleSettings={onToggle} />);
		await userEvent.click(screen.getByRole("button"));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("only shows the status badge while connecting", () => {
		const { rerender } = render(
			<Header state="connecting" view="home" onToggleSettings={() => {}} />,
		);
		expect(screen.getByText("Connecting")).toBeInTheDocument();

		rerender(<Header state="live" view="home" onToggleSettings={() => {}} />);
		expect(screen.queryByText("On air")).not.toBeInTheDocument();

		rerender(
			<Header state="offline" view="home" onToggleSettings={() => {}} />,
		);
		expect(screen.queryByText("Off air")).not.toBeInTheDocument();
	});
});

describe("SettingsView", () => {
	it("reflects the broadcast toggle state", () => {
		render(<SettingsView status={makeStatus({ activityEnabled: false })} />);
		expect(
			screen.getByRole("switch", { name: "Broadcast to Discord" }),
		).toHaveAttribute("aria-checked", "false");
	});

	it("toggling calls status.toggleActivity with the new value", async () => {
		const status = makeStatus({ activityEnabled: true });
		render(<SettingsView status={status} />);
		await userEvent.click(
			screen.getByRole("switch", { name: "Broadcast to Discord" }),
		);
		expect(status.toggleActivity).toHaveBeenCalledWith(false);
	});

	it("reflects the privacy toggle state", () => {
		render(<SettingsView status={makeStatus({ privacyEnabled: true })} />);
		expect(screen.getByRole("switch", { name: "Privacy" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
	});

	it("toggling calls status.togglePrivacy with the new value", async () => {
		const status = makeStatus({ privacyEnabled: false });
		render(<SettingsView status={status} />);
		await userEvent.click(screen.getByRole("switch", { name: "Privacy" }));
		expect(status.togglePrivacy).toHaveBeenCalledWith(true);
	});

	it("Back returns to the home view", async () => {
		const status = makeStatus({ view: "settings" });
		render(<SettingsView status={status} />);
		await userEvent.click(screen.getByRole("button", { name: /back/i }));
		expect(status.setView).toHaveBeenCalledWith("home");
	});

	it("logout button calls status.logout", async () => {
		const status = makeStatus();
		render(<SettingsView status={status} />);
		await userEvent.click(
			screen.getByRole("button", { name: /log out of discord/i }),
		);
		expect(status.logout).toHaveBeenCalledTimes(1);
	});

	it("links to the Discord server safely in a new tab", () => {
		render(<SettingsView status={makeStatus()} />);
		const link = screen.getByRole("link", { name: /join our discord server/i });
		expect(link).toHaveAttribute("href", DISCORD_SERVER_URL);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link.getAttribute("rel")).toContain("noreferrer");
	});
});

describe("AuthGateModal", () => {
	it("invites the user to link Discord and fires onLogin", async () => {
		const onLogin = vi.fn();
		render(<AuthGateModal onLogin={onLogin} isLoading={false} error={null} />);
		await userEvent.click(
			screen.getByRole("button", { name: "Link with Discord" }),
		);
		expect(onLogin).toHaveBeenCalledTimes(1);
	});

	it("disables the button and shows progress while loading", () => {
		render(<AuthGateModal onLogin={() => {}} isLoading error={null} />);
		const btn = screen.getByRole("button", { name: "Connecting…" });
		expect(btn).toBeDisabled();
	});

	it("does not fire onLogin while loading", async () => {
		const onLogin = vi.fn();
		render(<AuthGateModal onLogin={onLogin} isLoading error={null} />);
		await userEvent.click(screen.getByRole("button"));
		expect(onLogin).not.toHaveBeenCalled();
	});

	it("shows an error message when provided, none otherwise", () => {
		const { rerender } = render(
			<AuthGateModal onLogin={() => {}} isLoading={false} error={null} />,
		);
		expect(screen.queryByText("access denied")).not.toBeInTheDocument();

		rerender(
			<AuthGateModal
				onLogin={() => {}}
				isLoading={false}
				error="access denied"
			/>,
		);
		expect(screen.getByText("access denied")).toBeInTheDocument();
	});

	it("has the logo with alt text and the privacy note", () => {
		render(<AuthGateModal onLogin={() => {}} isLoading={false} error={null} />);
		expect(screen.getByAltText("AniKehai Logo")).toBeInTheDocument();
		expect(screen.getByText(/never your watch history/i)).toBeInTheDocument();
	});
});

describe("AppShell", () => {
	it("shows the idle panel when nothing is playing", async () => {
		render(<AppShell status={makeStatus({ currentAnime: null })} />);
		expect(await screen.findByText("Nothing's playing")).toBeInTheDocument();
	});

	it("shows the now-playing card when an anime is playing", async () => {
		render(<AppShell status={makeStatus({ currentAnime: ANIME })} />);
		expect(
			await screen.findByRole("heading", { name: "Frieren" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Nothing's playing")).not.toBeInTheDocument();
	});

	it("shows the settings view when view=settings", async () => {
		render(<AppShell status={makeStatus({ view: "settings" })} />);
		expect(
			await screen.findByRole("switch", { name: "Broadcast to Discord" }),
		).toBeInTheDocument();
	});

	it("header button toggles home -> settings", async () => {
		const status = makeStatus({ view: "home" });
		render(<AppShell status={status} />);
		await userEvent.click(
			screen.getByRole("button", { name: "Open settings" }),
		);
		expect(status.setView).toHaveBeenCalledWith("settings");
	});

	it("header button toggles settings -> home", async () => {
		const status = makeStatus({ view: "settings" });
		render(<AppShell status={status} />);
		await userEvent.click(
			screen.getByRole("button", { name: "Back to now playing" }),
		);
		expect(status.setView).toHaveBeenCalledWith("home");
	});

	it("shows the 'connecting' badge while authenticated but the gateway isn't ready", () => {
		render(<AppShell status={makeStatus({ isGatewayReady: false })} />);
		expect(screen.getByText("Connecting")).toBeInTheDocument();
	});

	it("shows no badge when live", () => {
		render(<AppShell status={makeStatus({ isGatewayReady: true })} />);
		expect(screen.queryByText("Connecting")).not.toBeInTheDocument();
	});

	it("shows the extension version in the footer", () => {
		render(<AppShell status={makeStatus()} />);
		expect(screen.getByText(`AniKehai · v${version}`)).toBeInTheDocument();
	});
});
