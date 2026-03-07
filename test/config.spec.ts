import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONFIG_PATH, parseConfig, readConfig, resolveApiKey } from "../extensions/config.js";
import { ConfigError } from "../extensions/errors.js";

describe("config", () => {
	it("parses valid config", () => {
		expect(parseConfig('{"exaApiKey":"abc"}')).toEqual({ exaApiKey: "abc" });
	});

	it("throws for invalid config JSON", () => {
		expect(() => parseConfig("not-json")).toThrowError(new ConfigError(`Invalid JSON in ${CONFIG_PATH}.`));
	});

	it("returns an empty object when the config file is missing", () => {
		expect(readConfig(join(tmpdir(), "missing-exa-search.json"))).toEqual({});
	});

	it("reads config from disk", () => {
		const dir = mkdtempSync(join(tmpdir(), "pi-exa-search-"));
		const path = join(dir, "exa-search.json");
		writeFileSync(path, '{"exaApiKey":"disk-key"}');
		expect(readConfig(path)).toEqual({ exaApiKey: "disk-key" });
		rmSync(dir, { recursive: true, force: true });
	});

	it("prefers EXA_API_KEY over config value", () => {
		expect(
			resolveApiKey({
				env: { EXA_API_KEY: "env-key" },
				config: { exaApiKey: "config-key" },
			}),
		).toBe("env-key");
	});

	it("falls back to config when env is unset", () => {
		expect(resolveApiKey({ env: {}, config: { exaApiKey: "config-key" } })).toBe("config-key");
	});

	it("throws a clear error when no key is available", () => {
		expect(() => resolveApiKey({ env: {}, config: {}, configPath: "/tmp/exa.json" })).toThrowError(
			new ConfigError(
				"Exa API key not found. Either:\n" +
					"  1. Set EXA_API_KEY environment variable\n" +
					'  2. Create /tmp/exa.json with { "exaApiKey": "your-key" }',
			),
		);
	});
});
