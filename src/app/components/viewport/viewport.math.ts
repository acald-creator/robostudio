import * as THREE from "three";

export function projectWorldToCanvas(
	point: THREE.Vector3,
	camera: THREE.PerspectiveCamera,
	width: number,
	height: number,
) {
	camera.updateProjectionMatrix();
	camera.updateMatrixWorld(true);

	const worldToCamera = new THREE.Matrix4();
	const cameraWorld = camera.matrixWorld;
	const matrixAny = worldToCamera as unknown as {
		copy: (m: THREE.Matrix4) => unknown;
		invert?: () => unknown;
		getInverse?: (m: THREE.Matrix4) => unknown;
	};
	matrixAny.copy(cameraWorld);
	if (matrixAny.invert) {
		matrixAny.invert();
	} else if (matrixAny.getInverse) {
		matrixAny.getInverse(cameraWorld);
	}

	const ndc = point
		.clone()
		.applyMatrix4(worldToCamera)
		.applyMatrix4(camera.projectionMatrix);

	return {
		x: (ndc.x + 1) * 0.5 * width,
		y: (1 - ndc.y) * 0.5 * height,
	};
}
