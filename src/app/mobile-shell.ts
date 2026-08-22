export const MOBILE_BREAKPOINT_PX = 900;

export type MobileTab = "view" | "scene" | "inspect" | "log" | "graph";

export type MobilePanelType =
	| "viewport"
	| "scene_graph"
	| "node_editor"
	| "properties"
	| "terminal";

export interface MobileTabItem {
	id: MobileTab;
	label: string;
	icon: string;
}

export const MOBILE_TABS: readonly MobileTabItem[] = [
	{ id: "view", label: "View", icon: "◉" },
	{ id: "scene", label: "Scene", icon: "☰" },
	{ id: "inspect", label: "Inspect", icon: "▣" },
	{ id: "log", label: "Log", icon: "≡" },
	{ id: "graph", label: "Graph", icon: " automatisch" },
];

const TAB_TO_PANEL: Record<MobileTab, MobilePanelType> = {
	view: "viewport",
	scene: "scene_graph",
	inspect: "properties",
	log: "terminal",
	graph: "node_editor",
};

const PANEL_TO_TAB: Record<MobilePanelType, MobileTab> = {
	viewport: "view",
	scene_graph: "scene",
	properties: "inspect",
	terminal: "log",
	node_editor: "graph",
};

export function mobileMediaQuery(): string {
	return `(max-width: ${MOBILE_BREAKPOINT_PX - 0.02}px)`;
}

export function mobileTabToPanelType(tab: MobileTab): MobilePanelType {
	return TAB_TO_PANEL[tab];
}

export function panelTypeToMobileTab(panelType: MobilePanelType): MobileTab {
	return PANEL_TO_TAB[panelType];
}
