import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { ConfigError } from "./errors.js";

export const CONFIG_PATH = join(homedir(), ".pi", "exa-search.json");

type ExaSearchConfig = {
	exaApiKey?: string;
};

export function parseConfig(raw: string): ExaSearchConfig {
	try {
		return JSON.parse(raw) as ExaSearchConfig;
	} catch {
		throw new ConfigError(`Invalid JSON in ${CONFIG_PATH}.`);
	}
}

export function readConfig(configPath = CONFIG_PATH): ExaSearchConfig {
	if (!existsSync(configPath)) return {};
	return parseConfig(readFileSync(configPath, "utf-8"));
}

export function resolveApiKey(options?: {
	env?: NodeJS.ProcessEnv;
	config?: ExaSearchConfig;
	configPath?: string;
}): string {
	const configPath = options?.configPath ?? CONFIG_PATH;
	const config = options?.config ?? readConfig(configPath);
	const env = options?.env ?? process.env;
	const key = env.EXA_API_KEY || config.exaApiKey;

	if (!key) {
		throw new ConfigError(
			"Exa API key not found. Either:\n" +
				"  1. Set EXA_API_KEY environment variable\n" +
				`  2. Create ${configPath} with { "exaApiKey": "your-key" }`,
		);
	}

	return key;
}
