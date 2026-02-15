import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { bearerAuth } from "hono/bearer-auth";

import { buildMcpServer } from "./mcp-server";
import type { Bindings } from "./types/bindings";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) =>
	c.json({
		ok: true,
	}),
);

app.use("/mcp", async (c, next) => {
	const { MCP_BEARER_TOKEN } = env(c);
	if (!MCP_BEARER_TOKEN) {
		return next();
	}

	const auth = bearerAuth({
		token: MCP_BEARER_TOKEN,
		noAuthenticationHeader: {
			message: { error: "Missing bearer token." },
		},
		invalidAuthenticationHeader: {
			message: { error: "Invalid bearer token." },
		},
		invalidToken: {
			message: { error: "Invalid bearer token." },
		},
	});

	return auth(c, next);
});

app.all("/mcp", async (c) => {
	const { NATURE_REMO_ACCESS_TOKEN } = env(c);

	if (!NATURE_REMO_ACCESS_TOKEN) {
		return c.json(
			{ error: "Missing NATURE_REMO_ACCESS_TOKEN in Worker secrets." },
			500,
		);
	}

	const mcpServer = buildMcpServer(NATURE_REMO_ACCESS_TOKEN);
	const transport = new StreamableHTTPTransport();
	await mcpServer.connect(transport);
	return transport.handleRequest(c);
});

export default app;
