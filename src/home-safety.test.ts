import {
	buildDeviceSafetyContext,
	requireDeviceScopedAppliance,
	requireDeviceScopedSignal,
} from "./home-safety";
import type { NatureRemoClient } from "./types/nature-remo";

const createClient = (
	overrides: Partial<NatureRemoClient> = {},
): NatureRemoClient => {
	return {
		getDevices: vi.fn().mockResolvedValue([]),
		getAppliances: vi.fn().mockResolvedValue([]),
		sendSignal: vi.fn(),
		controlTv: vi.fn(),
		controlLight: vi.fn(),
		controlAircon: vi.fn(),
		...overrides,
	};
};

describe("device safety", () => {
	it("builds device-scoped appliances", async () => {
		const client = createClient({
			getDevices: vi
				.fn()
				.mockResolvedValue([{ id: "device-1", name: "Living Remo" }]),
			getAppliances: vi.fn().mockResolvedValue([
				{
					id: "ap-in-device",
					nickname: "Living AC",
					type: "AC",
					device: { id: "device-1" },
				},
				{
					id: "ap-other-device",
					nickname: "Remote Home AC",
					type: "AC",
					device: { id: "device-2" },
				},
			]),
		});

		const context = await buildDeviceSafetyContext(client, "device-1");

		expect(context.deviceAppliances).toEqual([
			{
				id: "ap-in-device",
				nickname: "Living AC",
				type: "AC",
				device: { id: "device-1" },
			},
		]);
	});

	it("rejects when target device is not found", async () => {
		const client = createClient({
			getDevices: vi.fn().mockResolvedValue([{ id: "device-1", name: "Remo" }]),
		});

		await expect(
			buildDeviceSafetyContext(client, "device-404"),
		).rejects.toThrow("Device not found: device-404");
	});

	it("allows appliance control only when appliance belongs to the device", () => {
		const context = {
			deviceId: "device-1",
			deviceAppliances: [
				{
					id: "ap-1",
					nickname: "AC",
					type: "AC",
					device: { id: "device-1" },
				},
			],
		};

		const appliance = requireDeviceScopedAppliance(context, "ap-1");

		expect(appliance.id).toBe("ap-1");
	});

	it("rejects appliance control when appliance is outside the device", () => {
		const context = {
			deviceId: "device-1",
			deviceAppliances: [],
		};

		expect(() => requireDeviceScopedAppliance(context, "ap-1")).toThrow(
			"Appliance not found in specified device: ap-1",
		);
	});

	it("rejects signal send when the signal belongs to another device", () => {
		const context = {
			deviceId: "device-1",
			deviceAppliances: [],
		};

		expect(() => requireDeviceScopedSignal(context, "signal-1")).toThrow(
			"Signal not found in specified device: signal-1",
		);
	});
});
