import { McpError } from "@modelcontextprotocol/sdk/types.js";

import { NatureRemoApiError } from "./errors/nature-remo-api-error";
import { buildMcpServer } from "./mcp-server";
import { createNatureRemoClient } from "./nature-remo";
import type { NatureRemoClient } from "./types/nature-remo";

vi.mock("./nature-remo", () => {
	return {
		createNatureRemoClient: vi.fn(),
	};
});

type InternalMcpServer = {
	_registeredTools: Record<string, unknown>;
	validateToolInput: (
		tool: unknown,
		args: unknown,
		toolName: string,
	) => Promise<unknown>;
	executeToolHandler: (
		tool: unknown,
		args: unknown,
		extra: Record<string, unknown>,
	) => Promise<unknown>;
};

const defaultClient = (): NatureRemoClient => {
	return {
		getDevices: vi.fn().mockResolvedValue([]),
		getAppliances: vi.fn().mockResolvedValue([]),
		sendSignal: vi.fn().mockResolvedValue(undefined),
		controlTv: vi.fn().mockResolvedValue(undefined),
		controlLight: vi.fn().mockResolvedValue(undefined),
		controlAircon: vi.fn().mockResolvedValue(undefined),
	};
};

const getInternalServer = (): InternalMcpServer => {
	return buildMcpServer("token-123") as unknown as InternalMcpServer;
};

const callTool = async (
	server: InternalMcpServer,
	name: string,
	args: unknown,
) => {
	const tool = server._registeredTools[name];
	const parsedArgs = await server.validateToolInput(tool, args, name);
	return server.executeToolHandler(tool, parsedArgs, {});
};

describe("mcp-server", () => {
	let client: NatureRemoClient;

	beforeEach(() => {
		client = defaultClient();
		vi.mocked(createNatureRemoClient).mockReturnValue(client);
	});

	it("requires deviceId for control tools", async () => {
		const server = getInternalServer();
		const tool = server._registeredTools.remo_control_tv;

		await expect(
			server.validateToolInput(
				tool,
				{ applianceId: "ap-1", button: "power" },
				"remo_control_tv",
			),
		).rejects.toBeInstanceOf(McpError);
	});

	it("rejects appliance control when appliance is outside the specified device", async () => {
		vi.mocked(client.getDevices).mockResolvedValue([
			{ id: "device-1", name: "Living Remo" },
		]);
		vi.mocked(client.getAppliances).mockResolvedValue([
			{
				id: "ap-outside",
				nickname: "Outside TV",
				type: "TV",
				device: { id: "device-2" },
			},
		]);

		const server = getInternalServer();
		const result = await callTool(server, "remo_control_tv", {
			deviceId: "device-1",
			applianceId: "ap-outside",
			button: "power",
		});

		expect(result).toMatchObject({
			isError: true,
		});
		expect(result).toHaveProperty(
			"content.0.text",
			expect.stringContaining("Appliance not found in specified device"),
		);
		expect(client.controlTv).not.toHaveBeenCalled();
	});

	it("rejects signal send when signal belongs to another device", async () => {
		vi.mocked(client.getDevices).mockResolvedValue([
			{ id: "device-1", name: "Living Remo" },
		]);
		vi.mocked(client.getAppliances).mockResolvedValue([
			{
				id: "ap-outside",
				nickname: "Outside TV",
				type: "TV",
				device: { id: "device-2" },
				signals: [{ id: "signal-1", name: "Power" }],
			},
		]);

		const server = getInternalServer();
		const result = await callTool(server, "remo_send_signal", {
			deviceId: "device-1",
			signalId: "signal-1",
		});

		expect(result).toMatchObject({
			isError: true,
		});
		expect(result).toHaveProperty(
			"content.0.text",
			expect.stringContaining("Signal not found in specified device"),
		);
		expect(client.sendSignal).not.toHaveBeenCalled();
	});

	it("uses exact name matching for signal by name tool", async () => {
		vi.mocked(client.getDevices).mockResolvedValue([
			{ id: "device-1", name: "Living Room Remo" },
		]);
		vi.mocked(client.getAppliances).mockResolvedValue([
			{
				id: "ap-1",
				nickname: "Living Room TV",
				type: "TV",
				device: { id: "device-1" },
				signals: [{ id: "signal-1", name: "Power" }],
			},
		]);

		const server = getInternalServer();
		const result = await callTool(server, "remo_send_signal_by_name", {
			deviceId: "device-1",
			applianceName: "room tv",
			signalName: "Power",
		});

		expect(result).toMatchObject({
			isError: true,
		});
		expect(result).toHaveProperty(
			"content.0.text",
			"Appliance not found or ambiguous in device: room tv",
		);
		expect(client.sendSignal).not.toHaveBeenCalled();
	});

	it("returns room temperature for the specified device", async () => {
		vi.mocked(client.getDevices).mockResolvedValue([
			{
				id: "device-1",
				name: "Living Room Remo",
				online: true,
				newest_events: {
					te: { val: 24.3, created_at: "2026-02-07T08:00:00Z" },
					hu: { val: 40, created_at: "2026-02-07T08:00:00Z" },
				},
			},
			{
				id: "device-2",
				name: "Bedroom Remo",
				online: false,
				newest_events: {
					hu: { val: 35, created_at: "2026-02-07T07:58:00Z" },
				},
			},
		]);

		const server = getInternalServer();
		const result = await callTool(server, "remo_get_room_temperature", {
			deviceId: "device-2",
		});

		expect(result).not.toHaveProperty("isError");
		expect(result).toMatchObject({
			structuredContent: {
				deviceId: "device-2",
				device: {
					deviceId: "device-2",
					temperature: null,
					humidity: 35,
				},
			},
		});
	});

	it("adds scope hints on 403 errors", async () => {
		vi.mocked(client.getDevices).mockRejectedValue(
			new NatureRemoApiError("forbidden", 403, "forbidden"),
		);

		const server = getInternalServer();
		const result = await callTool(server, "remo_list_devices", undefined);

		expect(result).toMatchObject({
			isError: true,
		});
		expect(result).toHaveProperty(
			"content.0.text",
			expect.stringContaining("required scopes: basic"),
		);
	});
});
