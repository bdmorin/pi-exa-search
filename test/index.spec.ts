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

		expect(registerTool).toHaveBeenCalledTimes(4);
		expect(registerTool.mock.calls[0][0]).toMatchObject({ name: "exa_search" });
		expect(registerTool.mock.calls[1][0]).toMatchObject({ name: "exa_contents" });
		expect(registerTool.mock.calls[2][0]).toMatchObject({ name: "exa_find_similar" });
		expect(registerTool.mock.calls[3][0]).toMatchObject({ name: "exa_answer" });
		expect(registerCommand).toHaveBeenCalledTimes(1);
		expect(registerCommand).toHaveBeenCalledWith(
			"exasearch",
			expect.objectContaining({ description: expect.any(String) }),
		);
	});
});
