import { describe, expect, it } from "vitest";

import { clampToSrgb, oklchToLinearRgb, parseOklch } from "./theme";

/** Linear sRGB -> 8-bit sRGB, for comparing against known hex values. */
function to8bit(v: number): number {
	const clamped = Math.min(1, Math.max(0, v));
	const encoded =
		clamped <= 0.0031308
			? 12.92 * clamped
			: 1.055 * clamped ** (1 / 2.4) - 0.055;
	return Math.round(encoded * 255);
}

describe("parseOklch", () => {
	it("reads the channel-triplet form the tokens are stored in", () => {
		expect(parseOklch("70% 0.17 55")).toEqual({ l: 0.7, c: 0.17, h: 55 });
	});

	it("reads a full oklch() wrapper and the 0-1 lightness form", () => {
		expect(parseOklch("oklch(0.7 0.17 55)")).toEqual({
			l: 0.7,
			c: 0.17,
			h: 55,
		});
	});

	it("ignores an alpha component", () => {
		expect(parseOklch("70% 0.17 55 / 0.8")).toEqual({ l: 0.7, c: 0.17, h: 55 });
	});

	it("returns null rather than NaN channels for junk", () => {
		expect(parseOklch("")).toBeNull();
		expect(parseOklch("not a colour")).toBeNull();
	});
});

describe("oklchToLinearRgb", () => {
	// Cross-checked against the shipped token hex values in docs/DESIGN_SYSTEM.md
	it.each([
		["brand", { l: 0.7, c: 0.17, h: 55 }, [0xec, 0x7c, 0x0e]],
		["selected", { l: 0.7, c: 0.16, h: 250 }, [0x42, 0xa3, 0xfd]],
		["ok", { l: 0.75, c: 0.15, h: 145 }, [0x6b, 0xc6, 0x70]],
		["surface-0", { l: 0.13, c: 0, h: 0 }, [0x07, 0x07, 0x07]],
		["scene-bg", { l: 0.18, c: 0, h: 0 }, [0x11, 0x11, 0x11]],
	])("matches the documented hex for %s", (_name, oklch, expected) => {
		const actual = oklchToLinearRgb(oklch).map(to8bit);
		// allow one 8-bit step for rounding differences
		for (let i = 0; i < 3; i++) {
			expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(1);
		}
	});
});

describe("clampToSrgb", () => {
	it("leaves an in-gamut colour untouched", () => {
		const c = { l: 0.7, c: 0.16, h: 250 };
		expect(clampToSrgb(c)).toEqual(c);
	});

	it("reduces chroma for the P3 lift rather than clipping channels", () => {
		// the P3 value for `brand`; sRGB ceiling at this L/H is ~0.173
		const clamped = clampToSrgb({ l: 0.7, c: 0.195, h: 55 });
		expect(clamped.c).toBeLessThan(0.195);
		expect(clamped.c).toBeGreaterThan(0.16);
		// lightness and hue must survive the reduction
		expect(clamped.l).toBe(0.7);
		expect(clamped.h).toBe(55);
	});

	it("produces an in-gamut result", () => {
		const rgb = oklchToLinearRgb(clampToSrgb({ l: 0.75, c: 0.4, h: 145 }));
		for (const v of rgb) {
			expect(v).toBeGreaterThanOrEqual(-1e-6);
			expect(v).toBeLessThanOrEqual(1 + 1e-6);
		}
	});
});
