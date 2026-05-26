import { CommonModule } from "@angular/common";
import {
	Component,
	computed,
	ElementRef,
	HostListener,
	signal,
	ViewChild,
} from "@angular/core";
import { Viewport } from "./components/viewport/viewport";

declare const THREE: any;

// --- Data Models ---
type PanelType =
	| "viewport"
	| "scene_graph"
	| "node_editor"
	| "properties"
	| "terminal";

interface LeafNode {
	id: string;
	type: "leaf";
	panelType: PanelType;
	focused: boolean;
	ratio?: number;
}

interface SplitNode {
	id: string;
	type: "split";
	direction: "horizontal" | "vertical";
	children: TreeNode[];
	ratio?: number;
}

type TreeNode = LeafNode | SplitNode;

interface Workspace {
	id: string;
	name: string;
	icon: string;
	tree: TreeNode;
}

interface Scene {
	id: string;
	name: string;
	status: "draft" | "ready" | "running";
}

interface CreationStep {
	id: "scene" | "entities" | "configure" | "run" | "inspect" | "save";
	label: string;
	done: boolean;
}

interface Command {
	id: string;
	label: string;
	shortcut?: string;
	icon: string;
	action: () => void;
}

@Component({
	selector: "app-root",
	imports: [CommonModule, Viewport],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.css",
})
export class AppComponent {
	@ViewChild("paletteInput") paletteInputEl!: ElementRef<HTMLInputElement>;

	// Layout State Definition Defaults
	defaultSimTree: TreeNode = {
		id: "1",
		type: "split",
		direction: "horizontal",
		ratio: 1,
		children: [
			{ id: "2", type: "leaf", panelType: "viewport", focused: true, ratio: 4 },
			{
				id: "3",
				type: "split",
				direction: "vertical",
				ratio: 1,
				children: [
					{
						id: "4",
						type: "split",
						direction: "vertical",
						ratio: 2,
						children: [
							{
								id: "5",
								type: "leaf",
								panelType: "scene_graph",
								focused: false,
								ratio: 1,
							},
							{
								id: "6",
								type: "leaf",
								panelType: "properties",
								focused: false,
								ratio: 1.5,
							},
						],
					},
					{
						id: "7",
						type: "leaf",
						panelType: "terminal",
						focused: false,
						ratio: 1,
					},
				],
			},
		],
	};

	defaultAiTree: TreeNode = {
		id: "ai-1",
		type: "split",
		direction: "horizontal",
		ratio: 1,
		children: [
			{
				id: "ai-2",
				type: "leaf",
				panelType: "node_editor",
				focused: true,
				ratio: 3,
			},
			{
				id: "ai-3",
				type: "split",
				direction: "vertical",
				ratio: 1,
				children: [
					{
						id: "ai-4",
						type: "leaf",
						panelType: "viewport",
						focused: false,
						ratio: 1.5,
					},
					{
						id: "ai-5",
						type: "leaf",
						panelType: "terminal",
						focused: false,
						ratio: 1,
					},
				],
			},
		],
	};

	workspaces = signal<Workspace[]>([
		{
			id: "ws-1",
			name: "Autonomous Rover",
			icon: "◱",
			tree: this.defaultSimTree,
		},
		{
			id: "ws-2",
			name: "Kinematics & Control",
			icon: "◲",
			tree: this.defaultAiTree,
		},
	]);

	activeWorkspaceId = signal<string>("ws-1");
	projectName = signal("Lucky Robotics Project");
	scenes = signal<Scene[]>([
		{ id: "scene-0", name: "Blank Scene (User Start)", status: "draft" },
		{ id: "scene-1", name: "Rover Yard", status: "draft" },
		{ id: "scene-2", name: "Robot Arm Assembly Lab", status: "draft" },
		{ id: "scene-3", name: "Carbuncle-Style Familiar Scene", status: "draft" },
	]);
	activeSceneId = signal("scene-0");
	creationSteps = signal<CreationStep[]>([
		{ id: "scene", label: "Create Scene", done: true },
		{ id: "entities", label: "Add Entities", done: false },
		{ id: "configure", label: "Configure", done: false },
		{ id: "run", label: "Run Sim", done: false },
		{ id: "inspect", label: "Inspect", done: false },
		{ id: "save", label: "Save", done: false },
	]);
	activeScene = computed(
		() => this.scenes().find((s) => s.id === this.activeSceneId()) || null,
	);
	creationProgress = computed(() => {
		const steps = this.creationSteps();
		const done = steps.filter((s) => s.done).length;
		return Math.round((done / steps.length) * 100);
	});
	nextPendingStep = computed(
		() => this.creationSteps().find((s) => !s.done) || null,
	);
	currentStepHint = computed(() => {
		const next = this.nextPendingStep();
		if (!next) return "All core creation steps complete.";
		const hints: Record<CreationStep["id"], string> = {
			scene: "Create or choose a scene as your world container.",
			entities: "Add robot, sensors, and environment entities.",
			configure: "Tune transforms and sensor/runtime parameters.",
			run: "Start simulation and verify behavior in viewport.",
			inspect: "Inspect logs, metrics, and sensor outputs.",
			save: "Save this scene state for reuse and iteration.",
		};
		return hints[next.id];
	});

	tree = signal<TreeNode>(JSON.parse(JSON.stringify(this.defaultSimTree)));

	activePanelId = signal<string>("2");
	private resizeState: {
		parentId: string;
		index: number;
		direction: "horizontal" | "vertical";
		startClient: number;
		containerSize: number;
		startA: number;
		startB: number;
	} | null = null;
	private nextId = 100;
	private getId() {
		return (this.nextId++).toString();
	}

	// Command Palette State
	paletteOpen = signal(false);
	paletteSearch = signal("");
	paletteSelectedIndex = signal(0);

	allCommands: Command[] = [
		{
			id: "ws-sim",
			label: "Workspace: Switch to Autonomous Rover",
			icon: "◱",
			action: () => this.switchWorkspace("ws-1"),
		},
		{
			id: "ws-ai",
			label: "Workspace: Switch to Kinematics & Control",
			icon: "◲",
			action: () => this.switchWorkspace("ws-2"),
		},
		{
			id: "split-h",
			label: "Layout: Split Panel Horizontally",
			icon: "◫",
			shortcut: "Ctrl+\\",
			action: () => this.splitPane(this.activePanelId(), "horizontal"),
		},
		{
			id: "split-v",
			label: "Layout: Split Panel Vertically",
			icon: "⊟",
			shortcut: "Ctrl+-",
			action: () => this.splitPane(this.activePanelId(), "vertical"),
		},
		{
			id: "close-pane",
			label: "Layout: Close Active Panel",
			icon: "✕",
			shortcut: "Ctrl+W",
			action: () => this.closePane(this.activePanelId()),
		},
		{
			id: "add-lidar",
			label: "Spawn: 360 LiDAR Array",
			icon: "⊕",
			action: () => this.completeStep("entities"),
		},
		{
			id: "add-cam",
			label: "Spawn: Depth Camera",
			icon: "⊕",
			action: () => this.completeStep("configure"),
		},
		{
			id: "run-blaster",
			label: "Pipeline: Run Image-Blaster on inputs/",
			icon: "⚡",
			shortcut: "Cmd+B",
			action: () => this.completeStep("run"),
		},
		{
			id: "epoch-reset",
			label: "Sim: Reset Training Epoch",
			icon: "↺",
			action: () => console.log("Mock: Resetting Sim"),
		},
		{
			id: "settings",
			label: "Preferences: Open Settings",
			icon: "⚙",
			shortcut: "Ctrl+,",
			action: () => console.log("Mock: Settings"),
		},
	];

	filteredCommands = computed(() => {
		const term = this.paletteSearch().toLowerCase();
		if (!term) return this.allCommands;
		return this.allCommands.filter((c) => c.label.toLowerCase().includes(term));
	});

	@HostListener("window:keydown", ["$event"])
	handleGlobalKeyboard(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			this.togglePalette();
		}
	}

	@HostListener("window:mousemove", ["$event"])
	handleGlobalMouseMove(event: MouseEvent) {
		if (!this.resizeState) return;

		const deltaPx =
			(this.resizeState.direction === "horizontal"
				? event.clientX
				: event.clientY) - this.resizeState.startClient;
		const deltaRatio = deltaPx / Math.max(1, this.resizeState.containerSize);
		const pairTotal = this.resizeState.startA + this.resizeState.startB;
		const minRatio = 0.2;

		const nextA = Math.max(
			minRatio,
			Math.min(pairTotal - minRatio, this.resizeState.startA + deltaRatio),
		);
		const nextB = pairTotal - nextA;

		const clone = JSON.parse(JSON.stringify(this.tree()));
		this.mutatePairRatios(
			clone,
			this.resizeState.parentId,
			this.resizeState.index,
			nextA,
			nextB,
		);
		this.tree.set(clone);
	}

	@HostListener("window:mouseup")
	handleGlobalMouseUp() {
		this.resizeState = null;
	}

	// --- Palette Methods ---
	togglePalette() {
		this.paletteOpen.set(!this.paletteOpen());
		if (this.paletteOpen()) {
			this.paletteSearch.set("");
			this.paletteSelectedIndex.set(0);
			setTimeout(() => this.paletteInputEl?.nativeElement.focus(), 50);
		}
	}

	closePalette() {
		this.paletteOpen.set(false);
	}

	updateSearch(event: Event) {
		this.paletteSearch.set((event.target as HTMLInputElement).value);
		this.paletteSelectedIndex.set(0);
	}

	setSelectedIndex(index: number) {
		this.paletteSelectedIndex.set(index);
	}

	handlePaletteKeydown(event: KeyboardEvent) {
		const listLength = this.filteredCommands().length;
		if (listLength === 0) return;

		if (event.key === "ArrowDown") {
			event.preventDefault();
			this.paletteSelectedIndex.set(
				(this.paletteSelectedIndex() + 1) % listLength,
			);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			this.paletteSelectedIndex.set(
				(this.paletteSelectedIndex() - 1 + listLength) % listLength,
			);
		} else if (event.key === "Enter") {
			event.preventDefault();
			this.executeCommand(this.filteredCommands()[this.paletteSelectedIndex()]);
		} else if (event.key === "Escape") {
			this.closePalette();
		}
	}

	executeCommand(cmd: Command) {
		cmd.action();
		this.closePalette();
	}

	createScene() {
		const newSceneId = `scene-${this.scenes().length + 1}`;
		const newScene: Scene = {
			id: newSceneId,
			name: `Scene ${this.scenes().length + 1}`,
			status: "draft",
		};
		this.scenes.update((prev) => [...prev, newScene]);
		this.activeSceneId.set(newSceneId);
		this.completeStep("scene");
	}

	switchScene(sceneId: string) {
		this.activeSceneId.set(sceneId);
	}

	onSceneChange(event: Event) {
		const sceneId = (event.target as HTMLSelectElement).value;
		this.switchScene(sceneId);
	}

	completeStep(stepId: CreationStep["id"]) {
		this.creationSteps.update((steps) =>
			steps.map((step) =>
				step.id === stepId ? { ...step, done: true } : step,
			),
		);
		this.navigateForStep(stepId);
		if (stepId === "run") {
			this.scenes.update((scenes) =>
				scenes.map((scene) =>
					scene.id === this.activeSceneId()
						? { ...scene, status: "running" }
						: scene,
				),
			);
		}
		if (stepId === "save") {
			this.scenes.update((scenes) =>
				scenes.map((scene) =>
					scene.id === this.activeSceneId()
						? { ...scene, status: "ready" }
						: scene,
				),
			);
		}
	}

	completeNextStep() {
		const next = this.nextPendingStep();
		if (next) this.completeStep(next.id);
	}

	private navigateForStep(stepId: CreationStep["id"]) {
		switch (stepId) {
			case "scene":
				this.focusPanelByType("scene_graph");
				break;
			case "entities":
				this.focusPanelByType("scene_graph");
				break;
			case "configure":
				this.focusPanelByType("properties");
				break;
			case "run":
				this.focusPanelByType("viewport");
				break;
			case "inspect":
				this.focusPanelByType("terminal");
				break;
			case "save":
				this.focusPanelByType("properties");
				break;
		}
	}

	// --- Workspace Methods ---
	switchWorkspace(id: string) {
		if (this.activeWorkspaceId() === id) return;

		this.workspaces.update((wsList) =>
			wsList.map((ws) =>
				ws.id === this.activeWorkspaceId()
					? { ...ws, tree: JSON.parse(JSON.stringify(this.tree())) }
					: ws,
			),
		);

		const newWs = this.workspaces().find((ws) => ws.id === id);
		if (newWs) {
			this.activeWorkspaceId.set(id);
			this.tree.set(JSON.parse(JSON.stringify(newWs.tree)));

			const firstLeaf = this.findFirstLeaf(newWs.tree);
			if (firstLeaf) this.setFocus(firstLeaf.id);
		}
	}

	private findFirstLeaf(node: TreeNode): LeafNode | null {
		if (node.type === "leaf") return node;
		if (node.children && node.children.length > 0)
			return this.findFirstLeaf(node.children[0]);
		return null;
	}

	// --- Layout Methods ---
	focusMe(event: MouseEvent, id: string) {
		event.stopPropagation();
		this.setFocus(id);
	}
	changeType(event: Event, id: string) {
		this.setType(id, (event.target as HTMLSelectElement).value as PanelType);
	}
	split(direction: "horizontal" | "vertical", event: MouseEvent, id: string) {
		event.stopPropagation();
		this.splitPane(id, direction);
	}
	close(event: MouseEvent, id: string) {
		event.stopPropagation();
		this.closePane(id);
	}
	beginResize(
		event: MouseEvent,
		parentId: string,
		index: number,
		direction: "horizontal" | "vertical",
	) {
		event.stopPropagation();
		event.preventDefault();

		const divider = event.currentTarget as HTMLElement;
		const container = divider.parentElement as HTMLElement | null;
		if (!container) return;

		const containerRect = container.getBoundingClientRect();
		const containerSize =
			direction === "horizontal" ? containerRect.width : containerRect.height;

		const parent = this.findSplitById(this.tree(), parentId);
		if (!parent) return;
		const a = parent.children[index];
		const b = parent.children[index + 1];
		if (!a || !b) return;

		this.resizeState = {
			parentId,
			index,
			direction,
			startClient: direction === "horizontal" ? event.clientX : event.clientY,
			containerSize,
			startA: a.ratio || 1,
			startB: b.ratio || 1,
		};
	}

	setFocus(id: string) {
		this.activePanelId.set(id);
		const clone = JSON.parse(JSON.stringify(this.tree()));
		this.applyFocus(clone, id);
		this.tree.set(clone);
	}

	private applyFocus(node: TreeNode, id: string) {
		if (node.type === "leaf") node.focused = node.id === id;
		else node.children.forEach((c) => this.applyFocus(c, id));
	}

	splitPane(targetId: string, direction: "horizontal" | "vertical") {
		const clone = JSON.parse(JSON.stringify(this.tree()));
		this.mutateSplit(clone, targetId, direction);
		this.tree.set(clone);
	}

	private mutateSplit(
		node: TreeNode,
		targetId: string,
		direction: "horizontal" | "vertical",
	) {
		if (node.id === targetId && node.type === "leaf") {
			const oldNode = JSON.parse(JSON.stringify(node));
			Object.keys(node).forEach((k) => delete (node as any)[k]);

			const newActiveId = this.getId();
			Object.assign(node, {
				id: this.getId(),
				type: "split",
				direction,
				ratio: oldNode.ratio || 1,
				children: [
					{ ...oldNode, focused: false, ratio: 1 },
					{
						id: newActiveId,
						type: "leaf",
						panelType: oldNode.panelType,
						focused: true,
						ratio: 1,
					},
				],
			});
			this.activePanelId.set(newActiveId);
			return;
		}
		if (node.type === "split")
			node.children.forEach((c) => this.mutateSplit(c, targetId, direction));
	}

	closePane(targetId: string) {
		if (
			this.tree().id === targetId ||
			(this.tree().type === "leaf" && this.tree().id === targetId)
		)
			return;
		const clone = JSON.parse(JSON.stringify(this.tree()));
		let focusedRemoved = false;
		this.mutateClose(
			clone,
			targetId,
			(wasFocused) => (focusedRemoved = wasFocused),
		);
		this.tree.set(clone);

		if (focusedRemoved) {
			this.setFocus("2");
		}
	}

	private mutateClose(
		node: TreeNode,
		targetId: string,
		onRemoved: (wasFocused: boolean) => void,
	) {
		if (node.type === "split") {
			const initialLength = node.children.length;

			const targetChild = node.children.find((c) => c.id === targetId);
			if (targetChild && targetChild.type === "leaf" && targetChild.focused) {
				onRemoved(true);
			}

			node.children = node.children.filter((c) => c.id !== targetId);
			if (node.children.length === 1 && initialLength > 1) {
				const survivor = node.children[0];
				const currentRatio = node.ratio;
				Object.keys(node).forEach((k) => delete (node as any)[k]);
				Object.assign(node, survivor);
				if (currentRatio) node.ratio = currentRatio;
				return;
			}
			node.children.forEach((c) => this.mutateClose(c, targetId, onRemoved));
		}
	}

	setType(targetId: string, newType: PanelType) {
		const clone = JSON.parse(JSON.stringify(this.tree()));
		this.mutateType(clone, targetId, newType);
		this.tree.set(clone);
	}
	private mutateType(node: TreeNode, targetId: string, newType: PanelType) {
		if (node.id === targetId && node.type === "leaf") node.panelType = newType;
		else if (node.type === "split")
			node.children.forEach((c) => this.mutateType(c, targetId, newType));
	}

	private focusPanelByType(panelType: PanelType) {
		const leaf = this.findLeafByPanelType(this.tree(), panelType);
		if (leaf) {
			this.setFocus(leaf.id);
		}
	}

	private findLeafByPanelType(
		node: TreeNode,
		panelType: PanelType,
	): LeafNode | null {
		if (node.type === "leaf") {
			return node.panelType === panelType ? node : null;
		}
		for (const child of node.children) {
			const found = this.findLeafByPanelType(child, panelType);
			if (found) return found;
		}
		return null;
	}

	private findSplitById(node: TreeNode, id: string): SplitNode | null {
		if (node.type === "split" && node.id === id) return node;
		if (node.type === "split") {
			for (const child of node.children) {
				const found = this.findSplitById(child, id);
				if (found) return found;
			}
		}
		return null;
	}

	private mutatePairRatios(
		node: TreeNode,
		parentId: string,
		index: number,
		ratioA: number,
		ratioB: number,
	) {
		if (node.type === "split" && node.id === parentId) {
			if (node.children[index]) node.children[index].ratio = ratioA;
			if (node.children[index + 1]) node.children[index + 1].ratio = ratioB;
			return;
		}
		if (node.type === "split") {
			node.children.forEach((c) =>
				this.mutatePairRatios(c, parentId, index, ratioA, ratioB),
			);
		}
	}
}
