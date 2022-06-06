let svg = null;
window.onload = function () {
	svg = document.getElementById("organic_grid_svg");
	generate_grid();

	document.getElementById("btn-clear").onclick = function () {
		const path2delete = document.getElementsByClassName("overlay-path");
		const n = path2delete.length;
		for (const path of path2delete) {
			path.parentNode.removeChild(path);
		}
	};

	document.getElementById("btn-regenerate").onclick = () => regenerate_grid();
};

function regenerate_grid(...args) {
	const n = svg.children.length;
	let j = 0;

	for (let i = 0; i < n; i++) {
		if (svg.children[j].tagName == "rect") {
			j += 1;
		} else svg?.removeChild(svg.children[j]);
	}

	generate_grid(...args);
}

// TODO: GUI
function generate_grid(cell_size = 0.1) {
	let blue_noise = poisson_disk_sampling(cell_size, 55);

	const d_triangles = Delaunator.from(blue_noise).triangles;
	const triangles = [];
	for (let i = 0; i < d_triangles.length; i += 3) {
		triangles.push([d_triangles[i], d_triangles[i + 1], d_triangles[i + 2]]);
	}

	const MAX_ANGLE = (Math.PI / 2) * 1.65;
	let i = 0;
	while (i < triangles.length) {
		const t = triangles[i];
		const dists = [dist(...blue_noise[t[0]], ...blue_noise[t[1]]), dist(...blue_noise[t[1]], ...blue_noise[t[2]]), dist(...blue_noise[t[2]], ...blue_noise[t[0]])];
		dists.sort((a, b) => a - b);
		const c = dists.pop();
		const b = dists.pop();
		const a = dists.pop();
		if (Math.acos((a ** 2 + b ** 2 - c ** 2) / (2 * a * b)) >= MAX_ANGLE) {
			triangles.splice(i, 1);
		} else {
			i++;
		}
	}

	const prequads = [];

	function legit_prequad(candidate_prequad) {
		const cross_products = [];
		const dot_products = [];
		for (let i = 0; i < 4; i++) {
			const p_prev = nj.array(blue_noise[candidate_prequad[(i - 1 + 4) % 4]]);
			const p_curr = nj.array(blue_noise[candidate_prequad[i]]);
			const p_next = nj.array(blue_noise[candidate_prequad[(i + 1) % 4]]);
			const d1 = p_curr.subtract(p_prev);
			const d2 = p_next.subtract(p_curr);
			cross_products.push(d1.get(0) * d2.get(1) - d1.get(1) * d2.get(0));
			dot_products.push(d1.multiply(d2).sum() / (dist(0, 0, ...d1.tolist()) * dist(0, 0, ...d2.tolist())));
		}

		return new Set(cross_products.map(Math.sign)).size == 1 && nj.arccos(dot_products).max() <= Math.PI * 0.9 && nj.arccos(dot_products).min() >= Math.PI * 0.2;
	}

	const tabu_edges = new Set();
	while (triangles.length > 1) {
		const edge_counts = {};
		for (let i = 0; i < triangles.length; i++) {
			const t = triangles[i];
			const triangle_edges = [
				[t[0], t[1]],
				[t[1], t[2]],
				[t[2], t[0]],
			];
			for (let j = 0; j < triangle_edges.length; j++) {
				const min_v = Math.min(...triangle_edges[j]);
				const max_v = Math.max(...triangle_edges[j]);
				const edge_desc = min_v.toString() + "-" + max_v.toString();
				if (!tabu_edges.has(edge_desc)) {
					if (!(edge_desc in edge_counts)) {
						edge_counts[edge_desc] = 0;
					}

					edge_counts[edge_desc] += 1;
				}
			}
		}

		const candidate_edges = [];
		const edge_keys = Object.keys(edge_counts);
		for (let i = 0; i < edge_keys.length; i++) {
			if (edge_counts[edge_keys[i]] > 1) {
				candidate_edges.push(edge_keys[i].split("-").map((x) => parseInt(x)));
			}
		}

		if (candidate_edges.length == 0) break;

		while (candidate_edges.length > 0) {
			const candidate_index = Math.floor(Math.random() * candidate_edges.length);
			const candidate_edge = candidate_edges.splice(candidate_index, 1)[0];
			const merge_triangles = [];
			const merge_triangle_indices = [];
			const unique_vertices = [];
			for (let i = 0; i < triangles.length; i++) {
				if (triangles[i].indexOf(candidate_edge[0]) >= 0 && triangles[i].indexOf(candidate_edge[1]) >= 0) {
					merge_triangles.push(triangles[i]);
					merge_triangle_indices.push(i);
					for (let j = 0; j < triangles[i].length; j++) {
						if (candidate_edge.indexOf(triangles[i][j]) < 0) {
							unique_vertices.push(triangles[i][j]);
						}
					}
				}
			}

			const candidate_quad = [candidate_edge[0], unique_vertices[0], candidate_edge[1], unique_vertices[1]];

			if (legit_prequad(candidate_quad)) {
				prequads.push(candidate_quad);
				triangles.splice(merge_triangle_indices[1], 1);
				triangles.splice(merge_triangle_indices[0], 1);

				break;
			} else {
				tabu_edges.add(candidate_edge[0].toString() + "-" + candidate_edge[1].toString());
			}
		}
	}

	const midpoints = {};
	const midpoints_index = {};
	const quads = [];
	for (let i = 0; i < triangles.length; i++) {
		const t = triangles[i];
		const center = mean_on_axis0(nj.array(fancy_index(blue_noise, t)));
		const center_index = blue_noise.length;
		blue_noise.push(center.tolist());
		const t_edges = [
			[t[0], t[1]],
			[t[1], t[2]],
			[t[2], t[0]],
		];

		for (let j = 0; j < t_edges.length; j++) {
			const edge_key = make_edge_key(t_edges[j]);
			if (!(edge_key in midpoints)) {
				midpoints[edge_key] = mean_on_axis0(nj.array(fancy_index(blue_noise, t_edges[j])));
				midpoints_index[edge_key] = blue_noise.length;
				blue_noise.push(midpoints[edge_key].tolist());
			}
		}

		for (let j = 0; j < t_edges.length; j++) {
			const e1 = t_edges[j];
			const e2 = t_edges[(j + 1) % t_edges.length];
			const e1_key = make_edge_key(e1);
			const e2_key = make_edge_key(e2);
			const e1_midpoint_index = midpoints_index[e1_key];
			const e2_midpoint_index = midpoints_index[e2_key];
			let common_vertex = e1[0];
			if (e2.indexOf(common_vertex) == -1) {
				common_vertex = e1[1];
			}

			quads.push([common_vertex, e1_midpoint_index, center_index, e2_midpoint_index]);
		}
	}

	for (let i = 0; i < prequads.length; i++) {
		const pq = prequads[i];
		const center = mean_on_axis0(nj.array(fancy_index(blue_noise, pq)));
		const center_index = blue_noise.length;
		blue_noise.push(center.tolist());
		const pq_edges = [
			[pq[0], pq[1]],
			[pq[1], pq[2]],
			[pq[2], pq[3]],
			[pq[3], pq[0]],
		];

		for (let j = 0; j < pq_edges.length; j++) {
			const edge_key = make_edge_key(pq_edges[j]);
			if (!(edge_key in midpoints)) {
				midpoints[edge_key] = mean_on_axis0(nj.array(fancy_index(blue_noise, pq_edges[j])));
				midpoints_index[edge_key] = blue_noise.length;
				blue_noise.push(midpoints[edge_key].tolist());
			}
		}

		for (let j = 0; j < pq_edges.length; j++) {
			const e1 = pq_edges[j];
			const e2 = pq_edges[(j + 1) % pq_edges.length];
			const e1_key = make_edge_key(e1);
			const e2_key = make_edge_key(e2);
			const e1_midpoint_index = midpoints_index[e1_key];
			const e2_midpoint_index = midpoints_index[e2_key];
			let common_vertex = e1[0];
			if (e2.indexOf(common_vertex) == -1) {
				common_vertex = e1[1];
			}

			quads.push([common_vertex, e1_midpoint_index, center_index, e2_midpoint_index]);
		}
	}

	for (let i = 0; i < quads.length; i++) {
		const p0 = nj.array(blue_noise[quads[i][0]]);
		const p1 = nj.array(blue_noise[quads[i][1]]);
		const p2 = nj.array(blue_noise[quads[i][2]]);
		const d1 = p1.subtract(p0);
		const d2 = p2.subtract(p1);
		if (d1.get(0) * d2.get(1) - d1.get(1) * d2.get(0) > 0) {
			quads[i].reverse();
		}
	}

	blue_noise = nj.array(blue_noise);

	const SIDE_LENGTH = 0.05;
	const r = SIDE_LENGTH / Math.sqrt(2);
	const PULL_RATE = 0.3;
	let n_iters = 50;
	let lines2del = [];
	let forces = nj.zeros(blue_noise.shape);

	function post_loop() {
		blue_noise = blue_noise.multiply(150).subtract(25).tolist();

		const added_lines = new Set();
		for (let i = 0; i < quads.length; i++) {
			for (let j = 0; j < 4; j++) {
				const line_p1 = quads[i][j];
				const line_p2 = quads[i][(j + 1) % 4];
				const line_key = make_edge_key([line_p1, line_p2]);
				if (!added_lines.has(line_key)) {
					add_line(blue_noise[line_p1][0], blue_noise[line_p1][1], blue_noise[line_p2][0], blue_noise[line_p2][1]);
					added_lines.add(line_key);
				}
			}
		}

		let curr_color = "color-1";
		let mouse_down = false;
		const centers_temp = [];

		for (let i = 0; i < blue_noise.length; i++) {
			vertex_quads = [];
			for (let j = 0; j < quads.length; j++) {
				if (quads[j].indexOf(i) >= 0) {
					vertex_quads.push(quads[j]);
				}
			}

			if (vertex_quads.length < 3) continue;

			let centers = vertex_quads
				.map((q) => fancy_index(blue_noise, q))
				.map(nj.array)
				.map(mean_on_axis0);
			const vertex = nj.array(blue_noise[i]);
			centers.sort(function (p1, p2) {
				const d1 = p1.subtract(vertex);
				const d2 = p2.subtract(vertex);
				return Math.atan2(d1.get(1), d1.get(0)) - Math.atan2(d2.get(1), d2.get(0));
			});

			centers = centers.map((x) => x.tolist());

			const polygon = add_path(centers);

			polygon.data = centers;
			polygon.add = function () {
				const centers = this.data;
				const new_elem = add_path(centers, curr_color, centers_temp);
				new_elem.onmouseup = function () {
					mouse_down = false;
				};
			};
			polygon.onmousedown = function () {
				centers_temp.push(this.data);
				this.add();
				mouse_down = true;
			};

			polygon.onmouseup = function () {
				mouse_down = false;
			};

			polygon.onmouseenter = function () {
				if (mouse_down) {
					this.add();
				}
			};
		}

		svg.onmouseleave = function () {
			mouse_down = false;
		};

		const color_buttons = document.getElementsByClassName("color-button");
		for (let i = 0; i < color_buttons.length; i++) {
			color_buttons[i].onclick = function () {
				curr_color = this.classList[1];
			};
		}
	}
	let counter = 0;

	function loop_iter() {
		forces = forces.multiply(0);
		for (let j = 0; j < quads.length; j++) {
			const quad = quads[j];
			let temp_xy = [];
			for (let k = 0; k < quad.length; k++) {
				temp_xy.push(blue_noise.pick(quad[k]));
			}

			temp_xy = nj.stack(temp_xy);
			temp_xy = temp_xy.subtract(repeat(mean_on_axis0(temp_xy), temp_xy.shape[0]));
			let denom = temp_xy.get(0, 0) - temp_xy.get(1, 1) - temp_xy.get(2, 0) + temp_xy.get(3, 1);
			const d_sign = Math.sign(denom);
			if (d_sign == 0) d_sign = 1;

			denom = d_sign * Math.max(1e-10, Math.abs(denom));
			const numerator = temp_xy.get(0, 1) + temp_xy.get(1, 0) - temp_xy.get(2, 1) - temp_xy.get(3, 0);

			let alpha = Math.atan(numerator / denom);

			if (Math.cos(alpha) * denom + Math.sin(alpha) * numerator < 0) {
				alpha += Math.PI;
			}

			const cosalpha = Math.cos(alpha);
			const sinalpha = Math.sin(alpha);

			const xyt = nj.array([
				[r * cosalpha, r * sinalpha],
				[r * sinalpha, -r * cosalpha],
				[-r * cosalpha, -r * sinalpha],
				[-r * sinalpha, r * cosalpha],
			]);

			const diff = xyt.subtract(temp_xy);

			for (let k = 0; k < diff.shape[0]; k++) {
				forces.pick(quad[k]).assign(forces.pick(quad[k]).add(diff.pick(k)), false);
			}
		}

		blue_noise = blue_noise.add(forces.multiply(PULL_RATE));
		const temp_blue_noise = blue_noise.multiply(150).subtract(25).tolist();

		for (let j = 0; j < lines2del.length; j++) {
			lines2del[j].parentNode.removeChild(lines2del[j]);
		}

		lines2del = [];

		const added_lines = new Set();
		for (let j = 0; j < quads.length; j++) {
			for (let k = 0; k < 4; k++) {
				const line_p1 = quads[j][k];
				const line_p2 = quads[j][(k + 1) % 4];
				const line_key = make_edge_key([line_p1, line_p2]);
				if (!added_lines.has(line_key)) {
					lines2del.push(
						add_line(temp_blue_noise[line_p1][0], temp_blue_noise[line_p1][1], temp_blue_noise[line_p2][0], temp_blue_noise[line_p2][1], "temp-line")
					);
					added_lines.add(line_key);
				}
			}
		}
		if (n_iters > 0) {
			counter++;
			n_iters -= 1;
			console.log(counter);
			requestAnimationFrame(loop_iter);
		} else {
			for (let j = 0; j < lines2del.length; j++) {
				lines2del[j].parentNode.removeChild(lines2del[j]);
			}
			requestAnimationFrame(post_loop);
		}
	}

	requestAnimationFrame(loop_iter);
}

function fancy_index(a, idx) {
	const res = [];
	for (let i = 0; i < idx.length; i++) {
		res.push(a[idx[i]]);
	}

	return res;
}

function add_circle(x, y) {
	const newElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	newElement.setAttribute("cx", x);
	newElement.setAttribute("cy", y);
	svg.appendChild(newElement);
}

function add_line(x1, y1, x2, y2, line_class) {
	const newElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
	newElement.setAttribute("x1", x1);
	newElement.setAttribute("y1", y1);
	newElement.setAttribute("x2", x2);
	newElement.setAttribute("y2", y2);

	if (line_class !== undefined) {
		newElement.classList.add(line_class);
	}

	svg.appendChild(newElement);
	return newElement;
}

function add_polygon(points) {
	const newElement = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	const points_str = "";
	for (let i = 0; i < points.length; i++) {
		points_str += points[i][0] + "," + points[i][1] + " ";
	}

	newElement.setAttribute("points", points_str);
	svg.appendChild(newElement);
}

// TODO: Merging Paths
function add_path(points, elem_class, centers = []) {
	// if (centers.length) {
	// 	for (let i = 0; i < points.length; i++) {
	// 		const idx = centers.indexOf(points);
	// 		for (let k = 0; k < centers.length; k++) {
	// 			if (idx === k) continue;
	// 			for (let j = 0; j < centers[k].length; j++) {
	// 				const p0 = Math.floor(points[i][0]);
	// 				const p1 = Math.floor(points[i][1]);
	// 				const p0_ = Math.floor(centers[k][j][0]);
	// 				const p1_ = Math.floor(centers[k][j][1]);

	// 				// if (p0_ === p0 && p1_ === p1) {
	// 				// 	for (let l = 0; l < centers[k].length; l++) {
	// 				// 		if (centers[k][l] !== centers[k][j]) points[i] = centers[k][l];
	// 				// 	}
	// 				// }
	// 			}
	// 		}
	// 	}
	// }
	const newElement = document.createElementNS("http://www.w3.org/2000/svg", "path");

	const e = points.length - 1;
	const l = points.length;
	let points_str = "M " + (points[e][0] + points[0][0]) / 2 + " " + (points[e][1] + points[0][1]) / 2 + " ";

	for (let i = 0; i < points.length; i++) {
		const p = points[i][0] + " " + points[i][1];
		points_str += " C " + p + " " + p + " " + (points[i][0] + points[(i + 1) % l][0]) / 2 + " " + (points[i][1] + points[(i + 1) % l][1]) / 2;
	}

	newElement.setAttribute("d", points_str);

	svg.appendChild(newElement);
	if (elem_class !== undefined) {
		newElement.classList.add(elem_class);
		newElement.classList.add("overlay-path");
	}
	return newElement;
}

function poisson_disk_sampling(r, k) {
	const x0 = Math.random(),
		y0 = Math.random();
	const cell_size = r / Math.sqrt(1);
	const x = [x0];
	const y = [y0];

	const indices = nj.ones([Math.floor(1 / cell_size), Math.floor(1 / cell_size)]).multiply(-1);
	indices.set(Math.floor(y0 / cell_size), Math.floor(x0 / cell_size), 0);
	const active = [0];

	while (active.length > 0) {
		const s = active.shift();
		const sx = x[s];
		const sy = y[s];

		let i = 0;
		while (i < k) {
			i++;
			const theta = Math.random() * Math.PI * 2;
			const r2 = Math.random() * r + r;
			const x2 = sx + r2 * Math.cos(theta);
			const y2 = sy + r2 * Math.sin(theta);
			if (x2 < 0 || y2 < 0 || x2 > 1 || y2 > 1) continue;

			const xi = Math.floor(x2 / cell_size);
			const yi = Math.floor(y2 / cell_size);

			if (indices.get(yi, xi) >= 0) continue;

			let too_close = false;
			for (let j = Math.max(0, yi - 2); j < Math.min(indices.shape[0] - 1, yi + 2) + 1; j++) {
				for (let l = Math.max(0, xi - 2); l < Math.min(indices.shape[1] - 1, xi + 2) + 1; l++) {
					if (indices.get(j, l) >= 0 && dist(x2, y2, x[indices.get(j, l)], y[indices.get(j, l)]) <= r) {
						too_close = true;
						break;
					}
				}

				if (too_close) break;
			}

			if (!too_close) {
				indices.set(yi, xi, x.length);
				active.push(x.length);
				x.push(x2);
				y.push(y2);
				break;
			}
		}

		if (i < k) {
			active.unshift(s);
		}
	}

	return nj.stack([x, y]).multiply(0.95).add(0.075).T.tolist();
}

function dist(x1, y1, x2, y2) {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function mean_on_axis0(arr) {
	let res = nj.zeros(arr.shape[1]);
	for (let i = 0; i < arr.shape[0]; i++) {
		res = res.add(arr.pick(i));
	}

	return res.divide(arr.shape[0]);
}

function make_edge_key(edges) {
	edges.sort();
	return edges[0].toString() + "-" + edges[1].toString();
}

function repeat(a, n) {
	const res = [];
	for (let i = 0; i < n; i++) {
		res.push(a);
	}

	return nj.stack(res);
}
