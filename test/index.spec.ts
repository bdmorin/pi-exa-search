import { describe, expect, it, vi } from "vitest";

import exaSearchExtension from "../extensions/index.js";

describe("exaSearchExtension", () => {
	it("registers the tool and command", () => {
		const registerTool = vi.fn();
		const registerCommand = vi.fn();
		const pi = {
			registerTool,
			registerCommand,
			sendUserMessage: vi.fn(),
		} as never;

		exaSearchExtension(pi);

		expect(registerTool).toHaveBeenCalledTimes(1);
		expect(registerTool.mock.calls[0][0]).toMatchObject({ name: "exa_search" });
		expect(registerCommand).toHaveBeenCalledTimes(1);
		expect(registerCommand).toHaveBeenCalledWith(
			"exasearch",
			expect.objectContaining({ description: expect.any(String) }),
		);
	});
});
