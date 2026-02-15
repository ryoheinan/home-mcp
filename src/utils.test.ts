import { findSingleByName, normalize, toJson } from "./utils";

describe("utils", () => {
	describe("normalize", () => {
		it("trims and lowercases a string", () => {
			expect(normalize("  HeLLo WoRLD  ")).toBe("hello world");
		});
	});

	describe("toJson", () => {
		it("stringifies with 2-space indentation", () => {
			expect(toJson({ a: 1 })).toBe('{\n  "a": 1\n}');
		});
	});

	describe("findSingleByName", () => {
		it("returns a unique exact match", () => {
			const items = [{ name: "Power On" }, { name: "Power Off" }];
			expect(findSingleByName(items, "power on")).toEqual({
				name: "Power On",
			});
		});

		it("returns null when exact matches are duplicated", () => {
			const items = [{ name: "TV" }, { name: "tv" }];
			expect(findSingleByName(items, "tv")).toBeNull();
		});

		it("returns null when only partial matches exist", () => {
			const items = [{ nickname: "Living Room TV" }, { nickname: "Bedroom" }];
			expect(findSingleByName(items, "room tv")).toBeNull();
		});

		it("returns null when no match exists", () => {
			const items = [{ name: "Cool" }, { name: "Heat" }];
			expect(findSingleByName(items, "dry")).toBeNull();
		});
	});
});
