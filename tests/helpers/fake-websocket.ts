import { vi } from "vitest";

export class FakeWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;
	static instances: FakeWebSocket[] = [];

	static get last(): FakeWebSocket {
		const ws = FakeWebSocket.instances.at(-1);
		if (!ws) throw new Error("No FakeWebSocket has been created");
		return ws;
	}

	static install(): void {
		FakeWebSocket.instances = [];
		vi.stubGlobal("WebSocket", FakeWebSocket);
	}

	readyState: number = FakeWebSocket.CONNECTING;
	sent: string[] = [];
	closeCalls = 0;

	onopen: ((ev?: unknown) => void) | null = null;
	onmessage: ((ev: { data: string }) => void) | null = null;
	onclose: ((ev: { code: number }) => void) | null = null;

	constructor(public url: string) {
		FakeWebSocket.instances.push(this);
	}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.closeCalls++;
		this.readyState = FakeWebSocket.CLOSED;
		queueMicrotask(() => this.onclose?.({ code: 1000 }));
	}

	serverOpen(): void {
		this.readyState = FakeWebSocket.OPEN;
		this.onopen?.();
	}

	serverSend(payload: { op: number; t?: string; d?: unknown }): void {
		this.onmessage?.({ data: JSON.stringify(payload) });
	}

	serverClose(code = 1006): void {
		this.readyState = FakeWebSocket.CLOSED;
		this.onclose?.({ code });
	}

	// biome-ignore lint/suspicious/noExplicitAny: payload shape varies per gateway op
	get sentPayloads(): Array<{ op: number; d: any }> {
		return this.sent.map((s) => JSON.parse(s));
	}
}
