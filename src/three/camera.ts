import * as THREE from "three";
import { Mesh, Vector2 } from "three";

import { world } from "./world";

const mouse = new THREE.Vector2();

type WindowSizes = {
	width: number;
	height: number;
};
export const sizes: WindowSizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

const aspectRatio = (s: WindowSizes) => s.width / s.height;
console.log("Aspect ratio:", aspectRatio);

const frustumDelta = 100;
export const cameraPositionISO = 1000;
export const camera = new THREE.OrthographicCamera(-frustumDelta * aspectRatio(sizes), frustumDelta * aspectRatio(sizes), frustumDelta / 2, -frustumDelta, 0.000001, 1000);
camera.scale.set(0.7, 0.7, 0.7);
camera.updateProjectionMatrix();
camera.position.x = 180;
camera.position.y = 180;
camera.position.z = 180;

export const onResizeCamera = () => {
	camera.left = -frustumDelta * aspectRatio(sizes);
	camera.right = frustumDelta * aspectRatio(sizes);
	camera.top = frustumDelta;
	camera.bottom = -frustumDelta;
	camera.updateProjectionMatrix();
};

export const referencePlane = new THREE.Mesh(
	new THREE.PlaneGeometry(1000, 1000),
	new THREE.MeshBasicMaterial({ color: 0x5555ff, side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false })
);
referencePlane.rotation.x = Math.PI / 2;
referencePlane.position.z = -0.1;
referencePlane.position.y = -1;

const initalAngle = (Math.PI / 4) * 3;
let currentAngle = initalAngle;

export const getBlock = () => {
	const raycaster = new THREE.Raycaster();
	raycaster.setFromCamera(new Vector2(0, 0), camera);
	const intersect = raycaster.intersectObject(referencePlane).pop();
	console.log(intersect);
};

export const rotateCamera = (rotation = 0) => {
	// console.log('roatate camera', rotation)
};

const raycaster = new THREE.Raycaster();

document.addEventListener("mousemove", (event) => {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
document.addEventListener("click", (event) => {
	raycaster.setFromCamera(mouse, camera);
	const isIntersected = raycaster.intersectObject(world);

	const intersection = isIntersected.find(({ object }) => object instanceof Mesh);
	if (intersection) {
		const { object } = intersection;
		const mesh = object as Mesh;
		mesh.material = new THREE.MeshStandardMaterial({ color: "#24802A" });
	}
});
