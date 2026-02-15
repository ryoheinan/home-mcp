import createClient from "openapi-fetch";

import { NatureRemoApiError } from "./errors/nature-remo-api-error";
import type { paths as NatureRemoPaths } from "./types/generated/nature-remo-openapi";
import type {
	AirconSettingsForm,
	AirconSettingsInput,
	NatureRemoClient,
	RemoAppliance,
	RemoDevice,
} from "./types/nature-remo";

const API_BASE_URL = "https://api.nature.global";
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

type RemoFetchResult<T = unknown> = {
	data?: T | null;
	error?: unknown;
	response: Response;
};

export const createNatureRemoClient = (
	accessToken: string,
	fetchFn: typeof fetch = fetch,
): NatureRemoClient => {
	const apiClient = createClient<NatureRemoPaths>({
		baseUrl: API_BASE_URL,
		fetch: fetchFn,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		},
		bodySerializer: serializeFormBody,
	});

	const getDevices = async (): Promise<RemoDevice[]> => {
		return requestData(apiClient.GET("/1/devices"), []);
	};

	const getAppliances = async (): Promise<RemoAppliance[]> => {
		return requestData(apiClient.GET("/1/appliances"), []);
	};

	const sendSignal = async (signalId: string): Promise<void> => {
		await postForm(
			apiClient.POST("/1/signals/{signalid}/send", {
				params: {
					path: {
						signalid: signalId,
					},
				},
				body: {},
				parseAs: "text",
			}),
		);
	};

	const controlTv = async (
		applianceId: string,
		button: string,
	): Promise<void> => {
		await postForm(
			apiClient.POST("/1/appliances/{applianceid}/tv", {
				params: {
					path: {
						applianceid: applianceId,
					},
				},
				headers: {
					"Content-Type": FORM_CONTENT_TYPE,
				},
				body: { button },
				parseAs: "text",
			}),
		);
	};

	const controlLight = async (
		applianceId: string,
		button: string,
	): Promise<void> => {
		await postForm(
			apiClient.POST("/1/appliances/{applianceid}/light", {
				params: {
					path: {
						applianceid: applianceId,
					},
				},
				headers: {
					"Content-Type": FORM_CONTENT_TYPE,
				},
				body: { button },
				parseAs: "text",
			}),
		);
	};

	const controlAircon = async (
		applianceId: string,
		settings: AirconSettingsInput,
	): Promise<void> => {
		await postForm(
			apiClient.POST("/1/appliances/{applianceid}/aircon_settings", {
				params: {
					path: {
						applianceid: applianceId,
					},
				},
				headers: {
					"Content-Type": FORM_CONTENT_TYPE,
				},
				body: toAirconSettingsForm(settings),
				parseAs: "text",
			}),
		);
	};

	return {
		getDevices,
		getAppliances,
		sendSignal,
		controlTv,
		controlLight,
		controlAircon,
	};
};

const requestData = async <T>(
	request: Promise<RemoFetchResult<T>>,
	fallback: NonNullable<T>,
): Promise<NonNullable<T>> => {
	const result = await request;
	if (result.error !== undefined || !result.response.ok) {
		throw await toNatureRemoApiError(result);
	}

	return (result.data ?? fallback) as NonNullable<T>;
};

const requestVoid = async (
	request: Promise<RemoFetchResult>,
): Promise<void> => {
	const result = await request;
	if (result.error !== undefined || !result.response.ok) {
		throw await toNatureRemoApiError(result);
	}
};

const postForm = async (request: Promise<RemoFetchResult>): Promise<void> => {
	await requestVoid(request);
};

const toAirconSettingsForm = (
	settings: AirconSettingsInput,
): AirconSettingsForm => {
	return {
		air_direction: settings.air_direction ?? "",
		air_direction_h: settings.air_direction_h ?? "",
		air_volume: settings.air_volume ?? "",
		button: settings.button ?? "",
		operation_mode: settings.operation_mode ?? "",
		temperature: settings.temperature ?? "",
		temperature_unit: settings.temperature_unit ?? "",
	};
};

const serializeFormBody = (body: unknown): URLSearchParams => {
	const params = new URLSearchParams();
	if (!body || typeof body !== "object") {
		return params;
	}

	for (const [key, value] of Object.entries(body)) {
		if (value !== undefined) {
			params.set(key, String(value));
		}
	}

	return params;
};

const toNatureRemoApiError = async (
	result: RemoFetchResult,
): Promise<NatureRemoApiError> => {
	const body = await readErrorBody(result);
	return new NatureRemoApiError(
		`Nature Remo API request failed: ${result.response.status}`,
		result.response.status,
		body,
	);
};

const readErrorBody = async (result: RemoFetchResult): Promise<string> => {
	if (result.error !== undefined) {
		const directErrorMessage = toErrorMessage(result.error);
		if (directErrorMessage) {
			return directErrorMessage;
		}
	}

	try {
		return await result.response.clone().text();
	} catch {
		return "";
	}
};

const toErrorMessage = (error: unknown): string => {
	if (typeof error === "string") {
		return error;
	}

	if (error === null || error === undefined) {
		return "";
	}

	if (error instanceof Error) {
		return error.message;
	}

	try {
		return JSON.stringify(error);
	} catch {
		return "";
	}
};

export { NatureRemoApiError };
