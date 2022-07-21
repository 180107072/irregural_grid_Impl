import { Group, Mesh } from "three";

export interface ShapePoints extends Mesh {
	points: Array<any>;
}
export type Callback = () => void;
export function generate_grid(world: Group, cb: Callback): void;
