/**
 * Normalizes a value for case-insensitive and whitespace-tolerant matching.
 */
export const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Serializes a value into pretty JSON using two-space indentation.
 */
export const toJson = (value: unknown): string =>
	JSON.stringify(value, null, 2);

/**
 * Finds a single item by `name`/`nickname` using exact match only.
 * Returns `null` when not found or when exact matches are duplicated.
 */
export const findSingleByName = <
	T extends { name?: string; nickname?: string },
>(
	items: T[],
	target: string,
): T | null => {
	const normalizedTarget = normalize(target);
	const exact = items.filter((item) => {
		const candidate = normalize(item.name ?? item.nickname ?? "");
		return candidate === normalizedTarget;
	});
	if (exact.length === 1) {
		return exact[0] ?? null;
	}
	return null;
};
