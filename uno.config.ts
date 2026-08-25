import { defineConfig } from "unocss";
import { presetWind4 } from "unocss/preset-wind4";

/**
 * Colour tokens are stored as OKLCH *channel triplets* in CSS custom properties,
 * and registered below as `oklch(var(--x-ch))`.
 *
 * Channels rather than whole colours so the wide-gamut block can override one
 * variable instead of every generated class. presetWind4 layers alpha on top via
 * `color-mix`, so `bg-surface-0/80` works without an `%alpha` placeholder — that
 * placeholder is a presetWind3 form and wind4 emits it literally if present.
 * See docs/DESIGN_SYSTEM.md DEC-2 and DEC-13.
 */
const tokens = {
	// Neutral ground. The previous ramp declared hue 95, but at chroma 0.006-0.010
	// the 8-bit R-B channel spread was only 4-7 levels — below the ~8 needed for a
	// cast to read as anything but grey. Rather than raise the chroma until the
	// warmth showed, the ramp is now honestly colourless and the single warm brand
	// accent carries the identity. See docs/DESIGN_SYSTEM.md P1 and DEC-18.
	"surface-0": "13% 0 0",
	"surface-1": "18% 0 0",
	"surface-2": "23% 0 0",
	"surface-3": "29% 0 0",
	border: "34% 0 0",

	"text-main": "92% 0 0",
	"text-muted": "74% 0 0",
	"text-control": "62% 0 0",

	// One colour per meaning. `brand` is identity only and never a status; the four
	// semantics are conventional so log levels read without being learned. The old
	// accent-orange carried brand, SIM_RUNNING and WARN simultaneously, which is
	// what made the interface read noisy. See P3b.
	brand: "70% 0.17 55",
	selected: "70% 0.16 250",
	ok: "75% 0.15 145",
	warn: "80% 0.16 100",
	error: "72% 0.17 25",
} as const;

/**
 * The 3D scene's own ramp. Consumed only by the Three.js layer via getComputedStyle,
 * so these are emitted as custom properties but deliberately kept out of
 * theme.colors — no utility classes are wanted for them.
 *
 * Lightness is re-grounded against the new frame while preserving the ΔL the scene
 * was authored with, so the viewport keeps its internal contrast but stops reading
 * as a lit hole (it was L26% against a L13% frame). Hue is dropped to match the
 * neutral chrome — see docs/DESIGN_SYSTEM.md C6.
 */
const sceneTokens = {
	"scene-bg": "18% 0 0",
	"scene-grid-minor": "21% 0 0",
	"scene-grid-major": "33% 0 0",
	"scene-part-dark": "16% 0 0",
	"scene-part-mid": "48% 0 0",
	"scene-part-light": "56% 0 0",
	// A near-neutral fill. The old 0x4488ff was L64% C0.19 — at intensity 1 it
	// washed every surface cool regardless of material, so neutralising the
	// materials alone would not have removed the cast.
	"scene-fill-light": "78% 0.02 250",
} as const;

/**
 * Display-P3 lift: a uniform 15% chroma increase, clamped to each hue's real P3
 * ceiling. Pushing every role to its own ceiling instead would unbalance the set —
 * green has far more P3 headroom than blue, so it would leap while blue barely
 * moved. sRGB values are untouched.
 */
const p3Tokens = {
	brand: "70% 0.195 55",
	selected: "70% 0.175 250",
	ok: "75% 0.172 145",
	warn: "80% 0.184 100",
	error: "72% 0.195 25",
} as const;

const declare = (entries: Record<string, string>, indent = "\t\t") =>
	Object.entries(entries)
		.map(([name, channels]) => `${indent}--${name}-ch: ${channels};`)
		.join("\n");

/** Resolved colours, for consumers that cannot use a utility class: SVG presentation
 *  attributes, `radial-gradient()` in inline styles, and the Three.js layer. These
 *  reference the channel vars, so they inherit the P3 lift automatically. */
const resolved = Object.keys(tokens)
	.map((name) => `\t\t--${name}: oklch(var(--${name}-ch));`)
	.join("\n");

const resolvedScene = Object.keys(sceneTokens)
	.map((name) => `\t\t--${name}: oklch(var(--${name}-ch));`)
	.join("\n");

export default defineConfig({
	presets: [
		presetWind4({
			// The v4 Preflight is a full reset — box-sizing, zeroed margins/padding,
			// border: 0 solid, line-height 1.5 on html. Adopting it is the right end
			// state (audit B4) but it moves every fixed-height bordered row by 2px,
			// so it stays off while appearance is held constant (DEC-11).
			preflights: { reset: false },
		}),
	],

	preflights: [
		{
			getCSS: () => `
	:root {
		color-scheme: dark;

${declare(tokens)}

${declare(sceneTokens)}

${resolved}
${resolvedScene}
	}

	@media (color-gamut: p3) {
		:root {
${declare(p3Tokens, "\t\t\t")}
		}
	}
`,
		},
	],

	theme: {
		/**
		 * Four sizes, each carrying its own leading so the two can never drift
		 * apart again — the old build mixed `text-[Npx]` (font-size only, leading
		 * `normal`) with `text-xs/sm/lg` (fixed rem leading), so comparable rows
		 * sat on different baselines (T2).
		 *
		 * Written in rem because the spacing scale already is: with px type a
		 * changed browser font-size scaled every gap and no text, pulling the
		 * layout apart. `field` is 1rem specifically because iOS Safari zooms the
		 * page when focusing an input under 16px.
		 *
		 * This REPLACES the default ramp rather than extending it, so a stray
		 * `text-xs` generates nothing and surfaces immediately (DEC-14).
		 */
		text: {
			micro: { fontSize: "0.6875rem", lineHeight: "1.15" },
			ui: { fontSize: "0.8125rem", lineHeight: "1.15" },
			prose: { fontSize: "0.8125rem", lineHeight: "1.5" },
			field: { fontSize: "1rem", lineHeight: "1.25" },
		},

		font: {
			sans: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
			// JetBrains Mono was downloaded but never in the stack, so all 40
			// font-mono usages were silently rendering in Menlo (T4).
			mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
		},

		// v4 renamed two scales. Pinned to v3 values so appearance is unchanged:
		//   blur.sm      4px -> 8px
		//   radius.sm    0.125rem -> 0.25rem  (v4's 2px moved to `rounded-xs`)
		blur: { sm: "4px" },
		radius: { sm: "0.125rem" },

		colors: {
			surface: {
				0: "oklch(var(--surface-0-ch))",
				1: "oklch(var(--surface-1-ch))",
				2: "oklch(var(--surface-2-ch))",
				3: "oklch(var(--surface-3-ch))",
			},
			border: "oklch(var(--border-ch))",

			main: "oklch(var(--text-main-ch))",
			muted: "oklch(var(--text-muted-ch))",
			control: "oklch(var(--text-control-ch))",

			brand: "oklch(var(--brand-ch))",
			selected: "oklch(var(--selected-ch))",
			ok: "oklch(var(--ok-ch))",
			warn: "oklch(var(--warn-ch))",
			error: "oklch(var(--error-ch))",
		},
	},

	/**
	 * The four-size scale is the whole vocabulary. UnoCSS deep-merges theme
	 * objects rather than replacing them, so presetWind4's default ramp is still
	 * reachable — blocking it here is what actually enforces the constraint.
	 * A blocked class generates nothing, so a stray one shows up as unstyled text
	 * rather than quietly reintroducing an eighth size.
	 */
	blocklist: [/^text-(xs|sm|base|lg|[0-9]?xl)$/, /^text-\[\d+(\.\d+)?px\]$/],

	rules: [["placeholder-opaque", { "--un-placeholder-opacity": "1" }]],

	shortcuts: {
		"panel-header":
			"h-6 flex-none bg-surface-1 flex items-center justify-between px-1.5 border-b border-border select-none min-w-0",
		"btn-window":
			"w-5 h-5 flex items-center justify-center hover:bg-surface-2 hover:text-main rounded text-[10px] transition-colors",
	},

	/**
	 * Scanned by @unocss/postcss, which runs inside Angular's own CSS pipeline via
	 * .postcssrc.json. There is no committed generated stylesheet any more — the
	 * utilities are produced on every build and every dev-server rebuild, so they
	 * can no longer go stale (audit B1) and no longer fight Biome's formatter (B5).
	 */
	content: {
		filesystem: ["src/**/*.html", "src/**/*.ts"],
	},
});
