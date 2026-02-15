import { NatureRemoApiError } from "./errors/nature-remo-api-error";
import { createNatureRemoClient } from "./nature-remo";

const getRequest = (
	fetchMock: ReturnType<typeof vi.fn>,
	index = 0,
): Request => {
	const [request] = fetchMock.mock.calls[index] ?? [];
	expect(request).toBeInstanceOf(Request);
	return request as Request;
};

describe("NatureRemoClient", () => {
	it("gets devices with bearer auth", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(JSON.stringify([{ id: "device-1", name: "My Remo" }]), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		const client = createNatureRemoClient("token-123", fetchMock);

		const devices = await client.getDevices();

		expect(devices).toEqual([{ id: "device-1", name: "My Remo" }]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const request = getRequest(fetchMock);
		expect(request.url).toBe("https://api.nature.global/1/devices");
		expect(request.method).toBe("GET");
		expect(request.headers.get("Authorization")).toBe("Bearer token-123");
	});

	it("gets appliances with bearer auth", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify([{ id: "ap1", nickname: "AC", type: "AC" }]),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			),
		);
		const client = createNatureRemoClient("token-123", fetchMock);

		const appliances = await client.getAppliances();

		expect(appliances).toEqual([{ id: "ap1", nickname: "AC", type: "AC" }]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const request = getRequest(fetchMock);
		expect(request.url).toBe("https://api.nature.global/1/appliances");
		expect(request.method).toBe("GET");
		expect(request.headers.get("Authorization")).toBe("Bearer token-123");
	});

	it("posts aircon settings as form-urlencoded", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response("", { status: 200 }));
		const client = createNatureRemoClient("token-123", fetchMock);

		await client.controlAircon("appliance-id", {
			operation_mode: "cool",
			temperature: "26",
			temperature_unit: "c",
			air_volume: "auto",
			air_direction: "auto",
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const request = getRequest(fetchMock);
		expect(request.url).toBe(
			"https://api.nature.global/1/appliances/appliance-id/aircon_settings",
		);
		expect(request.method).toBe("POST");

		const body = await request.text();
		expect(body).toContain("operation_mode=cool");
		expect(body).toContain("temperature=26");
		expect(body).toContain("temperature_unit=c");
		expect(body).toContain("air_volume=auto");
		expect(body).toContain("air_direction=auto");
		expect(request.headers.get("Content-Type")).toBe(
			"application/x-www-form-urlencoded",
		);
	});

	it("encodes signal id path segment when sending signal", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response("", { status: 200 }));
		const client = createNatureRemoClient("token-123", fetchMock);

		await client.sendSignal("signal/with/slash");

		const request = getRequest(fetchMock);
		expect(request.url).toBe(
			"https://api.nature.global/1/signals/signal%2Fwith%2Fslash/send",
		);
		expect(request.method).toBe("POST");
	});

	it("throws NatureRemoApiError on non-2xx", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response("bad request", {
				status: 400,
				headers: { "content-type": "text/plain" },
			}),
		);
		const client = createNatureRemoClient("token-123", fetchMock);

		const promise = client.getAppliances();
		await expect(promise).rejects.toBeInstanceOf(NatureRemoApiError);
		await expect(promise).rejects.toMatchObject({
			name: "NatureRemoApiError",
			status: 400,
		});
	});
});
