/**
 * Bridge between the CSS colour tokens and the Three.js layer.
 *
 * Three.js cannot parse `oklch()` — its Color parser handles hex, rgb, hsl and
 * named colours only. So tokens are read from the cascade, converted here, and
 * handed to Three as linear-sRGB, which is Three's own working colour space.
 *
 * Tokens are gamut-clamped on the way through. On a wide-gamut display the
 * cascade resolves the P3 lift, but three@0.184 has no Display-P3 output at all
 * (`DisplayP3ColorSpace` does not exist and the build contains no reference to
 * display-p3), so the canvas is sRGB-only. Handing it out-of-gamut values would
 * clip per channel and shift hue; reducing chroma instead preserves it.
 */

export interface Oklch {
	l: number;
	c: number;
	h: number;
}

/** Linear-sRGB, Three.js's working colour space. */
export type LinearRgb = [number, number, number];

const M2_INV = [
	[1, 0.3963377774, 0.2158037573],
	[1, -0.1055613458, -0.0638541728],
	[1, -0.0894841775, -1.291485548],
];
const LMS_TO_XYZ = [
	[1.2268798758, -0.5578149944, 0.2813910456],
	[-0.0405757452, 1.1122868032, -0.071711058],
	[-0.0763729366, -0.4214933324, 1.5869240198],
];
const XYZ_TO_LINEAR_SRGB = [
	[3.2409699419, -1.5373831776, -0.4986107603],
	[-0.9692436363, 1.8759675015, 0.0415550574],
	[0.0556300797, -0.2039769589, 1.0569715142],
];

function apply(m: number[][], v: number[]): number[] {
	return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

/**
 * Parses the channel form the tokens are stored in — `"70% 0.17 55"` — and also
 * tolerates a full `oklch(...)` wrapper, since `getComputedStyle` returns the
 * resolved variable either way depending on which custom property is read.
 */
export function parseOklch(value: string): Oklch | null {
	const inner = value
		.trim()
		.replace(/^oklch\(/i, "")
		.replace(/\)$/, "");
	const parts = inner.split(/[\s/]+/).filter(Boolean);
	if (parts.length < 3) return null;

	const l = Number.parseFloat(parts[0]);
	const c = Number.parseFloat(parts[1]);
	const h = Number.parseFloat(parts[2]);
	if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) {
		return null;
	}
	// Lightness may arrive as `70%` or as the 0-1 form browsers serialise to.
	return { l: parts[0].includes("%") ? l / 100 : l, c, h };
}

/** Converts to linear sRGB. The result may fall outside [0,1] if out of gamut. */
export function oklchToLinearRgb({ l, c, h }: Oklch): LinearRgb {
	const rad = (h * Math.PI) / 180;
	const lab = [l, c * Math.cos(rad), c * Math.sin(rad)];
	const lms = apply(M2_INV, lab).map((x) => x ** 3);
	return apply(XYZ_TO_LINEAR_SRGB, apply(LMS_TO_XYZ, lms)) as LinearRgb;
}

function inSrgb(color: Oklch): boolean {
	return oklchToLinearRgb(color).every((v) => v >= -1e-6 && v <= 1 + 1e-6);
}

/**
 * Reduces chroma until the colour fits sRGB, holding lightness and hue. This is
 * the same approach CSS Color 4 gamut mapping takes, and unlike per-channel
 * clipping it does not rotate the hue.
 */
export function clampToSrgb(color: Oklch): Oklch {
	if (inSrgb(color)) return color;
	let lo = 0;
	let hi = color.c;
	for (let i = 0; i < 24; i++) {
		const mid = (lo + hi) / 2;
		if (inSrgb({ ...color, c: mid })) lo = mid;
		else hi = mid;
	}
	return { ...color, c: lo };
}

/**
 * Reads a colour token off the cascade and returns it ready for
 * `Color.setRGB(...rgb, LinearSRGBColorSpace)`. Returns null when the property
 * is absent or unparseable, so callers can keep an explicit fallback.
 */
export function readTokenRgb(el: Element, token: string): LinearRgb | null {
	const raw = getComputedStyle(el).getPropertyValue(token);
	if (!raw) return null;
	const parsed = parseOklch(raw);
	if (!parsed) return null;
	return oklchToLinearRgb(clampToSrgb(parsed)).map((v) =>
		Math.min(1, Math.max(0, v)),
	) as LinearRgb;
}
