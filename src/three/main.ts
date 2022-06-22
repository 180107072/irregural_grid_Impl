import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { camera, onResizeCamera, sizes } from "./camera";
import { lights } from "./lights";

import "./style.css";
import { world } from "./world";

const scene = new THREE.Scene();

scene.add(world);

scene.add(...lights);

scene.add(camera);

// const axesHelper = new THREE.AxesHelper(2);
// scene.add(axesHelper);

const canvas = document.querySelector("canvas.webgl") as HTMLElement;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 100;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;
controls.update();

const clock = new THREE.Clock();

window.addEventListener("resize", () => {
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	onResizeCamera();

	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

renderer.setAnimationLoop(() => {
	const elapsedTime = clock.getElapsedTime();
	camera.updateProjectionMatrix();

	controls.update();

	renderer.render(scene, camera);
});
