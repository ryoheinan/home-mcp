import type {
	NatureRemoClient,
	RemoAppliance,
	RemoSignal,
} from "./types/nature-remo";

export type DeviceSafetyContext = {
	deviceId: string;
	deviceAppliances: RemoAppliance[];
};

export const buildDeviceSafetyContext = async (
	client: NatureRemoClient,
	deviceId: string,
): Promise<DeviceSafetyContext> => {
	const [devices, appliances] = await Promise.all([
		client.getDevices(),
		client.getAppliances(),
	]);
	if (!devices.some((device) => device.id === deviceId)) {
		throw new Error(`Device not found: ${deviceId}`);
	}

	const deviceAppliances = appliances.filter(
		(appliance) => appliance.device?.id === deviceId,
	);

	return {
		deviceId,
		deviceAppliances,
	};
};

export const requireDeviceScopedAppliance = (
	context: DeviceSafetyContext,
	applianceId: string,
): RemoAppliance => {
	const appliance = context.deviceAppliances.find(
		(item) => item.id === applianceId,
	);
	if (!appliance) {
		throw new Error(`Appliance not found in specified device: ${applianceId}`);
	}

	return appliance;
};

export const requireDeviceScopedSignal = (
	context: DeviceSafetyContext,
	signalId: string,
): { appliance: RemoAppliance; signal: RemoSignal } => {
	for (const appliance of context.deviceAppliances) {
		const signal = appliance.signals?.find((item) => item.id === signalId);
		if (!signal) {
			continue;
		}

		return { appliance, signal };
	}

	throw new Error(`Signal not found in specified device: ${signalId}`);
};
