import { defineConfig } from "unocss";
import { presetWind3 } from "unocss/preset-wind3";

export default defineConfig({
	presets: [
		presetWind3(), // Provides all the standard flex, w-full, p-2 utility classes
	],
	theme: {
		// We map our OKLCH color palette directly into the UnoCSS theme engine.
		// UnoCSS will automatically generate all text-, bg-, border-, and ring- variants for these,
		// including opacity modifiers like bg-surface-0/80!
		colors: {
			surface: {
				0: "oklch(15% 0.006 95)",
				1: "oklch(19% 0.007 95)",
				2: "oklch(24% 0.008 95)",
				3: "oklch(30% 0.009 95)",
			},
			border: "oklch(34% 0.01 95)",

			main: "oklch(92% 0.008 95)", // mapped to text-main
			muted: "oklch(74% 0.009 95)", // mapped to text-muted

			accent: {
				orange: "oklch(70% 0.16 45)",
				blue: "oklch(70% 0.16 250)",
				green: "oklch(75% 0.15 140)",
			},
		},
	},
	rules: [
		// Custom rule to force placeholder opacity to 1 (fixing the muted text issue we had)
		["placeholder-opaque", { "--un-placeholder-opacity": "1" }],
	],
	shortcuts: {
		// We can group common dense UI patterns into shortcuts to keep the HTML cleaner
		"panel-header":
			"h-6 flex-none bg-surface-1 flex items-center justify-between px-1.5 border-b border-border select-none min-w-0",
		"btn-window":
			"w-5 h-5 flex items-center justify-center hover:bg-surface-2 hover:text-main rounded text-[10px] transition-colors",
	},
	cli: {
		entry: {
			/**
			 * Glob patterns to match files
			 * Include HTML and inline templates in components.
			 */
			patterns: ["src/**/*.html", "src/**/*.ts"],
			/**
			 * The output filename for the generated UnoCSS file
			 */
			outFile: "./src/uno.css",
		},
	},
});
