import {
	Component,
	ElementRef,
	ViewChild,
	AfterViewInit,
	OnDestroy,
	OnChanges,
	SimpleChanges,
	Input,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import * as THREE from "three";
import CameraControls from "camera-controls";
import { projectWorldToCanvas } from "./viewport.math";

CameraControls.install({ THREE });

@Component({
	selector: "app-three-viewport",
	imports: [CommonModule],
	templateUrl: "./viewport.html",
	styleUrl: "./viewport.css",
})
export class Viewport implements AfterViewInit, OnDestroy, OnChanges {
	@Input() sceneId: string = "scene-1";

	@ViewChild("canvas", { static: true })
	canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChild("container", { static: true })
	containerRef!: ElementRef<HTMLDivElement>;

	private renderer!: THREE.WebGLRenderer;
	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private cameraControls!: CameraControls;
	private resizeObserver!: ResizeObserver;
	private animationFrameId!: number;
	private clock = new THREE.Clock();
	private lastWidth = 0;
	private lastHeight = 0;
	private lastDpr = 0;

	// Rover Assets
	private roverGroup!: THREE.Group;
	private lidarPuck!: THREE.Mesh;

	// Arm Assets
	private armGroup!: THREE.Group;
	private shoulder!: THREE.Group;
	private elbow!: THREE.Group;
	private wrist!: THREE.Group;
	private carbuncleGroup!: THREE.Group;

	private time = 0;
	private readonly minCameraRadius = 2;
	private readonly maxCameraRadius = 30;
	private readonly defaultCameraRadius = 8;
	private readonly defaultCameraPosition = new THREE.Vector3(6, 4, 6);
	private readonly defaultCameraTarget = new THREE.Vector3(0, 0.8, 0);
	cursorClass = "cursor-grab";
	zoomPercent = 100;
	layoutLocation = "x:0 y:0";
	containerSizeLabel = "0x0";
	canvasCssSizeLabel = "0x0";
	renderBufferSizeLabel = "0x0";
	dprLabel = "1.00";
	targetScreenLabel = "0,0";
	centerErrorLabel = "0,0";

	ngAfterViewInit() {
		this.initThreeJS();
		this.setupResizeObserver();
		this.animate();
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes["sceneId"] && this.scene) {
			this.updateSceneVisibility();
		}
	}

	private updateSceneVisibility() {
		if (this.roverGroup) this.roverGroup.visible = this.sceneId === "scene-1";
		if (this.armGroup) this.armGroup.visible = this.sceneId === "scene-2";
		if (this.carbuncleGroup)
			this.carbuncleGroup.visible = this.sceneId === "scene-3";
	}

	ngOnDestroy() {
		cancelAnimationFrame(this.animationFrameId);
		if (this.resizeObserver) this.resizeObserver.disconnect();
		window.removeEventListener("resize", this.handleWindowResize);
		if (this.cameraControls) this.cameraControls.dispose();
		if (this.renderer) this.renderer.dispose();
	}

	private initThreeJS() {
		const canvas = this.canvasRef.nativeElement;

		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false,
		});
		this.renderer.domElement.style.width = "100%";
		this.renderer.domElement.style.height = "100%";
		this.renderer.domElement.style.display = "block";
		this.updateViewportSize();
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#24242a");
		this.scene.fog = new THREE.FogExp2("#24242a", 0.04);

		this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
		this.updateViewportSize();
		this.camera.position.copy(this.defaultCameraPosition);
		this.camera.lookAt(this.defaultCameraTarget);

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 2);
		dirLight.position.set(5, 10, 7);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 1024;
		dirLight.shadow.mapSize.height = 1024;
		this.scene.add(dirLight);

		const fillLight = new THREE.DirectionalLight(0x4488ff, 1);
		fillLight.position.set(-5, 3, -5);
		this.scene.add(fillLight);

		const grid = new THREE.GridHelper(20, 20, 0x4a4a5a, 0x2c2c36);
		grid.position.y = -0.01;
		this.scene.add(grid);

		this.buildRover();
		this.buildRobotArm();
		this.buildCarbunclePlaceholder();
		this.updateSceneVisibility();

		this.cameraControls = new CameraControls(this.camera, canvas);
		this.cameraControls.minDistance = this.minCameraRadius;
		this.cameraControls.maxDistance = this.maxCameraRadius;
		this.cameraControls.dampingFactor = 0.08;
		this.cameraControls.smoothTime = 0.08;
		// Hybrid power-user bindings:
		// - LMB/MMB: orbit
		// - RMB: pan (truck)
		// - Wheel: dolly
		this.cameraControls.mouseButtons.left = CameraControls.ACTION.ROTATE;
		this.cameraControls.mouseButtons.middle = CameraControls.ACTION.ROTATE;
		this.cameraControls.mouseButtons.right = CameraControls.ACTION.TRUCK;
		this.cameraControls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
		this.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
		this.cameraControls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;
		this.cameraControls.setLookAt(
			this.defaultCameraPosition.x,
			this.defaultCameraPosition.y,
			this.defaultCameraPosition.z,
			this.defaultCameraTarget.x,
			this.defaultCameraTarget.y,
			this.defaultCameraTarget.z,
			false,
		);

		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	}

	zoomIn() {
		if (!this.cameraControls) return;
		const next = Math.max(
			this.minCameraRadius,
			this.cameraControls.distance * 0.86,
		);
		this.cameraControls.dollyTo(next, true);
	}

	zoomOut() {
		if (!this.cameraControls) return;
		const next = Math.min(
			this.maxCameraRadius,
			this.cameraControls.distance * 1.14,
		);
		this.cameraControls.dollyTo(next, true);
	}

	resetView() {
		if (!this.cameraControls) return;
		this.cameraControls.setLookAt(
			this.defaultCameraPosition.x,
			this.defaultCameraPosition.y,
			this.defaultCameraPosition.z,
			this.defaultCameraTarget.x,
			this.defaultCameraTarget.y,
			this.defaultCameraTarget.z,
			true,
		);
	}

	private buildRover() {
		this.roverGroup = new THREE.Group();

		const orangeMat = new THREE.MeshStandardMaterial({
			color: 0xff6600,
			roughness: 0.2,
			metalness: 0.1,
		});
		const slateMat = new THREE.MeshStandardMaterial({
			color: 0x8a8a98,
			roughness: 0.1,
			metalness: 0.2,
		});
		const darkMat = new THREE.MeshStandardMaterial({
			color: 0x1f1f26,
			roughness: 0.8,
			metalness: 0.5,
		});
		const glowMat = new THREE.MeshStandardMaterial({
			color: 0x00aaff,
			emissive: 0x00aaff,
			emissiveIntensity: 2,
		});

		const chassisGeo = new THREE.BoxGeometry(1.4, 0.6, 2);
		const chassis = new THREE.Mesh(chassisGeo, slateMat);
		chassis.position.y = 0.5;
		chassis.castShadow = true;
		chassis.receiveShadow = true;
		this.roverGroup.add(chassis);

		const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
		const positions = [
			[-0.8, 0.3, 0.7],
			[0.8, 0.3, 0.7],
			[-0.8, 0.3, -0.7],
			[0.8, 0.3, -0.7],
		];
		positions.forEach((pos) => {
			const wheel = new THREE.Mesh(wheelGeo, darkMat);
			wheel.rotation.z = Math.PI / 2;
			wheel.position.set(pos[0], pos[1], pos[2]);
			wheel.castShadow = true;
			this.roverGroup.add(wheel);
		});

		const coreGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
		const core = new THREE.Mesh(coreGeo, orangeMat);
		core.position.set(0, 1.2, 0);
		core.castShadow = true;
		this.roverGroup.add(core);

		const headGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
		const head = new THREE.Mesh(headGeo, slateMat);
		head.position.set(0, 1.8, 0.2);
		head.castShadow = true;
		this.roverGroup.add(head);

		const eyeGeo = new THREE.BoxGeometry(0.1, 0.05, 0.05);
		const eyeL = new THREE.Mesh(eyeGeo, glowMat);
		eyeL.position.set(-0.15, 1.85, 0.51);
		const eyeR = new THREE.Mesh(eyeGeo, glowMat);
		eyeR.position.set(0.15, 1.85, 0.51);
		this.roverGroup.add(eyeL, eyeR);

		const lidarGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16);
		this.lidarPuck = new THREE.Mesh(lidarGeo, darkMat);
		this.lidarPuck.position.set(0, 2.1, 0.2);

		const lensGeo = new THREE.BoxGeometry(0.1, 0.1, 0.16);
		const lens = new THREE.Mesh(lensGeo, glowMat);
		lens.position.set(0, 0, 0.1);
		this.lidarPuck.add(lens);

		this.roverGroup.add(this.lidarPuck);
		this.scene.add(this.roverGroup);
	}

	private buildRobotArm() {
		this.armGroup = new THREE.Group();

		const orangeMat = new THREE.MeshStandardMaterial({
			color: 0xff6600,
			roughness: 0.2,
			metalness: 0.1,
		});
		const slateMat = new THREE.MeshStandardMaterial({
			color: 0x8a8a98,
			roughness: 0.1,
			metalness: 0.2,
		});
		const darkMat = new THREE.MeshStandardMaterial({
			color: 0x1f1f26,
			roughness: 0.8,
			metalness: 0.5,
		});
		const glowMat = new THREE.MeshStandardMaterial({
			color: 0x00aaff,
			emissive: 0x00aaff,
			emissiveIntensity: 2,
		});

		const baseGeo = new THREE.CylinderGeometry(1, 1, 0.4, 32);
		const baseMesh = new THREE.Mesh(baseGeo, darkMat);
		baseMesh.position.y = 0.2;
		baseMesh.castShadow = true;
		baseMesh.receiveShadow = true;
		this.armGroup.add(baseMesh);

		this.shoulder = new THREE.Group();
		this.shoulder.position.y = 0.4;

		const shoulderMotor = new THREE.Mesh(
			new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16),
			orangeMat,
		);
		shoulderMotor.rotation.x = Math.PI / 2;
		shoulderMotor.castShadow = true;
		this.shoulder.add(shoulderMotor);

		const upperArm = new THREE.Mesh(
			new THREE.BoxGeometry(0.4, 2.5, 0.4),
			slateMat,
		);
		upperArm.position.y = 1.25;
		upperArm.castShadow = true;
		this.shoulder.add(upperArm);

		this.armGroup.add(this.shoulder);

		this.elbow = new THREE.Group();
		this.elbow.position.y = 2.5;

		const elbowMotor = new THREE.Mesh(
			new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16),
			darkMat,
		);
		elbowMotor.rotation.z = Math.PI / 2;
		elbowMotor.castShadow = true;
		this.elbow.add(elbowMotor);

		const lowerArm = new THREE.Mesh(
			new THREE.BoxGeometry(0.3, 2, 0.3),
			slateMat,
		);
		lowerArm.position.y = 1;
		lowerArm.castShadow = true;
		this.elbow.add(lowerArm);

		this.shoulder.add(this.elbow);

		this.wrist = new THREE.Group();
		this.wrist.position.y = 2;

		const wristMotor = new THREE.Mesh(
			new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16),
			orangeMat,
		);
		wristMotor.castShadow = true;
		this.wrist.add(wristMotor);

		const gripperBase = new THREE.Mesh(
			new THREE.BoxGeometry(0.6, 0.2, 0.2),
			slateMat,
		);
		gripperBase.position.y = 0.3;
		gripperBase.castShadow = true;
		this.wrist.add(gripperBase);

		const clawGeo = new THREE.BoxGeometry(0.05, 0.6, 0.1);
		const leftClaw = new THREE.Mesh(clawGeo, glowMat);
		leftClaw.position.set(-0.25, 0.6, 0);
		this.wrist.add(leftClaw);

		const rightClaw = new THREE.Mesh(clawGeo, glowMat);
		rightClaw.position.set(0.25, 0.6, 0);
		this.wrist.add(rightClaw);

		this.elbow.add(this.wrist);
		this.scene.add(this.armGroup);
	}

	private buildCarbunclePlaceholder() {
		this.carbuncleGroup = new THREE.Group();

		const bodyMat = new THREE.MeshStandardMaterial({
			color: 0x6d7ff0,
			roughness: 0.25,
			metalness: 0.05,
		});
		const earMat = new THREE.MeshStandardMaterial({
			color: 0x9ea7ff,
			roughness: 0.2,
			metalness: 0.03,
		});
		const eyeMat = new THREE.MeshStandardMaterial({
			color: 0x66eeff,
			emissive: 0x44ccff,
			emissiveIntensity: 0.9,
		});

		const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24), bodyMat);
		body.position.y = 1;
		this.carbuncleGroup.add(body);

		const earL = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 18), earMat);
		earL.position.set(-0.36, 1.85, -0.05);
		earL.rotation.z = 0.28;
		this.carbuncleGroup.add(earL);

		const earR = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 18), earMat);
		earR.position.set(0.36, 1.85, -0.05);
		earR.rotation.z = -0.28;
		this.carbuncleGroup.add(earR);

		const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
		eyeL.position.set(-0.2, 1.05, 0.82);
		this.carbuncleGroup.add(eyeL);

		const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
		eyeR.position.set(0.2, 1.05, 0.82);
		this.carbuncleGroup.add(eyeR);

		this.scene.add(this.carbuncleGroup);
	}

	private setupResizeObserver() {
		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					this.updateViewportSize(true);
				}
			}
		});
		this.resizeObserver.observe(this.containerRef.nativeElement);
		window.addEventListener("resize", this.handleWindowResize, {
			passive: true,
		});
	}

	private handleWindowResize = () => {
		this.updateViewportSize(true);
	};

	private updateViewportSize(force = false) {
		if (!this.renderer || !this.camera) return;

		const rect = this.containerRef.nativeElement.getBoundingClientRect();
		const width = Math.max(1, Math.round(rect.width));
		const height = Math.max(1, Math.round(rect.height));
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		if (
			!force &&
			width === this.lastWidth &&
			height === this.lastHeight &&
			dpr === this.lastDpr
		) {
			return;
		}

		this.lastWidth = width;
		this.lastHeight = height;
		this.lastDpr = dpr;

		const canvas = this.canvasRef.nativeElement;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		canvas.style.left = "0";
		canvas.style.top = "0";
		canvas.style.position = "absolute";

		this.renderer.setPixelRatio(dpr);
		// Keep CSS size owned by layout; only update drawing buffer dimensions.
		this.renderer.setSize(width, height, false);
		this.renderer.setViewport(0, 0, width, height);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.updateViewportDiagnostics(rect, dpr);
	}

	private updateViewportDiagnostics(rect: DOMRect, dpr: number) {
		const canvas = this.canvasRef.nativeElement;
		this.layoutLocation = `x:${Math.round(rect.left)} y:${Math.round(rect.top)}`;
		this.containerSizeLabel = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
		this.canvasCssSizeLabel = `${canvas.clientWidth}x${canvas.clientHeight}`;
		this.renderBufferSizeLabel = `${canvas.width}x${canvas.height}`;
		this.dprLabel = dpr.toFixed(2);
	}

	private animate = () => {
		this.animationFrameId = requestAnimationFrame(this.animate);
		this.updateViewportSize();
		const delta = this.clock.getDelta();
		if (this.cameraControls) {
			this.cameraControls.update(delta);
		}

		// Animate Rover if visible
		if (this.roverGroup?.visible && this.lidarPuck) {
			this.lidarPuck.rotation.y -= 0.1;
		}

		// Animate Arm if visible
		if (this.armGroup?.visible) {
			this.time += 0.02;
			if (this.shoulder) {
				this.shoulder.rotation.y = Math.sin(this.time * 0.5) * (Math.PI / 2);
				this.shoulder.rotation.z = Math.sin(this.time * 0.8) * 0.5;
			}
			if (this.elbow) {
				this.elbow.rotation.x =
					(Math.abs(Math.sin(this.time)) * -Math.PI) / 1.5;
			}
			if (this.wrist) {
				this.wrist.rotation.y = this.time * 2;
			}
		}

		if (this.cameraControls) {
			this.zoomPercent = Math.round(
				(this.defaultCameraRadius / this.cameraControls.distance) * 100,
			);
		}
		this.updateCenteringDiagnostics();
		this.renderer.render(this.scene, this.camera);
	};

	private updateCenteringDiagnostics() {
		const canvas = this.canvasRef.nativeElement;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width <= 0 || height <= 0) return;
		this.camera.updateMatrixWorld(true);

		const projected = projectWorldToCanvas(
			new THREE.Vector3(0, 0.8, 0),
			this.camera,
			width,
			height,
		);
		if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
			this.targetScreenLabel = "invalid";
			this.centerErrorLabel = "invalid";
			return;
		}
		const centerX = width / 2;
		const centerY = height / 2;
		const deltaX = projected.x - centerX;
		const deltaY = projected.y - centerY;

		this.targetScreenLabel = `${Math.round(projected.x)},${Math.round(projected.y)}`;
		this.centerErrorLabel = `${Math.round(deltaX)},${Math.round(deltaY)}`;
	}
}
