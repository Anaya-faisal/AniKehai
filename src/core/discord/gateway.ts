import { APPLICATION_ID } from "../../shared/constants";
import { logger } from "../../shared/logger";
import type { PlaybackState } from "../../shared/types";
import { getAppAssetId, getLargeImageKey } from "../discord/assets";
import { refreshDiscordToken } from "./auth";

export class DiscordGateway {
	private ws: WebSocket | null = null;
	private token: string | null = null;
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	private isReady = false;
	private isManualDisconnect = false;
	private reconnectAttempts = 0;
	private lastSentPresenceJson: string | null = null;
	private presenceQueue: Promise<void> = Promise.resolve();

	async connect() {
		this.isManualDisconnect = false;
		this.lastSentPresenceJson = null;
		this.presenceQueue = Promise.resolve();

		const storage = await browser.storage.local.get([
			"discord_token",
			"discord_token_expires_at",
		]);

		let token =
			typeof storage.discord_token === "string" ? storage.discord_token : null;
		const expiresAt = storage.discord_token_expires_at as number | undefined;

		if (token && expiresAt && Date.now() >= expiresAt - 300000) {
			token = await refreshDiscordToken();
		}

		this.token = token;

		if (!this.token) {
			logger.error("[Gateway] No token found in storage.");
			return;
		}

		if (
			this.ws &&
			(this.ws.readyState === WebSocket.OPEN ||
				this.ws.readyState === WebSocket.CONNECTING)
		) {
			logger.log("[Gateway] Already connected or connecting.");
			return;
		}

		this.ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

		this.ws.onopen = () => {
			logger.log("[Gateway] Connected to WebSocket");
		};

		this.ws.onmessage = (event) => {
			const payload = JSON.parse(event.data);
			const { op, t, d } = payload;

			if (op === 10) {
				const interval = d.heartbeat_interval;
				this.startHeartbeat(interval);
				this.identify();
			}

			if (op === 0 && t === "READY") {
				this.isReady = true;
				this.reconnectAttempts = 0;
				logger.log("[Gateway] Ready and authenticated!");
			}

			if (op === 9) {
				logger.error("[Gateway] Session Invalidated. Clearing token.");
				this.disconnect();
				browser.storage.local.remove("discord_token");
			}
		};

		this.ws.onclose = async (event: CloseEvent) => {
			this.isReady = false;
			this.stopHeartbeat();

			if (event.code === 4004) {
				logger.warn("[Gateway] Token expired (4004). Attempting refresh.");
				const newToken = await refreshDiscordToken();
				if (newToken) {
					this.connect();
				} else {
					logger.error("[Gateway] Refresh failed. Clearing token.");
					browser.storage.local.remove([
						"discord_token",
						"discord_refresh_token",
						"discord_token_expires_at",
					]);
				}
				return;
			}

			if (!this.isManualDisconnect) {
				const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
				this.reconnectAttempts++;
				logger.warn(`[Gateway] Reconnecting in ${backoff / 1000}s...`);
				setTimeout(() => this.connect(), backoff);
			}
		};
	}

	private startHeartbeat(interval: number) {
		this.stopHeartbeat();
		this.heartbeatInterval = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ op: 1, d: null }));
			}
		}, interval);
	}

	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	private identify() {
		const userAgent = navigator.userAgent.toLowerCase();
		let currentOs = "windows";
		if (userAgent.includes("android")) currentOs = "android";
		else if (userAgent.includes("iphone") || userAgent.includes("ipad"))
			currentOs = "ios";
		else if (userAgent.includes("mac")) currentOs = "macos";
		else if (userAgent.includes("linux")) currentOs = "linux";

		this.ws?.send(
			JSON.stringify({
				op: 2,
				d: {
					token: `Bearer ${this.token}`,
					properties: {
						$os: currentOs,
						$browser: import.meta.env.BROWSER || "chrome",
						$device: "pc",
					},
				},
			}),
		);
	}

	public setActivity(
		state: PlaybackState & {
			title: string;
			episode: string;
			episodeName?: string;
			coverUrl: string;
			currentMs: number;
			durationMs: number;
			isPaused: boolean;
		},
	): Promise<void> {
		const next = this.presenceQueue.then(() => this.processSetActivity(state));
		this.presenceQueue = next.catch(() => {});
		return next;
	}

	private async processSetActivity(
		state: PlaybackState & {
			title: string;
			episode: string;
			episodeName?: string;
			coverUrl: string;
			currentMs: number;
			durationMs: number;
			isPaused: boolean;
		},
	) {
		if (!this.isReady || !this.ws) return;

		const isStopped = state.type === "STOPPED";

		let largeImage: string | undefined;
		let smallImage: string | undefined;

		if (!isStopped) {
			largeImage = state.coverUrl
				? await getLargeImageKey(state.coverUrl)
				: await getAppAssetId("default_cover");

			smallImage = await getAppAssetId(state.isPaused ? "pause" : "play");

			if (!this.isReady || !this.ws) return;
		}

		let timestamps: { start?: number; end?: number } | undefined;
		if (
			!isStopped &&
			!state.isPaused &&
			state.currentMs > 0 &&
			state.durationMs > 0
		) {
			const start = Math.floor(Date.now() - state.currentMs);
			const end = Math.floor(start + state.durationMs);
			timestamps = { start, end };
		}

		const presenceState =
			state.episode + (state.episodeName ? `: ${state.episodeName}` : "");

		const payload = {
			op: 3,
			d: {
				since: null,
				activities: isStopped
					? []
					: [
							{
								name: "Anime",
								type: 3,
								application_id: APPLICATION_ID,
								details: state.title,
								state: presenceState,
								timestamps,
								assets: {
									large_image: largeImage,
									large_text: state.title,
									small_image: smallImage,
									small_text: state.isPaused ? "paused" : "playing",
								},
							},
						],
				status: "online",
				afk: false,
			},
		};

		const serializedPayload = JSON.stringify(payload);
		if (this.lastSentPresenceJson === serializedPayload) {
			logger.log("[Gateway] Detected duplicate payload! Skipping update.");
			return;
		}

		this.lastSentPresenceJson = serializedPayload;

		logger.log(
			"[Gateway] Sending presence payload:",
			JSON.stringify(payload, null, 2),
		);
		this.ws.send(serializedPayload);
	}

	public disconnect() {
		this.isManualDisconnect = true;
		this.isReady = false;
		this.stopHeartbeat();
		this.lastSentPresenceJson = null;
		this.presenceQueue = Promise.resolve();
		this.ws?.close();
		this.ws = null;
	}

	public isConnected(): boolean {
		return this.isReady;
	}
}
