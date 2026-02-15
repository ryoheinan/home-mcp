export class NatureRemoApiError extends Error {
	public readonly status: number;
	public readonly body: string;

	constructor(message: string, status: number, body: string) {
		super(message);
		this.name = "NatureRemoApiError";
		this.status = status;
		this.body = body;
	}
}
