import { fetchAnilistCover } from "../core/anilist/api";
import {
	loginWithDiscord,
	processLocalhostRedirect,
} from "../core/discord/auth";
import { DiscordGateway } from "../core/discord/gateway";
import {
	activityEnabled,
	clearAnimeState,
	commitBroadcast,
	currentAnimeState,
	evaluateDiscordUpdate,
	privacyEnabled,
	setActivityEnabledFlag,
	setPrivacyEnabledFlag,
} from "../core/state/playback";
import { RESET_ACTIVITY_TIMEOUT } from "../shared/constants";
import { logger } from "../shared/logger";

export default defineBackground(() => {
	const gateway = new DiscordGateway();
	gateway.connect();

	let activityTimeout: ReturnType<typeof setTimeout> | null = null;
	let isLoggingOut = false;

	const settingsReady = browser.storage.local
		.get(["activity_enabled", "privacy_enabled"])
		.then((storage) => {
			if (typeof storage.activity_enabled === "boolean") {
				setActivityEnabledFlag(storage.activity_enabled);
			}
			if (typeof storage.privacy_enabled === "boolean") {
				setPrivacyEnabledFlag(storage.privacy_enabled);
			}
		});

	function publishPresence(context: string) {
		if (currentAnimeState.title === "Unknown") return;

		const type = currentAnimeState.isPaused
			? ("PAUSED" as const)
			: ("WATCHING" as const);

		if (privacyEnabled) {
			gateway
				.setActivity({
					type,
					title: "Anime",
					episode: "Private Session",
					coverUrl: "",
					currentMs: 0,
					durationMs: 0,
					isPaused: currentAnimeState.isPaused,
				})
				.catch((err) => logger.error(`[${context}]`, err));
		} else {
			gateway
				.setActivity({
					type,
					...currentAnimeState,
				})
				.catch((err) => logger.error(`[${context}]`, err));
		}
	}

	function resetActivityTimeout() {
		if (activityTimeout) clearTimeout(activityTimeout);
		activityTimeout = setTimeout(() => {
			if (currentAnimeState.title !== "Unknown") {
				gateway
					.setActivity({ type: "STOPPED", ...currentAnimeState })
					.catch((err) => logger.error("[setActivity/timeout]", err));
			}
			clearAnimeState();
		}, RESET_ACTIVITY_TIMEOUT * 1000);
	}

	browser.runtime.onInstalled.addListener((details) => {
		if (details.reason === "install") {
			browser.tabs.create({
				url: browser.runtime.getURL("/popup.html"),
				active: true,
			});
		}
	});

	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		const targetUrl = changeInfo.url || tab.url;
		if (targetUrl?.startsWith("http://127.0.0.1/discord-auth")) {
			browser.tabs.remove(tabId).catch(() => {});

			processLocalhostRedirect(targetUrl).then(async (result) => {
				if (result.success && result.token) {
					await browser.storage.local.remove("auth_error");
					await gateway.connect();
				} else if (!result.success && result.error) {
					await browser.storage.local.set({ auth_error: result.error });
				}
			});
		}
	});

	browser.storage.onChanged.addListener((changes, areaName) => {
		if (areaName === "local" && changes.discord_token) {
			if (!changes.discord_token.newValue && changes.discord_token.oldValue) {
				if (isLoggingOut) return;

				logger.warn("Discord token expired or removed. Prompting for re-auth.");

				if (browser.action?.openPopup) {
					browser.action.openPopup().catch((err) => {
						logger.warn(
							"Popup blocked by browser security, falling back to tab.",
							err,
						);
						browser.tabs.create({
							url: browser.runtime.getURL("/popup.html"),
							active: true,
						});
					});
				} else {
					browser.tabs.create({
						url: browser.runtime.getURL("/popup.html"),
						active: true,
					});
				}
			}
		}
	});

	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		const handleMessage = async () => {
			await settingsReady;

			if (message.type === "LOGIN_DISCORD") {
				await browser.storage.local.remove("auth_error");

				try {
					const token = await loginWithDiscord();
					if (token === "mobile_pending") {
						sendResponse({ success: true, pending: true });
					} else if (token) {
						await gateway.connect();
						sendResponse({ success: true });
					} else {
						sendResponse({ success: false, error: "Failed to obtain token." });
					}
				} catch (err) {
					sendResponse({
						success: false,
						error: err instanceof Error ? err.message : "Error",
					});
				}
				return;
			}

			if (message.type === "LOGOUT_DISCORD") {
				gateway.disconnect();
				isLoggingOut = true;
				try {
					await browser.storage.local.remove([
						"discord_token",
						"discord_refresh_token",
						"discord_token_expires_at",
					]);
				} finally {
					isLoggingOut = false;
				}
				sendResponse({ success: true });
				return;
			}

			if (message.type === "SET_ACTIVITY_ENABLED") {
				setActivityEnabledFlag(!!message.enabled);
				await browser.storage.local.set({ activity_enabled: activityEnabled });
				if (!activityEnabled) {
					if (activityTimeout) clearTimeout(activityTimeout);
					if (currentAnimeState.title !== "Unknown") {
						gateway
							.setActivity({ type: "STOPPED", ...currentAnimeState })
							.catch((err) => logger.error("[setActivity/toggle]", err));
					}
					clearAnimeState();
				}
				sendResponse({ success: true });
				return;
			}

			if (message.type === "SET_PRIVACY_ENABLED") {
				setPrivacyEnabledFlag(!!message.enabled);
				await browser.storage.local.set({ privacy_enabled: privacyEnabled });

				if (!activityEnabled) {
					sendResponse({ success: true });
					return;
				}

				publishPresence("setPrivacy/toggle");
				sendResponse({ success: true });
				return;
			}

			if (message.type === "GET_STATUS") {
				const storage = await browser.storage.local.get([
					"discord_token",
					"auth_error",
				]);
				sendResponse({
					hasToken:
						typeof storage.discord_token === "string" &&
						!!storage.discord_token,
					isGatewayReady: gateway.isConnected(),
					activityEnabled,
					privacyEnabled,
					authError: storage.auth_error || null,
					currentAnime: currentAnimeState,
				});
				return;
			}

			if (!sender.tab?.active) return;

			if (message.type === "STOPPED") {
				if (currentAnimeState.title !== "Unknown") {
					gateway
						.setActivity({ type: "STOPPED", ...currentAnimeState })
						.catch((err) => logger.error("[setActivity/stopped]", err));
				}
				if (activityTimeout) clearTimeout(activityTimeout);
				clearAnimeState();
				return;
			}

			if (message.type === "FETCH_ANILIST") {
				const coverUrl = await fetchAnilistCover(message.anilistId);
				sendResponse({ coverUrl });
				return;
			}

			if (message.type === "INFO_UPDATE") {
				currentAnimeState.title = message.title;
				currentAnimeState.episode = message.episode;
				currentAnimeState.episodeName = message.episodeName;
				currentAnimeState.coverUrl = message.coverUrl;
			} else if (message.type === "TIME_UPDATE") {
				currentAnimeState.currentMs = message.currentMs;
				currentAnimeState.durationMs = message.durationMs;
				currentAnimeState.isPaused = message.isPaused;
			} else {
				return;
			}

			if (!activityEnabled) return;
			resetActivityTimeout();

			const { shouldUpdate, newEstimatedStart } = evaluateDiscordUpdate(
				message.type,
			);

			if (!shouldUpdate) return;
			commitBroadcast(newEstimatedStart);

			publishPresence("setActivity/update");
		};

		handleMessage();

		if (
			message.type === "LOGIN_DISCORD" ||
			message.type === "LOGOUT_DISCORD" ||
			message.type === "SET_ACTIVITY_ENABLED" ||
			message.type === "SET_PRIVACY_ENABLED" ||
			message.type === "GET_STATUS" ||
			message.type === "FETCH_ANILIST"
		) {
			return true;
		}
	});
});
