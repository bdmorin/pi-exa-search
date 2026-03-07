import { describe, expect, it, vi } from "vitest";

import { createExaSearchCommand } from "../extensions/command.js";

describe("createExaSearchCommand", () => {
	it("shows usage when no query is provided", async () => {
		const notify = vi.fn();
		const sendUserMessage = vi.fn();
		const command = createExaSearchCommand({ sendUserMessage } as never);

		await command.handler("   ", { ui: { notify }, isIdle: () => true } as never);

		expect(notify).toHaveBeenCalledWith("Usage: /exasearch <query>", "warning");
		expect(sendUserMessage).not.toHaveBeenCalled();
	});

	it("sends a normal user message when the agent is idle", async () => {
		const notify = vi.fn();
		const sendUserMessage = vi.fn();
		const command = createExaSearchCommand({ sendUserMessage } as never);

		await command.handler("latest AI regulation updates", { ui: { notify }, isIdle: () => true } as never);

		expect(sendUserMessage).toHaveBeenCalledWith(
			"Use exa_search to research: latest AI regulation updates Prefer strong, relevant sources. Then select the best URLs and, if fetch_content is available, use it for deeper extraction before answering.",
		);
		expect(notify).not.toHaveBeenCalled();
	});

	it("queues a follow-up message when the agent is busy", async () => {
		const notify = vi.fn();
		const sendUserMessage = vi.fn();
		const command = createExaSearchCommand({ sendUserMessage } as never);

		await command.handler("latest AI regulation updates", { ui: { notify }, isIdle: () => false } as never);

		expect(sendUserMessage).toHaveBeenCalledWith(
			"Use exa_search to research: latest AI regulation updates Prefer strong, relevant sources. Then select the best URLs and, if fetch_content is available, use it for deeper extraction before answering.",
			{ deliverAs: "followUp" },
		);
		expect(notify).toHaveBeenCalledWith("Exa-first follow-up queued", "info");
	});
});
