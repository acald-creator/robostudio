import { CommonModule } from "@angular/common";
import {
	Component,
	computed,
	ElementRef,
	effect,
	inject,
	signal,
} from "@angular/core";

import { DESIGN_SYSTEM_TAG } from "./design-system.host";

/**
 * Design system reference — a diagnostic surface, not a showcase.
 *
 * Renders every token and component primitive the workbench uses, through the
 * real UnoCSS pipeline and the real :root tokens. If a token changes in
 * uno.config.ts, this page changes with it — it cannot drift.
 *
 * Known defects are marked inline with their ledger id so they stay visible
 * rather than being quietly rendered as if correct. See docs/DESIGN_SYSTEM.md.
 */

export type PaletteId = "current" | "a";

interface PaletteSwatch {
	name: string;
	/** OKLCH channel triplet, as stored in the --*-ch custom properties */
	ch: string;
	hex: string;
	/** 8-bit R-B channel spread. Below ~8 a hue cast reads as neutral grey. */
	rb: number;
}
interface PaletteRole extends Omit<PaletteSwatch, "rb"> {
	/** APCA Lc against surface-0 and surface-2 of this same palette */
	lc0: number;
	lc2: number;
}
interface Palette {
	label: string;
	note: string;
	/** True when the ramp is deliberately colourless, so R−B 0 is the intent
	 *  rather than a tint that failed to survive quantisation. */
	neutral?: boolean;
	surfaces: PaletteSwatch[];
	roles: PaletteRole[];
}

const PALETTES: Record<PaletteId, Palette> = {
	current: {
		label: "Current (shipped)",
		neutral: true,
		note: "shipped — neutral ground, one colour per meaning",
		surfaces: [
			{ name: "surface-0", ch: "13% 0 0", hex: "#070707", rb: 0 },
			{ name: "surface-1", ch: "18% 0 0", hex: "#121212", rb: 0 },
			{ name: "surface-2", ch: "23% 0 0", hex: "#1d1d1d", rb: 0 },
			{ name: "surface-3", ch: "29% 0 0", hex: "#2b2b2b", rb: 0 },
			{ name: "border", ch: "34% 0 0", hex: "#383838", rb: 0 },
		],
		roles: [
			{
				name: "brand",
				ch: "70% 0.17 55",
				hex: "#ec7c0e",
				lc0: 48.2,
				lc2: 46.6,
			},
			{
				name: "selected",
				ch: "70% 0.16 250",
				hex: "#42a3fd",
				lc0: 50.4,
				lc2: 48.8,
			},
			{ name: "ok", ch: "75% 0.15 145", hex: "#6bc670", lc0: 61.0, lc2: 59.4 },
			{
				name: "warn",
				ch: "80% 0.16 100",
				hex: "#d6bf1f",
				lc0: 67.8,
				lc2: 66.1,
			},
			{
				name: "error",
				ch: "72% 0.17 25",
				hex: "#fd736d",
				lc0: 50.5,
				lc2: 48.8,
			},
		],
	},
	a: {
		label: "Alt \u00b7 warm ramp",
		note: "alternate — warm ramp at the perceptibility threshold; rejected as too orange",
		surfaces: [
			{ name: "surface-0", ch: "15% 0.019 85", hex: "#0f0b03", rb: 12 },
			{ name: "surface-1", ch: "19% 0.017 85", hex: "#17130b", rb: 12 },
			{ name: "surface-2", ch: "24% 0.016 85", hex: "#231f17", rb: 12 },
			{ name: "surface-3", ch: "30% 0.015 85", hex: "#312d25", rb: 12 },
			{ name: "border", ch: "34% 0.014 85", hex: "#3b3730", rb: 11 },
		],
		roles: [
			{
				name: "brand",
				ch: "70% 0.15 60",
				hex: "#e18528",
				lc0: 48.6,
				lc2: 46.8,
			},
			{
				name: "selected",
				ch: "70% 0.16 250",
				hex: "#42a3fd",
				lc0: 50.3,
				lc2: 48.5,
			},
			{ name: "ok", ch: "75% 0.15 145", hex: "#6bc670", lc0: 60.9, lc2: 59.0 },
			{
				name: "warn",
				ch: "80% 0.16 100",
				hex: "#d6bf1f",
				lc0: 67.6,
				lc2: 65.8,
			},
			{
				name: "error",
				ch: "72% 0.17 25",
				hex: "#fd736d",
				lc0: 50.3,
				lc2: 48.5,
			},
		],
	},
};

/**
 * Role -> the channel variable the workbench utilities already read, so the live
 * chrome below re-renders in the selected palette rather than only the swatches.
 */
function readPaletteFromUrl(): PaletteId {
	const q = new URLSearchParams(window.location.search).get("palette");
	return q === "a" || q === "current" ? q : "current";
}

const ROLE_TO_VAR: Record<string, string> = {
	brand: "--accent-orange-ch",
	selected: "--accent-blue-ch",
	ok: "--accent-green-ch",
};

interface TextToken {
	name: string;
	hex: string;
	/** APCA Lc against surface-0 / surface-1 / surface-2 */
	lc: [number, number, number];
	flag?: string;
}

interface TypeStep {
	label: string;
	px: number;
	uses: number | string;
	where: string;
	flag?: string;
}

interface SpaceStep {
	cls: string;
	rem: string;
	px: number;
	uses: number | string;
}

@Component({
	selector: DESIGN_SYSTEM_TAG,
	imports: [CommonModule],
	templateUrl: "./design-system.html",
	styleUrls: ["./design-system.css", "../mobile-shell.css"],
	host: { "[attr.data-palette]": "palette()" },
})
export class DesignSystem {
	readonly textTokens: TextToken[] = [
		{ name: "text-main", hex: "#e6e5df", lc: [90.5, 90.0, 88.7] },
		{
			name: "text-muted",
			hex: "#acaba5",
			lc: [56.4, 55.9, 54.6],
			flag: "OQ-1",
		},
		{
			name: "text-control",
			hex: "#888680",
			lc: [37.5, 37.0, 35.7],
			flag: "C9",
		},
		{
			name: "text-control + opacity-75",
			hex: "#696762",
			lc: [23.4, 23.8, 23.8],
			flag: "C9",
		},
	];

	readonly p3 = [
		{ name: "accent-orange", srgb: "0.16", p3: "0.226", ceiling: "0.227" },
		{ name: "accent-blue", srgb: "0.16", p3: "0.176", ceiling: "0.177" },
		{ name: "accent-green", srgb: "0.15", p3: "0.25", ceiling: "0.284" },
	];

	readonly desktopType: TypeStep[] = [
		{
			label: "text-[8px]",
			px: 8,
			uses: 1,
			where: "node editor LIVE badge",
			flag: "T8",
		},
		{
			label: "text-[9px]",
			px: 9,
			uses: 25,
			where: "status bar, tree glyphs, chips",
			flag: "T8",
		},
		{
			label: "text-[10px]",
			px: 10,
			uses: 36,
			where: "the workhorse — menus, labels, log",
			flag: "T8",
		},
		{
			label: "text-[11px]",
			px: 11,
			uses: 4,
			where: "panel titles, scene graph",
			flag: "T8",
		},
		{
			label: "text-xs",
			px: 12,
			uses: 3,
			where: "palette rows, pane content",
			flag: "T2",
		},
		{ label: "text-sm", px: 14, uses: 1, where: "palette input", flag: "T2" },
		{ label: "text-lg", px: 18, uses: 1, where: "palette chevron", flag: "T2" },
	];

	readonly mobileType: TypeStep[] = [
		{
			label: ".mobile-status",
			px: 10,
			uses: "—",
			where: "scene status readout",
		},
		{ label: ".mobile-nav-btn", px: 10, uses: "—", where: "bottom nav label" },
		{ label: ".mobile-ws-chip", px: 11, uses: "—", where: "workspace chips" },
		{ label: ".mobile-mark", px: 12, uses: "—", where: "app mark" },
		{
			label: ".mobile-scene-select",
			px: 13,
			uses: "—",
			where: "scene picker",
			flag: "iOS",
		},
		{ label: ".mobile-nav-icon", px: 16, uses: "—", where: "bottom nav glyph" },
	];

	readonly spacing: SpaceStep[] = [
		{ cls: "0.5", rem: "0.125rem", px: 2, uses: 4 },
		{ cls: "1", rem: "0.25rem", px: 4, uses: 46 },
		{ cls: "1.5", rem: "0.375rem", px: 6, uses: 24 },
		{ cls: "2", rem: "0.5rem", px: 8, uses: 24 },
		{ cls: "3", rem: "0.75rem", px: 12, uses: 4 },
		{ cls: "4", rem: "1rem", px: 16, uses: 6 },
	];

	readonly mobileSpacing = [2, 6, 8, 10, 12, 32, 36, 44, 52];

	readonly radii = [
		{ cls: "rounded-sm", value: "0.125rem", uses: 1 },
		{ cls: "rounded", value: "0.25rem", uses: 56 },
		{ cls: "rounded-md", value: "0.375rem", uses: 2 },
		{ cls: "rounded-xl", value: "0.75rem", uses: 1 },
		{ cls: "rounded-full", value: "9999px", uses: 3 },
	];

	readonly breakpoints = [
		{
			name: "UnoCSS md:",
			value: "48rem / 768px",
			used: "pane toolbars",
			flag: true,
		},
		{
			name: "JS matchMedia",
			value: "900px",
			used: "switches to the mobile shell",
			flag: true,
		},
		{
			name: ".app-shell font-size",
			value: "1200px",
			used: "drops base to 12px",
			flag: true,
		},
	];

	readonly issues = [
		{
			id: "B1",
			text: "ng build never runs UnoCSS — src/uno.css is regenerated by hand",
		},
		{
			id: "B4",
			text: "No CSS reset. Everything is content-box, so bordered fixed-height rows render 2px tall",
		},
		{
			id: "B6",
			text: "Pane toolbars use md: (viewport width) where they need container queries (panel width)",
		},
		{
			id: "C6",
			text: "Three.js scene neutrals are hue 285; every CSS surface is hue 95 — a 190° opposition",
		},
		{
			id: "C9",
			text: "text-control ships under opacity-75 at APCA Lc 23.4, below the floor for anything",
		},
		{
			id: "C10",
			text: "Destructive hover is hardcoded #4a1515 / #ff8888, outside the token system",
		},
		{
			id: "T2",
			text: "Two leading models: text-[Npx] sets size only; text-xs/sm/lg carry fixed rem leading",
		},
		{
			id: "T3",
			text: "Base size jumps 16px to 12px at exactly 1200px, while sized siblings stay put",
		},
		{
			id: "T4",
			text: "font-mono resolves to Menlo — JetBrains Mono is loaded but not in the stack",
		},
		{
			id: "T5",
			text: "font-bold is 700 but only 400/500/600 are loaded, so it renders as faux bold",
		},
		{
			id: "T6",
			text: "804 kB of fonts across 60 files, for a latin-only interface",
		},
		{
			id: "W5",
			text: "Tab strip is px-1 while the panel border below is flush — 4px seam misalignment",
		},
		{
			id: "W6",
			text: "No panel collapse or maximise-pane affordance anywhere",
		},
	];

	readonly paletteIds: PaletteId[] = ["current", "a"];
	/** `?palette=a` preselects a direction, so a specific comparison is linkable. */
	readonly palette = signal<PaletteId>(readPaletteFromUrl());
	readonly active = computed(() => PALETTES[this.palette()]);

	labelFor(id: PaletteId): string {
		return PALETTES[id].label;
	}

	setPalette(id: PaletteId): void {
		this.palette.set(id);
	}

	private readonly el: ElementRef<HTMLElement> = inject(ElementRef);

	constructor() {
		effect(() => {
			const p = PALETTES[this.palette()];
			const style = this.el.nativeElement.style;

			// Both the channel var and the resolved var have to be set. Custom
			// properties are substituted at computed-value time on the element that
			// declares them, so :root's `--surface-0: oklch(var(--surface-0-ch))`
			// was already resolved there — overriding only the channel var here
			// would leave every var(--surface-0) consumer on the old colour.
			for (const s of p.surfaces) {
				style.setProperty(`--${s.name}-ch`, s.ch);
				style.setProperty(`--${s.name}`, `oklch(${s.ch})`);
			}
			for (const r of p.roles) {
				style.setProperty(`--${r.name}`, `oklch(${r.ch})`);
				const mapped = ROLE_TO_VAR[r.name];
				if (mapped) {
					style.setProperty(mapped, r.ch);
					style.setProperty(mapped.replace("-ch", ""), `oklch(${r.ch})`);
				}
			}
		});
	}

	lcTier(lc: number): string {
		if (lc >= 60) return "pass";
		if (lc >= 45) return "warn";
		return "fail";
	}
}
