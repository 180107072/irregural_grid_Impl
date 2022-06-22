import * as THREE from "three";
import { generate_grid } from "./scripts/generate_grid.js";
import GridDispatcher from "../common/storage/grid";

export const world = new THREE.Group();

generate_grid(world, () => GridDispatcher.loaded());
