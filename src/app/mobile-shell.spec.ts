import { describe, expect, it } from "vitest";

import {
	MOBILE_BREAKPOINT_PX,
	MOBILE_TABS,
	type MobilePanelType,
	type MobileTab,
	mobileMediaQuery,
	mobileTabToPanelType,
	panelTypeToMobileTab,
} from "./mobile-shell";

describe("mobile shell mapping", () => {
	it("maps each tab to a unique panel type and back", () => {
		const panels = MOBILE_TABS.map((tab) => mobileTabToPanelType(tab.id));
		expect(new Set(panels).size).toBe(MOBILE_TABS.length);

		for (const tab of MOBILE_TABS) {
			const panel = mobileTabToPanelType(tab.id);
			expect(panelTypeToMobileTab(panel)).toBe(tab.id);
		}
	});

	it("covers every workbench panel type", () => {
		const panels: MobilePanelType[] = [
			"viewport",
			"scene_graph",
			"node_editor",
			"properties",
			"terminal",
		];
		const tabs = panels.map((panel) => panelTypeToMobileTab(panel));
		expect(new Set(tabs).size).toBe(panels.length);
		for (const tab of tabs) {
			expect(MOBILE_TABS.some((item) => item.id === tab)).toBe(true);
		}
	});

	it("uses a phone-width breakpoint", () => {
		expect(MOBILE_BREAKPOINT_PX).toBe(900);
		expect(mobileMediaQuery()).toContain("max-width");
		const unusedTab: MobileTab = "view";
		expect(mobileTabToPanelType(unusedTab)).toBe("viewport");
	});
});
