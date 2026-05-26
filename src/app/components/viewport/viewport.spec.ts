import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { projectWorldToCanvas } from "./viewport.math";

describe("Viewport projection", () => {
	it("projects the camera target near canvas center", () => {
		const width = 1200;
		const height = 800;
		const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		camera.position.set(0, 0, 10);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld(true);

		const target = new THREE.Vector3(0, 0, 0);
		const projected = projectWorldToCanvas(target, camera, width, height);

		expect(projected.x).toBeCloseTo(width / 2, 1);
		expect(projected.y).toBeCloseTo(height / 2, 1);
	});
});
