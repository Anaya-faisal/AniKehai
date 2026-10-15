import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeEach } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

MotionGlobalConfig.skipAnimations = true;

(Element.prototype as { animate?: unknown }).animate = undefined;

beforeEach(() => {
	fakeBrowser.reset();
});

afterEach(() => {
	cleanup();
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	document.title = "";
	history.replaceState({}, "", "/");
});
