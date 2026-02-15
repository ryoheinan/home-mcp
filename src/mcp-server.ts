import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { NatureRemoApiError } from "./errors/nature-remo-api-error";
import {
	buildDeviceSafetyContext,
	type DeviceSafetyContext,
	requireDeviceScopedAppliance,
	requireDeviceScopedSignal,
} from "./home-safety";
import { createNatureRemoClient } from "./nature-remo";
import type { RemoAppliance, RemoDevice } from "./types/nature-remo";
import { findSingleByName, toJson } from "./utils";

const SCOPES = {
	read: ["basic"],
	control: ["sendir", "basic"],
} as const;

type TextContent = {
	type: "text";
	text: string;
};

type ToolResult = {
	content: TextContent[];
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
};

type ApplianceSummary = {
	id: string;
	name: string;
	type: string;
	device: {
		id?: string;
		name?: string;
	} | null;
	settings: RemoAppliance["settings"] | null;
	signals: {
		id: string;
		name: string;
	}[];
};

type RoomTemperatureSummary = {
	deviceId: string;
	deviceName: string;
	temperature: number | null;
	humidity: number | null;
	temperatureMeasuredAt: string | null;
	humidityMeasuredAt: string | null;
	online: boolean | null;
};

export const buildMcpServer = (accessToken: string): McpServer => {
	const client = createNatureRemoClient(accessToken);
	const server = new McpServer({
		name: "nature-remo-mcp",
		version: "0.1.0",
	});

	const withDeviceContext = async <T>(
		deviceId: string,
		handler: (context: DeviceSafetyContext) => Promise<T>,
	): Promise<T> => {
		const context = await buildDeviceSafetyContext(client, deviceId);
		return handler(context);
	};

	server.registerTool(
		"remo_list_devices",
		{
			description: "List Nature Remo devices available to this token.",
		},
		runTool(SCOPES.read, async () => {
			const devices = await client.getDevices();
			const summary = devices.map(toRoomTemperatureSummary);
			return {
				content: [textContent(toJson(summary))],
				structuredContent: { devices: summary },
			};
		}),
	);

	server.registerTool(
		"remo_get_room_temperature",
		{
			description:
				"Get current room temperature and humidity from Nature Remo sensors for a specific device.",
			inputSchema: {
				deviceId: z.string().min(1),
			},
		},
		runTool(SCOPES.read, async ({ deviceId }) => {
			const devices = await client.getDevices();
			const target = devices.find((device) => device.id === deviceId);
			if (!target) {
				return {
					isError: true,
					content: [textContent(`Device not found: ${deviceId}`)],
				};
			}

			const summary = toRoomTemperatureSummary(target);
			return {
				content: [textContent(toJson(summary))],
				structuredContent: { deviceId, device: summary },
			};
		}),
	);

	server.registerTool(
		"remo_list_appliances",
		{
			description: "List appliances linked to the specified Remo device.",
			inputSchema: {
				deviceId: z.string().min(1),
			},
		},
		runTool(SCOPES.read, async ({ deviceId }) => {
			return withDeviceContext(deviceId, async (context) => {
				const summary = context.deviceAppliances.map(toApplianceSummary);
				return {
					content: [textContent(toJson(summary))],
					structuredContent: { deviceId, appliances: summary },
				};
			});
		}),
	);

	server.registerTool(
		"remo_send_signal",
		{
			description:
				"Send an infrared signal in the specified device by signalId.",
			inputSchema: {
				deviceId: z.string().min(1),
				signalId: z.string().min(1),
			},
		},
		runTool(SCOPES.control, async ({ deviceId, signalId }) => {
			return withDeviceContext(deviceId, async (context) => {
				const { appliance, signal } = requireDeviceScopedSignal(
					context,
					signalId,
				);
				await client.sendSignal(signal.id);
				return {
					content: [
						textContent(
							`Signal sent: deviceId=${deviceId}, appliance="${appliance.nickname}", signal="${signal.name}" (${signal.id})`,
						),
					],
					structuredContent: {
						deviceId,
						applianceId: appliance.id,
						applianceName: appliance.nickname,
						signalId: signal.id,
						signalName: signal.name,
					},
				};
			});
		}),
	);

	server.registerTool(
		"remo_send_signal_by_name",
		{
			description:
				"Send an infrared signal by appliance name and signal name in the specified device.",
			inputSchema: {
				deviceId: z.string().min(1),
				applianceName: z.string().min(1),
				signalName: z.string().min(1),
			},
		},
		runTool(SCOPES.control, async ({ deviceId, applianceName, signalName }) => {
			return withDeviceContext(deviceId, async (context) => {
				const appliance = findSingleByName(
					context.deviceAppliances,
					applianceName,
				);
				if (!appliance) {
					return {
						isError: true,
						content: [
							textContent(
								`Appliance not found or ambiguous in device: ${applianceName}`,
							),
						],
					};
				}

				const signal = findSingleByName(appliance.signals ?? [], signalName);
				if (!signal) {
					return {
						isError: true,
						content: [
							textContent(`Signal not found or ambiguous: ${signalName}`),
						],
					};
				}

				await client.sendSignal(signal.id);
				return {
					content: [
						textContent(
							`Signal sent: deviceId=${deviceId}, appliance="${appliance.nickname}" signal="${signal.name}" (${signal.id})`,
						),
					],
					structuredContent: {
						deviceId,
						applianceId: appliance.id,
						applianceName: appliance.nickname,
						signalId: signal.id,
						signalName: signal.name,
					},
				};
			});
		}),
	);

	server.registerTool(
		"remo_control_aircon",
		{
			description:
				"Control an air conditioner appliance in the specified device with operation_mode, temperature, and related settings.",
			inputSchema: {
				deviceId: z.string().min(1),
				applianceId: z.string().min(1),
				operationMode: z.string().optional(),
				temperature: z.string().optional(),
				temperatureUnit: z.enum(["c", "f"]).optional(),
				airVolume: z.string().optional(),
				airDirection: z.string().optional(),
				button: z.string().optional(),
			},
		},
		runTool(
			SCOPES.control,
			async ({
				deviceId,
				applianceId,
				operationMode,
				temperature,
				temperatureUnit,
				airVolume,
				airDirection,
				button,
			}) => {
				if (
					!operationMode &&
					!temperature &&
					!temperatureUnit &&
					!airVolume &&
					!airDirection &&
					!button
				) {
					return {
						isError: true,
						content: [
							textContent("At least one aircon control parameter is required."),
						],
					};
				}

				return withDeviceContext(deviceId, async (context) => {
					requireDeviceScopedAppliance(context, applianceId);
					await client.controlAircon(applianceId, {
						operation_mode: operationMode,
						temperature,
						temperature_unit: temperatureUnit,
						air_volume: airVolume,
						air_direction: airDirection,
						button,
					});

					const payload = {
						deviceId,
						applianceId,
						operationMode,
						temperature,
						temperatureUnit,
						airVolume,
						airDirection,
						button,
					};
					return {
						content: [textContent(`Aircon updated: ${toJson(payload)}`)],
						structuredContent: payload,
					};
				});
			},
		),
	);

	server.registerTool(
		"remo_control_tv",
		{
			description:
				"Send a button command to a TV appliance in the specified device.",
			inputSchema: {
				deviceId: z.string().min(1),
				applianceId: z.string().min(1),
				button: z.string().min(1),
			},
		},
		runTool(SCOPES.control, async ({ deviceId, applianceId, button }) => {
			return withDeviceContext(deviceId, async (context) => {
				requireDeviceScopedAppliance(context, applianceId);
				await client.controlTv(applianceId, button);
				return {
					content: [
						textContent(
							`TV command sent: deviceId=${deviceId}, applianceId=${applianceId}, button=${button}`,
						),
					],
					structuredContent: { deviceId, applianceId, button },
				};
			});
		}),
	);

	server.registerTool(
		"remo_control_light",
		{
			description:
				"Send a button command to a light appliance in the specified device.",
			inputSchema: {
				deviceId: z.string().min(1),
				applianceId: z.string().min(1),
				button: z.string().min(1),
			},
		},
		runTool(SCOPES.control, async ({ deviceId, applianceId, button }) => {
			return withDeviceContext(deviceId, async (context) => {
				requireDeviceScopedAppliance(context, applianceId);
				await client.controlLight(applianceId, button);
				return {
					content: [
						textContent(
							`Light command sent: deviceId=${deviceId}, applianceId=${applianceId}, button=${button}`,
						),
					],
					structuredContent: { deviceId, applianceId, button },
				};
			});
		}),
	);

	return server;
};

const toApplianceSummary = (appliance: RemoAppliance): ApplianceSummary => {
	return {
		id: appliance.id,
		name: appliance.nickname,
		type: appliance.type,
		device: appliance.device
			? {
					id: appliance.device.id,
					name: appliance.device.name,
				}
			: null,
		settings: appliance.settings ?? null,
		signals:
			appliance.signals?.map((signal) => ({
				id: signal.id,
				name: signal.name,
			})) ?? [],
	};
};

const toRoomTemperatureSummary = (
	device: RemoDevice,
): RoomTemperatureSummary => {
	const temperature = device.newest_events?.te;
	const humidity = device.newest_events?.hu;

	return {
		deviceId: device.id,
		deviceName: device.name,
		temperature: temperature?.val ?? null,
		humidity: humidity?.val ?? null,
		temperatureMeasuredAt: temperature?.created_at ?? null,
		humidityMeasuredAt: humidity?.created_at ?? null,
		online: device.online ?? null,
	};
};

const textContent = (message: string): TextContent => ({
	type: "text",
	text: message,
});

const runTool = <TArgs>(
	requiredScopes: readonly string[],
	handler: (args: TArgs) => Promise<ToolResult>,
) => {
	return async (args: TArgs): Promise<ToolResult> => {
		try {
			return await handler(args);
		} catch (error) {
			return toolError(error, { requiredScopes });
		}
	};
};

type ToolErrorOptions = {
	requiredScopes?: readonly string[];
};

const toolError = (
	error: unknown,
	options: ToolErrorOptions = {},
): ToolResult => {
	if (error instanceof NatureRemoApiError) {
		const hint = scopeHint(error.status, options.requiredScopes);
		return {
			isError: true,
			content: [
				textContent(
					`Nature Remo API error (${error.status}): ${error.body || error.message}${hint}`,
				),
			],
		};
	}

	const message = error instanceof Error ? error.message : String(error);
	return {
		isError: true,
		content: [textContent(`Unexpected error: ${message}`)],
	};
};

const scopeHint = (status: number, scopes: readonly string[] = []): string => {
	if (status !== 401 && status !== 403) {
		return "";
	}

	const hints: string[] = [];
	if (status === 401) {
		hints.push("verify token validity");
	}
	if (status === 403) {
		hints.push("ensure sufficient permissions");
	}
	if (scopes.length > 0) {
		hints.push(`required scopes: ${scopes.join(", ")}`);
	}

	return hints.length > 0 ? ` (Hint: ${hints.join("; ")})` : "";
};
