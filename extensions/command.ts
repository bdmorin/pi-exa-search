import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

export function createExaSearchCommand(pi: ExtensionAPI) {
	return {
		description: "Nudge Pi to use exa_search first, then fetch_content if available",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const query = args.trim();
			if (!query) {
				ctx.ui.notify("Usage: /exasearch <query>", "warning");
				return;
			}

			const message = [
				`Use exa_search to research: ${query}`,
				"Prefer strong, relevant sources.",
				"Then select the best URLs and, if fetch_content is available, use it for deeper extraction before answering.",
			].join(" ");

			if (ctx.isIdle()) {
				pi.sendUserMessage(message);
				return;
			}

			pi.sendUserMessage(message, { deliverAs: "followUp" });
			ctx.ui.notify("Exa-first follow-up queued", "info");
		},
	};
}
