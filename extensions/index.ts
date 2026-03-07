import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { createExaSearchCommand } from "./command.js";
import { resolveApiKey } from "./config.js";
import { createExaSearchClient } from "./exa-client.js";
import { createExaSearchTool } from "./tool.js";

export default function exaSearchExtension(pi: ExtensionAPI) {
	pi.registerTool(
		createExaSearchTool({
			now: () => new Date(),
			getApiKey: () => resolveApiKey(),
			createClient: (apiKey) => createExaSearchClient(apiKey),
		}),
	);

	pi.registerCommand("exasearch", createExaSearchCommand(pi));
}
