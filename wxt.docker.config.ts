import { defineConfig } from "wxt";
import baseConfig from "./wxt.config";

export default defineConfig({
	...baseConfig,
	webExt: { disabled: true },
	dev: {
		server: {
			host: "0.0.0.0",
			port: 3000,
			origin: "http://localhost:3000",
			strictPort: true,
		},
	},
});
