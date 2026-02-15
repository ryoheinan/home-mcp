import type {
	components as NatureRemoComponents,
	paths as NatureRemoPaths,
} from "./generated/nature-remo-openapi";

type Schemas = NatureRemoComponents["schemas"];
type RemoDeviceResponse = Schemas["DeviceResponse"];
type RemoApplianceResponse = Schemas["ApplianceResponse"];
type RemoSignalResponse = Schemas["Signal"];
type RemoSensorValueResponse = Schemas["SensorValue"];

export type AirconSettingsForm =
	NatureRemoPaths["/1/appliances/{applianceid}/aircon_settings"]["post"]["requestBody"]["content"]["application/x-www-form-urlencoded"];

export type RemoSensorValue = {
	val: RemoSensorValueResponse["val"];
	created_at: RemoSensorValueResponse["created_at"];
};

export type RemoNewestEvents = {
	te?: RemoSensorValue;
	hu?: RemoSensorValue;
	il?: RemoSensorValue;
	mo?: RemoSensorValue;
};

export type RemoSignal = {
	id: RemoSignalResponse["id"];
	name: RemoSignalResponse["name"];
	image?: RemoSignalResponse["image"];
};

export type RemoDevice = {
	id: RemoDeviceResponse["id"];
	name: RemoDeviceResponse["name"];
	online?: RemoDeviceResponse["online"];
	newest_events?: RemoNewestEvents | null;
};

export type RemoAppliance = {
	id: RemoApplianceResponse["id"];
	nickname: RemoApplianceResponse["nickname"];
	type: RemoApplianceResponse["type"];
	signals?: RemoSignal[] | null;
	device?: {
		id?: Schemas["Device"]["id"];
		name?: Schemas["Device"]["name"];
	} | null;
	settings?: {
		temp?: Schemas["AirconSettingsResponse"]["temp"];
		temp_unit?: Schemas["AirconSettingsResponse"]["temp_unit"];
		mode?: Schemas["AirconSettingsResponse"]["mode"];
		vol?: Schemas["AirconSettingsResponse"]["vol"];
		dir?: Schemas["AirconSettingsResponse"]["dir"];
	} | null;
};

export type AirconSettingsInput = {
	operation_mode?: AirconSettingsForm["operation_mode"];
	temperature?: AirconSettingsForm["temperature"];
	temperature_unit?: AirconSettingsForm["temperature_unit"];
	air_volume?: AirconSettingsForm["air_volume"];
	air_direction?: AirconSettingsForm["air_direction"];
	air_direction_h?: AirconSettingsForm["air_direction_h"];
	button?: AirconSettingsForm["button"];
};

export type NatureRemoClient = {
	getDevices: () => Promise<RemoDevice[]>;
	getAppliances: () => Promise<RemoAppliance[]>;
	sendSignal: (signalId: string) => Promise<void>;
	controlTv: (applianceId: string, button: string) => Promise<void>;
	controlLight: (applianceId: string, button: string) => Promise<void>;
	controlAircon: (
		applianceId: string,
		settings: AirconSettingsInput,
	) => Promise<void>;
};
