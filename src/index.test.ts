import app from "./index";

vi.mock("hono/adapter", () => {
	return {
		env: (c: { env?: Record<string, string | undefined> }) => c.env ?? {},
	};
});

describe("worker routes", () => {
	it("returns 404 on /", async () => {
		const response = await app.request("http://localhost/");

		expect(response.status).toBe(404);
	});

	it("returns ok on /health", async () => {
		const response = await app.request("http://localhost/health");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("rejects /mcp when bearer token is required but missing", async () => {
		const response = await app.request(
			"http://localhost/mcp",
			{ method: "POST" },
			{ MCP_BEARER_TOKEN: "required-token" },
		);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "Missing bearer token.",
		});
	});

	it("rejects /mcp when bearer token is invalid", async () => {
		const response = await app.request(
			"http://localhost/mcp",
			{
				method: "POST",
				headers: { Authorization: "Bearer wrong-token" },
			},
			{ MCP_BEARER_TOKEN: "required-token" },
		);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "Invalid bearer token.",
		});
	});

	it("returns 500 on /mcp when Nature Remo token is missing", async () => {
		const response = await app.request(
			"http://localhost/mcp",
			{
				method: "POST",
				headers: { Authorization: "Bearer required-token" },
			},
			{ MCP_BEARER_TOKEN: "required-token" },
		);

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({
			error: "Missing NATURE_REMO_ACCESS_TOKEN in Worker secrets.",
		});
	});
});
