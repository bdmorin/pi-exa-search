import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["test/integration/**/*.integration.ts"],
		testTimeout: 30000,
	},
});
