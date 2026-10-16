export function visit(url: string, title = ""): void {
	history.replaceState({}, "", url);
	document.title = title;
}

export function setBody(html: string): void {
	document.body.innerHTML = html;
}

export function setHead(html: string): void {
	const title = document.title;
	document.head.innerHTML = html;
	if (title) document.title = title;
}

export function mockVideo(
	video: HTMLVideoElement,
	props: { duration?: number; currentTime?: number; paused?: boolean },
): HTMLVideoElement {
	for (const [key, value] of Object.entries(props)) {
		Object.defineProperty(video, key, { value, configurable: true });
	}
	return video;
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadFixture(name: string): string {
	return readFileSync(resolve(process.cwd(), "tests/fixtures", name), "utf8");
}
