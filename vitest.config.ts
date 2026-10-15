import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
	plugins: [WxtVitest()],
	test: {
		environment: "happy-dom",
		setupFiles: ["./tests/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		restoreMocks: true,
		unstubGlobals: true,
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/**/*.test.*", "src/entrypoints/popup/main.tsx"],
			reporter: ["text", "lcov"],
			thresholds: { lines: 70, functions: 70, branches: 65 },
		},
	},
});
