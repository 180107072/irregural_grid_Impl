import * as THREE from "three";

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 512; // default
pointLight.shadow.mapSize.height = 512; // default
pointLight.shadow.camera.near = 10; // default
pointLight.shadow.camera.far = 100; // default
// pointLight.shadow.bias =  -0.01;
// pointLight.shadow.radius = 20;
pointLight.position.x = -2;
pointLight.position.y = 3;
pointLight.position.z = 4;

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
// directionalLight.position.set(4, 4, 2);
directionalLight.position.set(-3, 4, 2);
directionalLight.castShadow = false;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.bias = -0.000004;
directionalLight.shadow.normalBias = 0.01;
// pointLight.shadow.radius = 10;

export const lights = [ambientLight, directionalLight];
