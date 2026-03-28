import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { createExaAnswerTool } from "./answer-tool.js";
import { createExaSearchCommand } from "./command.js";
import { resolveApiKey } from "./config.js";
import { createExaContentsTool } from "./contents-tool.js";
import { createExaSearchClient } from "./exa-client.js";
import { createExaFindSimilarTool } from "./find-similar-tool.js";
import { createExaSearchTool } from "./tool.js";

export default function exaExtension(pi: ExtensionAPI) {
	pi.registerTool(
		createExaSearchTool({
			now: () => new Date(),
			getApiKey: () => resolveApiKey(),
			createClient: (apiKey) => createExaSearchClient(apiKey),
		}),
	);

	pi.registerTool(createExaContentsTool(() => resolveApiKey()));
	pi.registerTool(createExaFindSimilarTool(() => resolveApiKey()));
	pi.registerTool(createExaAnswerTool(() => resolveApiKey()));

	pi.registerCommand("exasearch", createExaSearchCommand(pi));
}
