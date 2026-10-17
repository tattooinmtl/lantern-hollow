import { C as PointsMaterial, D as TorusGeometry, E as SphereGeometry, O as Vector3, S as Points, T as Scene, _ as Object3D, a as BufferGeometry, b as PlaneGeometry, c as CylinderGeometry, d as Group, f as HemisphereLight, g as MeshLambertMaterial, h as MeshBasicMaterial, i as BufferAttribute, l as DirectionalLight, m as Mesh, n as AmbientLight, o as Color, p as InstancedMesh, r as BoxGeometry, s as ConeGeometry, t as WebGLRenderer, u as Fog, v as OctahedronGeometry, w as SRGBColorSpace, x as PointLight, y as PerspectiveCamera } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-DNm9E2yx.js
function createAudio() {
	let ctx = null;
	let noise = null;
	function ac() {
		if (typeof AudioContext === "undefined") return null;
		if (!ctx) {
			ctx = new (window.AudioContext || window.webkitAudioContext)();
			const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .25), ctx.sampleRate);
			const d = n.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
			noise = n;
		}
		if (ctx.state === "suspended") ctx.resume();
		return ctx;
	}
	function tone(freq, dur, type, gain, slide = 0) {
		const c = ac();
		if (!c) return;
		const t = c.currentTime;
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(40, freq), t);
		if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(8e-4, t + dur);
		o.connect(g);
		g.connect(c.destination);
		o.start(t);
		o.stop(t + dur + .02);
	}
	function burst(dur, gain, freq = 800) {
		const c = ac();
		if (!c || !noise) return;
		const t = c.currentTime;
		const src = c.createBufferSource();
		src.buffer = noise;
		const filter = c.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = freq;
		filter.Q.value = .7;
		const g = c.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(8e-4, t + dur);
		src.connect(filter);
		filter.connect(g);
		g.connect(c.destination);
		src.start(t);
		src.stop(t + dur);
	}
	return {
		unlock() {
			ac();
		},
		suspend() {
			if (ctx && ctx.state === "running") ctx.suspend();
		},
		resume() {
			if (ctx && ctx.state === "suspended") ctx.resume();
		},
		shot() {
			burst(.09, .12, 1400);
			tone(180, .07, "square", .04, -80);
		},
		empty() {
			tone(420, .04, "square", .03);
		},
		impact() {
			burst(.05, .05, 500);
		},
		hit() {
			tone(660, .06, "square", .05, 220);
		},
		kill() {
			tone(520, .09, "triangle", .06, 180);
			tone(780, .12, "sine", .04, 40);
		},
		hurt() {
			tone(140, .18, "sawtooth", .05, -80);
			burst(.12, .06, 200);
		},
		die() {
			tone(180, .4, "triangle", .07, -120);
		},
		jump() {
			tone(240, .09, "sine", .04, 180);
		},
		step() {
			burst(.04, .035, 280);
		},
		pickup() {
			tone(680, .07, "sine", .05, 180);
		},
		chest() {
			tone(330, .08, "triangle", .05, 40);
			tone(494, .12, "sine", .04, 20);
		},
		gate() {
			burst(.18, .06, 180);
			tone(90, .22, "square", .04, -30);
		},
		potion() {
			tone(520, .1, "sine", .05, 200);
			tone(780, .14, "sine", .04, 80);
		},
		reload() {
			tone(240, .05, "square", .03, 60);
		},
		win() {
			tone(523, .12, "triangle", .05);
			setTimeout(() => tone(659, .12, "triangle", .05), 110);
			setTimeout(() => tone(784, .2, "triangle", .06), 220);
		},
		gem() {
			tone(880, .08, "sine", .04, 120);
		}
	};
}
var CELL = 3.25;
var W = 15;
var H = 15;
var N4$1 = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function keyName(color) {
	if (color === "bronze") return "Bronze key";
	if (color === "silver") return "Silver key";
	return "Gold key";
}
function tryGenerate(seed) {
	const rnd = mulberry32(seed);
	const grid = /* @__PURE__ */ new Uint8Array(225);
	const at = (x, z) => z * W + x;
	const stack = [[1, 1]];
	grid[at(1, 1)] = 1;
	const grow = [
		[0, -2],
		[0, 2],
		[-2, 0],
		[2, 0]
	];
	while (stack.length) {
		const [x, z] = stack[stack.length - 1];
		const opts = [];
		for (const [dx, dz] of grow) {
			const nx = x + dx;
			const nz = z + dz;
			if (nx > 0 && nz > 0 && nx < 14 && nz < 14 && grid[at(nx, nz)] === 0) opts.push([dx, dz]);
		}
		if (!opts.length) {
			stack.pop();
			continue;
		}
		const [dx, dz] = opts[rnd() * opts.length | 0];
		grid[at(x + dx / 2, z + dz / 2)] = 1;
		grid[at(x + dx, z + dz)] = 1;
		stack.push([x + dx, z + dz]);
	}
	const floors = [];
	for (let i = 0; i < grid.length; i++) if (grid[i]) floors.push(i);
	const dist = (/* @__PURE__ */ new Int16Array(225)).fill(-1);
	const parent = (/* @__PURE__ */ new Int32Array(225)).fill(-1);
	const q = [at(1, 1)];
	dist[q[0]] = 0;
	for (let qi = 0; qi < q.length; qi++) {
		const i = q[qi];
		const x = i % W;
		const z = i / W | 0;
		for (const [dx, dz] of N4$1) {
			const nx = x + dx;
			const nz = z + dz;
			if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
			const ni = at(nx, nz);
			if (!grid[ni] || dist[ni] !== -1) continue;
			dist[ni] = (dist[i] ?? 0) + 1;
			parent[ni] = i;
			q.push(ni);
		}
	}
	let exitI = q[0];
	for (const i of q) if ((dist[i] ?? 0) > (dist[exitI] ?? 0)) exitI = i;
	const path = [];
	for (let i = exitI; i !== -1; i = parent[i] ?? -1) path.push(i);
	path.reverse();
	if (path.length < 18) return null;
	const startI = path[0];
	const nextI = path[1];
	const startDir = {
		x: nextI % W - startI % W,
		z: (nextI / W | 0) - (startI / W | 0)
	};
	function neighbors(i) {
		const x = i % W;
		const z = i / W | 0;
		const out = [];
		for (const [dx, dz] of N4$1) {
			const nx = x + dx;
			const nz = z + dz;
			if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
			const ni = at(nx, nz);
			if (grid[ni]) out.push(ni);
		}
		return out;
	}
	const gateIdx = [];
	const usedPath = /* @__PURE__ */ new Set([0, path.length - 1]);
	for (let g = 0; g < 3; g++) {
		const target = Math.round(path.length * (.3 + g * .22));
		let chosen = -1;
		for (let rad = 0; rad < path.length && chosen === -1; rad++) {
			const tries = rad === 0 ? [target] : [target + rad, target - rad];
			for (const idx of tries) {
				if (idx < 7 || idx > path.length - 4) continue;
				if (usedPath.has(idx)) continue;
				let separated = true;
				for (const u of usedPath) if (u !== 0 && u !== path.length - 1 && Math.abs(u - idx) < 4) separated = false;
				if (!separated) continue;
				chosen = idx;
				break;
			}
		}
		if (chosen === -1) return null;
		usedPath.add(chosen);
		gateIdx.push(chosen);
	}
	gateIdx.sort((a, b) => (dist[path[a]] ?? 0) - (dist[path[b]] ?? 0));
	const colors = [
		"bronze",
		"silver",
		"gold"
	];
	const gates = gateIdx.map((idx, i) => {
		const cell = path[idx];
		return {
			x: cell % W,
			z: cell / W | 0,
			keyColor: colors[i]
		};
	});
	const gateSet = new Set(gates.map((g) => at(g.x, g.z)));
	const deadEnds = floors.filter((i) => {
		if (i === at(1, 1) || i === exitI || gateSet.has(i)) return false;
		return neighbors(i).length === 1;
	});
	function wallOffset(i) {
		const x = i % W;
		const z = i / W | 0;
		const opens = neighbors(i);
		if (opens.length === 1) {
			const ox = opens[0] % W - x;
			const oz = (opens[0] / W | 0) - z;
			return {
				ox: -ox,
				oz: -oz
			};
		}
		const walls = [];
		for (const [dx, dz] of N4$1) {
			const nx = x + dx;
			const nz = z + dz;
			if (nx < 0 || nz < 0 || nx >= W || nz >= H || !grid[at(nx, nz)]) walls.push([dx, dz]);
		}
		const pick = walls[rnd() * walls.length | 0] ?? [0, -1];
		return {
			ox: pick[0],
			oz: pick[1]
		};
	}
	const usedChest = /* @__PURE__ */ new Set();
	const chests = [];
	for (const gate of gates) {
		const gd = dist[at(gate.x, gate.z)] ?? 0;
		let cell = deadEnds.filter((i) => !usedChest.has(i) && (dist[i] ?? 0) < gd && (dist[i] ?? 0) > 1).sort((a, b) => (dist[b] ?? 0) - (dist[a] ?? 0))[0];
		if (cell === void 0) {
			const gi = path.indexOf(at(gate.x, gate.z));
			cell = path[Math.max(1, gi - 1)];
			if (cell === void 0 || gateSet.has(cell) || cell === exitI) return null;
		}
		usedChest.add(cell);
		const off = wallOffset(cell);
		const loot = [{
			kind: "key",
			keyColor: gate.keyColor,
			name: keyName(gate.keyColor)
		}];
		if (gate.keyColor === "bronze") loot.push({
			kind: "potion",
			heal: 4,
			name: "Heartbrew"
		});
		if (gate.keyColor === "gold") loot.push({
			kind: "relic",
			name: "Glass beetle"
		});
		chests.push({
			x: cell % W,
			z: cell / W | 0,
			ox: off.ox,
			oz: off.oz,
			loot
		});
	}
	const extraLoot = [
		[{
			kind: "potion",
			heal: 4,
			name: "Heartbrew"
		}],
		[{
			kind: "ammo",
			rounds: 6,
			name: "Bullet tin"
		}],
		[{
			kind: "potion",
			heal: 6,
			name: "Deep tonic"
		}],
		[{
			kind: "potion",
			heal: 4,
			name: "Heartbrew"
		}],
		[{
			kind: "ammo",
			rounds: 8,
			name: "Bullet tin"
		}],
		[{
			kind: "potion",
			heal: 4,
			name: "Heartbrew"
		}]
	];
	const extraCells = deadEnds.filter((i) => !usedChest.has(i)).sort((a, b) => (dist[a] ?? 0) - (dist[b] ?? 0));
	for (let i = 0; i < extraLoot.length && i < extraCells.length; i++) {
		const cell = extraCells[i];
		usedChest.add(cell);
		const off = wallOffset(cell);
		chests.push({
			x: cell % W,
			z: cell / W | 0,
			ox: off.ox,
			oz: off.oz,
			loot: extraLoot[i]
		});
	}
	const occupied = /* @__PURE__ */ new Set([
		at(1, 1),
		exitI,
		...gates.map((g) => at(g.x, g.z)),
		...chests.map((c) => at(c.x, c.z))
	]);
	for (const g of gates) for (const [dx, dz] of N4$1) {
		const nx = g.x + dx;
		const nz = g.z + dz;
		if (nx >= 0 && nz >= 0 && nx < W && nz < H) occupied.add(at(nx, nz));
	}
	function pool(minDist) {
		return floors.filter((i) => !occupied.has(i) && (dist[i] ?? 0) >= minDist);
	}
	function takeRandom(list) {
		if (!list.length) return void 0;
		const idx = rnd() * list.length | 0;
		const cell = list.splice(idx, 1)[0];
		occupied.add(cell);
		return cell;
	}
	const spikePool = pool(5);
	const spikes = [];
	for (let i = 0; i < 3; i++) {
		const cell = takeRandom(spikePool);
		if (cell === void 0) break;
		spikes.push({
			x: cell % W,
			z: cell / W | 0
		});
	}
	const firePool = pool(6);
	const fires = [];
	for (let i = 0; i < 2; i++) {
		const cell = takeRandom(firePool);
		if (cell === void 0) break;
		fires.push({
			x: cell % W,
			z: cell / W | 0,
			phase: rnd() * 2.7
		});
	}
	const slimePool = pool(5);
	const slimes = [];
	for (let i = 0; i < 2; i++) {
		const cell = takeRandom(slimePool);
		if (cell === void 0) break;
		slimes.push({
			x: cell % W,
			z: cell / W | 0
		});
	}
	const enemyPool = pool(7);
	const enemies = [];
	for (const kind of [
		"goblin",
		"goblin",
		"goblin",
		"orc",
		"orc"
	]) {
		let picked;
		for (const space of [3, 0]) {
			for (let i = 0; i < enemyPool.length; i++) {
				const cell = enemyPool[i];
				const x = cell % W;
				const z = cell / W | 0;
				let ok = true;
				if (space > 0) {
					for (const e of enemies) if (Math.max(Math.abs(e.x - x), Math.abs(e.z - z)) < space) ok = false;
				}
				if (!ok) continue;
				enemyPool.splice(i, 1);
				occupied.add(cell);
				picked = cell;
				break;
			}
			if (picked !== void 0) break;
		}
		if (picked === void 0) continue;
		enemies.push({
			x: picked % W,
			z: picked / W | 0,
			kind
		});
	}
	if (enemies.filter((e) => e.kind === "goblin").length < 2) return null;
	if (!enemies.some((e) => e.kind === "orc")) return null;
	const ammo = [];
	const ammoPool = pool(4);
	for (let i = 0; i < 2; i++) {
		const cell = takeRandom(ammoPool);
		if (cell === void 0) break;
		ammo.push({
			x: cell % W,
			z: cell / W | 0,
			rounds: 4
		});
	}
	const gems = [];
	const gemPool = pool(2);
	const gemCount = Math.min(16, gemPool.length);
	for (let i = 0; i < gemCount; i++) {
		const cell = takeRandom(gemPool);
		if (cell === void 0) break;
		gems.push({
			x: cell % W,
			z: cell / W | 0,
			ox: (rnd() - .5) * .9,
			oz: (rnd() - .5) * .9
		});
	}
	return {
		seed,
		w: W,
		h: H,
		grid,
		start: {
			x: 1,
			z: 1
		},
		startDir,
		exit: {
			x: exitI % W,
			z: exitI / W | 0
		},
		gates,
		chests,
		spikes,
		fires,
		slimes,
		enemies,
		gems,
		ammo
	};
}
function canReach(m, open) {
	const key = (x, z) => `${x},${z}`;
	const closed = new Set(m.gates.map((g) => key(g.x, g.z)));
	for (const k of open) closed.delete(k);
	const seen = /* @__PURE__ */ new Set();
	const q = [key(m.start.x, m.start.z)];
	seen.add(q[0]);
	let qi = 0;
	while (qi < q.length) {
		const [xs, zs] = q[qi++].split(",");
		const x = Number(xs);
		const z = Number(zs);
		for (const [dx, dz] of N4$1) {
			const nx = x + dx;
			const nz = z + dz;
			if (nx < 0 || nz < 0 || nx >= m.w || nz >= m.h) continue;
			const k = key(nx, nz);
			if (seen.has(k) || closed.has(k)) continue;
			if (!m.grid[nz * m.w + nx]) continue;
			seen.add(k);
			q.push(k);
		}
	}
	return seen;
}
function mazeIsFair(m) {
	const open = /* @__PURE__ */ new Set();
	for (const g of m.gates) {
		const reach = canReach(m, open);
		const chest = m.chests.find((c) => c.loot.some((l) => l.kind === "key" && l.keyColor === g.keyColor));
		if (!chest) return false;
		if (!reach.has(`${chest.x},${chest.z}`)) return false;
		if (reach.has(`${g.x},${g.z}`)) return false;
		open.add(`${g.x},${g.z}`);
	}
	const done = canReach(m, open);
	if (!done.has(`${m.exit.x},${m.exit.z}`)) return false;
	for (const c of m.chests) if (!done.has(`${c.x},${c.z}`)) return false;
	return true;
}
function generateMaze(seed = 20261013) {
	for (let i = 0; i < 40; i++) {
		const m = tryGenerate(seed + i * 17 >>> 0);
		if (m && mazeIsFair(m)) return m;
	}
	throw new Error("Could not build a fair maze");
}
var STEP = 1 / 60;
var RADIUS = .34;
var EYE = 1.48;
var N4 = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
function radial(x, y, dz = .18) {
	const m = Math.hypot(x, y);
	if (m < dz || m === 0) return {
		x: 0,
		y: 0
	};
	const s = (m - dz) / (1 - dz) / m;
	return {
		x: x * s,
		y: y * s
	};
}
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
	const lx = cx - ox;
	const ly = cy - oy;
	const lz = cz - oz;
	const tca = lx * dx + ly * dy + lz * dz;
	if (tca < 0) return -1;
	const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
	const r2 = r * r;
	if (d2 > r2) return -1;
	return tca - Math.sqrt(r2 - d2);
}
function noopHandle() {
	const noop = () => {};
	return {
		start: noop,
		restart: noop,
		resume: noop,
		setInventory: noop,
		useItem: noop,
		moveItem: noop,
		dropItem: noop,
		toggleTorch: noop,
		setMove: noop,
		addLook: noop,
		pokeAttack: noop,
		pokeJump: noop,
		pokeUse: noop,
		dispose: noop
	};
}
function mountGame(opts) {
	const { canvas, minimap, onSnapshot, onReady, onError } = opts;
	const audio = createAudio();
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let maze;
	try {
		maze = generateMaze(opts.seed);
	} catch {
		onError("The hollow wouldn't settle.");
		onReady();
		return noopHandle();
	}
	const { w: W, h: H } = maze;
	const grid = maze.grid;
	let renderer;
	try {
		renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: "high-performance"
		});
	} catch {
		onError("This browser couldn't open the 3D view.");
		onReady();
		return noopHandle();
	}
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.toneMapping = 0;
	renderer.setClearColor(1446671, 1);
	renderer.autoClear = false;
	const scene = new Scene();
	scene.background = new Color(1446671);
	scene.fog = new Fog(1446671, 8, 28);
	scene.add(new HemisphereLight(16773340, 6047288, .46));
	scene.add(new AmbientLight(16774376, .08));
	const moon = new DirectionalLight(14148351, .18);
	moon.position.set(-8, 14, 6);
	scene.add(moon);
	const torchLight = new PointLight(16757086, 14, 16, 1.35);
	scene.add(torchLight);
	const muzzleLight = new PointLight(16769712, 0, 7, 2);
	scene.add(muzzleLight);
	const camera = new PerspectiveCamera(74, 1, .08, 80);
	const yawGroup = new Group();
	yawGroup.add(camera);
	camera.position.set(0, EYE, 0);
	scene.add(yawGroup);
	const viewScene = new Scene();
	const viewCam = new PerspectiveCamera(46, 1, .05, 8);
	viewScene.add(new AmbientLight(16777215, .85));
	const viewKey = new DirectionalLight(16773597, 1.35);
	viewKey.position.set(.5, 1.2, 1);
	viewScene.add(viewKey);
	const mapCtx = minimap.getContext("2d");
	minimap.width = 192;
	minimap.height = 192;
	const gateAt = /* @__PURE__ */ new Map();
	maze.gates.forEach((g, i) => gateAt.set(g.z * W + g.x, i));
	function solid(cx, cz) {
		if (cx < 0 || cz < 0 || cx >= W || cz >= H) return true;
		const i = cz * W + cx;
		if (!grid[i]) return true;
		const gi = gateAt.get(i);
		if (gi !== void 0 && !gatesOpen[gi]) return true;
		return false;
	}
	function blocked(px, pz, rad) {
		const minX = Math.floor((px - rad) / CELL);
		const maxX = Math.floor((px + rad) / CELL);
		const minZ = Math.floor((pz - rad) / CELL);
		const maxZ = Math.floor((pz + rad) / CELL);
		for (let cz = minZ; cz <= maxZ; cz++) for (let cx = minX; cx <= maxX; cx++) {
			if (!solid(cx, cz)) continue;
			const x0 = cx * CELL;
			const z0 = cz * CELL;
			const qx = Math.max(x0, Math.min(px, x0 + CELL));
			const qz = Math.max(z0, Math.min(pz, z0 + CELL));
			const dx = px - qx;
			const dz = pz - qz;
			if (dx * dx + dz * dz < rad * rad) return true;
		}
		return false;
	}
	function los(x0, z0, x1, z1) {
		const dist = Math.hypot(x1 - x0, z1 - z0);
		const steps = Math.max(1, Math.ceil(dist / .35));
		for (let i = 1; i < steps; i++) {
			const t = i / steps;
			const px = x0 + (x1 - x0) * t;
			const pz = z0 + (z1 - z0) * t;
			if (solid(Math.floor(px / 3.25), Math.floor(pz / 3.25))) return false;
		}
		return true;
	}
	function bfs(sx, sz, tx, tz) {
		const start = sz * W + sx;
		const goal = tz * W + tx;
		if (sx === tx && sz === tz) return [];
		const prev = new Int32Array(W * H).fill(-1);
		const seen = new Uint8Array(W * H);
		const q = [start];
		seen[start] = 1;
		for (let qi = 0; qi < q.length; qi++) {
			const i = q[qi];
			const x = i % W;
			const z = i / W | 0;
			for (const [dx, dz] of N4) {
				const nx = x + dx;
				const nz = z + dz;
				if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
				const ni = nz * W + nx;
				if (seen[ni] || !grid[ni]) continue;
				const g = gateAt.get(ni);
				if (g !== void 0 && !gatesOpen[g]) continue;
				seen[ni] = 1;
				prev[ni] = i;
				if (ni === goal) {
					const path = [];
					let c = goal;
					while (c !== start && c !== -1) {
						path.push({
							x: c % W,
							z: c / W | 0
						});
						c = prev[c] ?? -1;
					}
					path.reverse();
					return path;
				}
				q.push(ni);
			}
		}
		return null;
	}
	const stone = new MeshLambertMaterial({
		color: 16777215,
		flatShading: true
	});
	const floorMat = stone;
	const wallColors = [
		12889494,
		12098950,
		13810596
	];
	const floorColors = [10125416, 9270368];
	let floorN = 0;
	let wallN = 0;
	let ceilN = 0;
	const skylight = (x, z) => (x * 3 + z * 5) % 11 === 0 && !(x === maze.start.x && z === maze.start.z);
	for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (grid[z * W + x]) {
		floorN++;
		if (!skylight(x, z)) ceilN++;
	} else wallN++;
	const dummy = new Object3D();
	const color = new Color();
	const floors = new InstancedMesh(new BoxGeometry(CELL, .4, CELL), floorMat, floorN);
	const walls = new InstancedMesh(new BoxGeometry(CELL, 3.05, CELL), stone, Math.max(1, wallN));
	const ceils = new InstancedMesh(new BoxGeometry(CELL, .28, CELL), stone, Math.max(1, ceilN));
	let fi = 0;
	let wi = 0;
	let ci = 0;
	for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
		const wx = (x + .5) * CELL;
		const wz = (z + .5) * CELL;
		if (grid[z * W + x]) {
			dummy.position.set(wx, -.2, wz);
			dummy.rotation.set(0, 0, 0);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			floors.setMatrixAt(fi, dummy.matrix);
			floors.setColorAt(fi, color.setHex(floorColors[x + z & 1]));
			fi++;
			if (!skylight(x, z)) {
				dummy.position.set(wx, 3.19, wz);
				dummy.updateMatrix();
				ceils.setMatrixAt(ci, dummy.matrix);
				ceils.setColorAt(ci, color.setHex(3814188));
				ci++;
			}
		} else {
			dummy.position.set(wx, 1.525, wz);
			dummy.updateMatrix();
			walls.setMatrixAt(wi, dummy.matrix);
			walls.setColorAt(wi, color.setHex(wallColors[(x * 3 + z) % 3]));
			wi++;
		}
	}
	floors.instanceMatrix.needsUpdate = true;
	walls.instanceMatrix.needsUpdate = true;
	ceils.instanceMatrix.needsUpdate = true;
	if (floors.instanceColor) floors.instanceColor.needsUpdate = true;
	if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
	if (ceils.instanceColor) ceils.instanceColor.needsUpdate = true;
	scene.add(floors, walls, ceils);
	const starPos = /* @__PURE__ */ new Float32Array(540);
	for (let i = 0; i < 180; i++) {
		starPos[i * 3] = (Math.random() - .5) * 70;
		starPos[i * 3 + 1] = 6 + Math.random() * 8;
		starPos[i * 3 + 2] = (Math.random() - .5) * 70;
	}
	const starGeo = new BufferGeometry();
	starGeo.setAttribute("position", new BufferAttribute(starPos, 3));
	scene.add(new Points(starGeo, new PointsMaterial({
		color: 16183268,
		size: .07
	})));
	const exitLight = new PointLight(16762218, 3.4, 10, 1.7);
	exitLight.position.set((maze.exit.x + .5) * CELL, 1.5, (maze.exit.z + .5) * CELL);
	scene.add(exitLight);
	function runsOnX(cx, cz) {
		let hx = 0;
		let hz = 0;
		for (const [dx, dz] of N4) {
			const nx = cx + dx;
			const nz = cz + dz;
			if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
			if (!grid[nz * W + nx]) continue;
			if (dx !== 0) hx++;
			else hz++;
		}
		return hx >= hz;
	}
	const archMat = new MeshLambertMaterial({
		color: 14914106,
		emissive: 14914106,
		emissiveIntensity: .8,
		flatShading: true
	});
	const arch = new Group();
	const postGeo = new BoxGeometry(.16, 2.35, .16);
	const leftPost = new Mesh(postGeo, archMat);
	leftPost.position.set(-.72, 1.18, 0);
	const rightPost = new Mesh(postGeo, archMat);
	rightPost.position.set(.72, 1.18, 0);
	const lintel = new Mesh(new BoxGeometry(1.62, .16, .16), archMat);
	lintel.position.y = 2.32;
	const veil = new Mesh(new PlaneGeometry(1.15, 2.05), new MeshBasicMaterial({
		color: 16765065,
		transparent: true,
		opacity: .33,
		side: 2,
		depthWrite: false
	}));
	veil.position.y = 1.15;
	arch.add(leftPost, rightPost, lintel, veil);
	arch.position.copy(exitLight.position);
	arch.position.y = 0;
	if (runsOnX(maze.exit.x, maze.exit.z)) arch.rotation.y = Math.PI / 2;
	scene.add(arch);
	const gateColors = {
		bronze: 12878922,
		silver: 14014687,
		gold: 15122778
	};
	const barGeo = new CylinderGeometry(.045, .045, 2.65, 5);
	const gatesOpen = maze.gates.map(() => false);
	const gateGroups = maze.gates.map((g) => {
		const mat = new MeshLambertMaterial({
			color: gateColors[g.keyColor] ?? 14014687,
			flatShading: true,
			emissive: gateColors[g.keyColor] ?? 14014687,
			emissiveIntensity: .18
		});
		const group = new Group();
		const alongX = runsOnX(g.x, g.z);
		for (let i = -2; i <= 2; i++) {
			const bar = new Mesh(barGeo, mat);
			bar.position.y = 1.32;
			if (alongX) bar.position.z = i * .28;
			else bar.position.x = i * .28;
			group.add(bar);
		}
		const cap = new Mesh(new BoxGeometry(alongX ? .16 : 1.5, .1, alongX ? 1.5 : .16), mat);
		cap.position.y = 2.6;
		group.add(cap);
		group.position.set((g.x + .5) * CELL, 0, (g.z + .5) * CELL);
		scene.add(group);
		return {
			group,
			anim: 0
		};
	});
	const wood = new MeshLambertMaterial({
		color: 10840892,
		flatShading: true
	});
	const woodDark = new MeshLambertMaterial({
		color: 8015404,
		flatShading: true
	});
	const bandMat = new MeshLambertMaterial({
		color: 14914106,
		emissive: 14914106,
		emissiveIntensity: .35,
		flatShading: true
	});
	const lidGeo = new BoxGeometry(.74, .14, .48);
	lidGeo.translate(0, .07, -.24);
	const chests = maze.chests.map((c) => {
		const group = new Group();
		const body = new Mesh(new BoxGeometry(.7, .4, .46), wood);
		body.position.y = .28;
		const band = new Mesh(new BoxGeometry(.74, .08, .5), bandMat);
		band.position.y = .32;
		const lid = new Mesh(lidGeo, woodDark);
		lid.position.set(0, .48, .24);
		group.add(body, band, lid);
		const wx = (c.x + .5) * CELL + c.ox * .95;
		const wz = (c.z + .5) * CELL + c.oz * .95;
		group.position.set(wx, 0, wz);
		if (c.ox !== 0) group.rotation.y = c.ox > 0 ? Math.PI / 2 : -Math.PI / 2;
		if (c.oz > 0) group.rotation.y = 0;
		if (c.oz < 0) group.rotation.y = Math.PI;
		scene.add(group);
		return {
			wx,
			wz,
			loot: c.loot.map((t) => ({ ...t })),
			anim: 0,
			opened: false,
			lid
		};
	});
	const plateGeo = new CylinderGeometry(.62, .68, .08, 8);
	const spikeGeo = new ConeGeometry(.07, .85, 5);
	const plateMat = new MeshLambertMaterial({
		color: 9278364,
		flatShading: true
	});
	const spikeMat = new MeshLambertMaterial({
		color: 14014687,
		flatShading: true
	});
	const spikes = maze.spikes.map((s) => {
		const group = new Group();
		const plate = new Mesh(plateGeo, plateMat);
		plate.position.y = .04;
		const spikeG = new Group();
		for (let i = 0; i < 7; i++) {
			const cone = new Mesh(spikeGeo, spikeMat);
			const a = i / 7 * Math.PI * 2;
			cone.position.set(Math.cos(a) * .28, .42, Math.sin(a) * .28);
			spikeG.add(cone);
		}
		const mid = new Mesh(spikeGeo, spikeMat);
		mid.position.y = .42;
		spikeG.add(mid);
		spikeG.position.y = -.75;
		group.add(plate, spikeG);
		const x = (s.x + .5) * CELL;
		const z = (s.z + .5) * CELL;
		group.position.set(x, 0, z);
		scene.add(group);
		return {
			x,
			z,
			state: "idle",
			t: 0,
			hit: false,
			spikes: spikeG
		};
	});
	const flameGeo = new ConeGeometry(.16, .7, 5);
	const grateGeo = new CylinderGeometry(.46, .5, .06, 8);
	const fires = maze.fires.map((f) => {
		const mat = new MeshBasicMaterial({
			color: 16747069,
			transparent: true,
			opacity: .2,
			depthWrite: false
		});
		const group = new Group();
		const grate = new Mesh(grateGeo, new MeshLambertMaterial({
			color: 4866104,
			emissive: 8008724,
			emissiveIntensity: .4
		}));
		grate.position.y = .04;
		group.add(grate);
		const cones = [];
		for (let i = 0; i < 3; i++) {
			const cone = new Mesh(flameGeo, mat);
			cone.position.set((i - 1) * .18, .4, 0);
			group.add(cone);
			cones.push(cone);
		}
		const x = (f.x + .5) * CELL;
		const z = (f.z + .5) * CELL;
		group.position.set(x, 0, z);
		scene.add(group);
		return {
			x,
			z,
			phase: f.phase,
			lastBurst: -1,
			mat,
			cones
		};
	});
	const slimeMat = new MeshLambertMaterial({
		color: 4173674,
		emissive: 1334322,
		emissiveIntensity: .55,
		transparent: true,
		opacity: .82,
		flatShading: true
	});
	const slimes = maze.slimes.map((s, i) => {
		const group = new Group();
		const blob = new Mesh(new CylinderGeometry(1.05, 1.2, .14, 10), slimeMat);
		blob.position.y = .07;
		group.add(blob);
		const bubbleGeo = new SphereGeometry(.1, 6, 5);
		const bubbles = [];
		for (let b = 0; b < 3; b++) {
			const bubble = new Mesh(bubbleGeo, slimeMat);
			bubble.position.set(Math.cos(b * 2.1 + i) * .45, .16, Math.sin(b * 2.1 + i) * .45);
			group.add(bubble);
			bubbles.push(bubble);
		}
		const x = (s.x + .5) * CELL;
		const z = (s.z + .5) * CELL;
		group.position.set(x, 0, z);
		scene.add(group);
		return {
			x,
			z,
			bubbles
		};
	});
	const gemGeo = new OctahedronGeometry(.16, 0);
	const gemMat = new MeshLambertMaterial({
		color: 16765850,
		emissive: 14914106,
		emissiveIntensity: .85,
		flatShading: true
	});
	const gems = maze.gems.map((g) => {
		const mesh = new Mesh(gemGeo, gemMat);
		mesh.position.set((g.x + .5) * CELL + g.ox, .6, (g.z + .5) * CELL + g.oz);
		scene.add(mesh);
		return {
			mesh,
			alive: true
		};
	});
	const ammoGeo = new BoxGeometry(.18, .1, .24);
	const ammoMat = new MeshLambertMaterial({
		color: 13935450,
		emissive: 5913110,
		emissiveIntensity: .35,
		flatShading: true
	});
	const loose = maze.ammo.map((a) => {
		const mesh = new Mesh(ammoGeo, ammoMat);
		const x = (a.x + .5) * CELL;
		const z = (a.z + .5) * CELL;
		mesh.position.set(x, .22, z);
		scene.add(mesh);
		return {
			x,
			z,
			rounds: a.rounds,
			alive: true,
			mesh,
			extra: false
		};
	});
	function makeFighter(kind) {
		const goblin = kind === "goblin";
		const group = new Group();
		const skin = new MeshLambertMaterial({
			color: goblin ? 8239722 : 7245646,
			flatShading: true,
			emissive: 0
		});
		const body = new Mesh(new BoxGeometry(goblin ? .48 : .72, goblin ? .52 : .68, goblin ? .32 : .44), skin);
		body.position.y = goblin ? .5 : .64;
		const head = new Mesh(new BoxGeometry(goblin ? .34 : .44, goblin ? .3 : .36, goblin ? .3 : .38), skin);
		head.position.set(0, goblin ? .92 : 1.16, .02);
		group.add(body, head);
		const eye = new MeshBasicMaterial({ color: 16183268 });
		const pupil = new MeshBasicMaterial({ color: 1709586 });
		const eyeY = goblin ? .94 : 1.18;
		const eyeZ = goblin ? .16 : .2;
		const eyeX = goblin ? .08 : .11;
		for (const s of [-1, 1]) {
			const e = new Mesh(new BoxGeometry(.07, .08, .04), eye);
			e.position.set(s * eyeX, eyeY, eyeZ);
			const p = new Mesh(new BoxGeometry(.035, .04, .02), pupil);
			p.position.set(s * eyeX, eyeY, eyeZ + .03);
			group.add(e, p);
		}
		if (goblin) for (const s of [-1, 1]) {
			const ear = new Mesh(new ConeGeometry(.05, .16, 4), skin);
			ear.position.set(s * .2, 1.08, 0);
			group.add(ear);
		}
		else {
			const tuskMat = new MeshLambertMaterial({
				color: 15786692,
				flatShading: true
			});
			for (const s of [-1, 1]) {
				const tusk = new Mesh(new ConeGeometry(.035, .14, 4), tuskMat);
				tusk.rotation.x = Math.PI;
				tusk.position.set(s * .1, .98, .2);
				group.add(tusk);
			}
		}
		const bar = new Group();
		bar.add(new Mesh(new BoxGeometry(.52, .07, .02), new MeshBasicMaterial({ color: 2367258 })));
		const fill = new Mesh(new BoxGeometry(.48, .045, .03), new MeshBasicMaterial({ color: 13914940 }));
		fill.position.z = .012;
		bar.add(fill);
		bar.position.y = goblin ? 1.28 : 1.58;
		bar.visible = false;
		group.add(bar);
		return {
			group,
			skin,
			fill,
			bar
		};
	}
	const enemies = maze.enemies.map((e) => {
		const made = makeFighter(e.kind);
		const x = (e.x + .5) * CELL;
		const z = (e.z + .5) * CELL;
		made.group.position.set(x, 0, z);
		scene.add(made.group);
		const max = e.kind === "goblin" ? 2 : 3;
		return {
			kind: e.kind,
			x,
			z,
			yaw: Math.random() * Math.PI * 2,
			hp: max,
			max,
			alive: true,
			alert: false,
			memory: 0,
			think: Math.random() * .3,
			path: [],
			attackCd: .4,
			windup: 0,
			flash: 0,
			group: made.group,
			skin: made.skin,
			fill: made.fill,
			bar: made.bar
		};
	});
	const partGeo = new BoxGeometry(.08, .08, .08);
	const partMats = [new MeshBasicMaterial({ color: 16183268 }), new MeshBasicMaterial({ color: 14914106 })];
	const parts = Array.from({ length: 28 }, (_, i) => {
		const mesh = new Mesh(partGeo, partMats[i % 2]);
		mesh.visible = false;
		scene.add(mesh);
		return {
			mesh,
			v: new Vector3(),
			life: 0
		};
	});
	let partCursor = 0;
	function burst(x, y, z, n = 8, speed = 3.2) {
		for (let i = 0; i < n; i++) {
			const p = parts[partCursor++ % parts.length];
			p.mesh.visible = true;
			p.mesh.position.set(x, y, z);
			p.v.set((Math.random() - .5) * speed, Math.random() * speed * .8, (Math.random() - .5) * speed);
			p.life = .28 + Math.random() * .22;
		}
	}
	const steel = new MeshLambertMaterial({
		color: 4870748,
		flatShading: true
	});
	const steelDark = new MeshLambertMaterial({
		color: 2762274,
		flatShading: true
	});
	const gripMat = new MeshLambertMaterial({
		color: 6962730,
		flatShading: true
	});
	const gun = new Group();
	const slide = new Mesh(new BoxGeometry(.09, .1, .32), steel);
	slide.position.set(0, .045, -.02);
	const barrel = new Mesh(new CylinderGeometry(.02, .024, .24, 6), steel);
	barrel.rotation.x = -Math.PI / 2;
	barrel.position.set(0, .05, -.26);
	const receiver = new Mesh(new BoxGeometry(.078, .12, .16), steelDark);
	receiver.position.set(0, -.02, .02);
	const grip = new Mesh(new BoxGeometry(.07, .16, .08), gripMat);
	grip.position.set(0, -.13, .07);
	grip.rotation.x = .38;
	gun.add(slide, barrel, receiver, grip);
	gun.position.set(.28, -.26, -.5);
	const flashMat = new MeshBasicMaterial({
		color: 16771e3,
		transparent: true,
		depthWrite: false,
		blending: 2
	});
	const flash = new Mesh(new PlaneGeometry(.14, .14), flashMat);
	flash.position.set(0, .05, -.4);
	flash.visible = false;
	gun.add(flash);
	viewScene.add(gun);
	const woodTorch = new MeshLambertMaterial({
		color: 7029804,
		flatShading: true
	});
	const flameMat = new MeshBasicMaterial({ color: 16757066 });
	const torch = new Group();
	const stick = new Mesh(new CylinderGeometry(.028, .04, .46, 5), woodTorch);
	stick.rotation.z = .15;
	const flame = new Mesh(new ConeGeometry(.07, .18, 5), flameMat);
	flame.position.y = .28;
	torch.add(stick, flame);
	torch.position.set(-.34, -.28, -.46);
	viewScene.add(torch);
	const startX = (maze.start.x + .5) * CELL;
	const startZ = (maze.start.z + .5) * CELL;
	const startYaw = Math.atan2(-maze.startDir.x, -maze.startDir.z);
	let phase = "menu";
	let x = startX;
	let y = 0;
	let z = startZ;
	let yaw = startYaw;
	let pitch = 0;
	let vx = 0;
	let vy = 0;
	let vz = 0;
	let hp = 10;
	let iframe = 0;
	let hurtFlash = 0;
	let mag = 8;
	let reserve = 0;
	let reloading = false;
	let reloadT = 0;
	let fireCd = 0;
	let slots = Array.from({ length: 8 }, () => null);
	let gemsGot = 0;
	let kills = 0;
	let playTime = 0;
	let torchOn = true;
	let slowed = false;
	let slimeAcc = 0;
	let grounded = true;
	let coyote = 0;
	let jumpBuf = 0;
	let bobPhase = 0;
	let bobY = 0;
	let recoilKick = 0;
	let gunKick = 0;
	let gunSwayX = 0;
	let gunSwayY = 0;
	let aimDx = 0;
	let aimDy = 0;
	let muzzle = 0;
	let shake = 0;
	let toast = "";
	let toastT = 0;
	let near = "";
	let hitMarker = 0;
	let clock = 0;
	let fullCd = 0;
	let stepAcc = 0;
	let seq = 1;
	let snapAcc = 0;
	let locked = false;
	const explored = new Uint8Array(W * H);
	const keys = /* @__PURE__ */ new Set();
	let prevKeys = /* @__PURE__ */ new Set();
	let touchX = 0;
	let touchY = 0;
	let lookDx = 0;
	let lookDy = 0;
	let attackEdge = false;
	let jumpEdge = false;
	let useEdge = false;
	let reloadEdge = false;
	let torchEdge = false;
	let invEdge = false;
	let pauseEdge = false;
	let useSlot = -1;
	let padFire = false;
	let padJump = false;
	let padUse = false;
	let padReload = false;
	let scripted = false;
	let frames = 0;
	let disposed = false;
	const token = {};
	let drops = [];
	const _pos = new Vector3();
	const _dir = new Vector3();
	function makeItem(t) {
		return {
			...t,
			id: `it${seq++}`
		};
	}
	function makeItemMesh(item) {
		const group = new Group();
		if (item.kind === "key") {
			const hex = item.keyColor === "gold" ? 15122778 : item.keyColor === "silver" ? 14014687 : 12878922;
			const mat = new MeshLambertMaterial({
				color: hex,
				emissive: hex,
				emissiveIntensity: .28,
				flatShading: true
			});
			const bow = new Mesh(new TorusGeometry(.08, .025, 4, 6), mat);
			bow.rotation.x = Math.PI / 2;
			const shaft = new Mesh(new BoxGeometry(.035, .16, .035), mat);
			shaft.position.y = -.12;
			group.add(bow, shaft);
		} else if (item.kind === "potion") {
			const mat = new MeshLambertMaterial({
				color: 13914940,
				emissive: 6954518,
				emissiveIntensity: .45,
				flatShading: true
			});
			const bottle = new Mesh(new CylinderGeometry(.07, .09, .22, 6), mat);
			const neck = new Mesh(new CylinderGeometry(.03, .045, .08, 5), mat);
			neck.position.y = .14;
			group.add(bottle, neck);
		} else if (item.kind === "ammo") group.add(new Mesh(ammoGeo, ammoMat));
		else {
			const mat = new MeshLambertMaterial({
				color: 10477775,
				emissive: 1862232,
				emissiveIntensity: .55,
				flatShading: true
			});
			group.add(new Mesh(new OctahedronGeometry(.12, 0), mat));
		}
		scene.add(group);
		return group;
	}
	function push(force = false) {
		snapAcc += force ? 1 : 0;
		if (!force && snapAcc < .1) return;
		snapAcc = 0;
		onSnapshot(buildSnap());
	}
	function buildSnap() {
		return {
			phase,
			hp,
			mag,
			reserve,
			reload: reloading ? Math.min(1, 1 - reloadT / .9) : 0,
			time: playTime,
			gems: gemsGot,
			gemsTotal: maze.gems.length,
			kills,
			slots: slots.map((s) => s ? { ...s } : null),
			toast: toastT > 0 ? toast : "",
			torch: torchOn,
			slowed,
			hurt: hurtFlash,
			hit: hitMarker,
			near,
			seed: maze.seed,
			locked,
			error: ""
		};
	}
	function say(text, seconds = 1.35) {
		toast = text;
		toastT = seconds;
	}
	function reveal(px, pz) {
		const cx = Math.floor(px / CELL);
		const cz = Math.floor(pz / CELL);
		for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
			const gx = cx + dx;
			const gz = cz + dz;
			if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
			const i = gz * W + gx;
			if (!explored[i] && gx === maze.exit.x && gz === maze.exit.z) say("The way out glints ahead", 1.8);
			explored[i] = 1;
		}
	}
	function resetRuntime() {
		phase = "menu";
		x = startX;
		y = 0;
		z = startZ;
		yaw = startYaw;
		pitch = 0;
		vx = 0;
		vy = 0;
		vz = 0;
		hp = 10;
		iframe = 0;
		hurtFlash = 0;
		mag = 8;
		reserve = 0;
		reloading = false;
		reloadT = 0;
		fireCd = 0;
		slots = Array.from({ length: 8 }, () => null);
		gemsGot = 0;
		kills = 0;
		playTime = 0;
		torchOn = true;
		slowed = false;
		slimeAcc = 0;
		grounded = true;
		coyote = .12;
		jumpBuf = 0;
		bobPhase = 0;
		bobY = 0;
		recoilKick = 0;
		gunKick = 0;
		muzzle = 0;
		shake = 0;
		toast = "";
		toastT = 0;
		near = "";
		hitMarker = 0;
		clock = 0;
		stepAcc = 0;
		explored.fill(0);
		reveal(x, z);
		for (let i = 0; i < gatesOpen.length; i++) gatesOpen[i] = false;
		for (const g of gateGroups) {
			g.anim = 0;
			g.group.position.y = 0;
		}
		chests.forEach((c, i) => {
			c.loot = maze.chests[i].loot.map((t) => ({ ...t }));
			c.anim = 0;
			c.opened = false;
			c.lid.rotation.x = 0;
		});
		for (const s of spikes) {
			s.state = "idle";
			s.t = 0;
			s.hit = false;
			s.spikes.position.y = -.75;
		}
		for (const f of fires) f.lastBurst = -1;
		for (const g of gems) {
			g.alive = true;
			g.mesh.visible = true;
		}
		for (let i = loose.length - 1; i >= 0; i--) {
			const a = loose[i];
			if (a.extra) {
				scene.remove(a.mesh);
				loose.splice(i, 1);
			} else {
				a.alive = true;
				a.mesh.visible = true;
			}
		}
		for (const d of drops) scene.remove(d.mesh);
		drops = [];
		for (const e of enemies) {
			const src = maze.enemies[enemies.indexOf(e)];
			e.x = (src.x + .5) * CELL;
			e.z = (src.z + .5) * CELL;
			e.hp = e.max;
			e.alive = true;
			e.alert = false;
			e.memory = 0;
			e.path = [];
			e.attackCd = .5;
			e.windup = 0;
			e.flash = 0;
			e.group.visible = true;
			e.bar.visible = false;
			e.skin.emissive.setHex(0);
		}
		for (const p of parts) {
			p.life = 0;
			p.mesh.visible = false;
		}
	}
	function hurt(pips, o) {
		if (hp <= 0 || phase !== "play") return;
		if (o.iframe && iframe > 0) return;
		hp = Math.max(0, hp - pips);
		if (o.iframe) iframe = .72;
		hurtFlash = 1;
		if (!reduced) shake = Math.min(.32, shake + .07 * pips);
		say(o.text, 1.1);
		audio.hurt();
		if (o.knock && o.sx !== void 0 && o.sz !== void 0) {
			const dx = x - o.sx;
			const dz = z - o.sz;
			const len = Math.hypot(dx, dz) || 1;
			vx += dx / len * 4.4;
			vz += dz / len * 4.4;
		}
		if (hp <= 0) {
			phase = "dead";
			vx = 0;
			vz = 0;
			vy = 0;
			audio.die();
			if (document.pointerLockElement) document.exitPointerLock();
		}
		push(true);
	}
	function firstEmpty() {
		return slots.findIndex((s) => s == null);
	}
	function useItem(index) {
		const it = slots[index];
		if (!it) return;
		if (it.kind === "potion") {
			const heal = it.heal ?? 4;
			if (hp >= 10) {
				say("Already brimming", 1);
				push(true);
				return;
			}
			hp = Math.min(10, hp + heal);
			slots[index] = null;
			audio.potion();
			const hearts = heal / 2;
			say(`${it.name} — ${hearts} heart${hearts === 1 ? "" : "s"}`);
			push(true);
			return;
		}
		if (it.kind === "ammo") {
			reserve += it.rounds ?? 0;
			slots[index] = null;
			audio.pickup();
			say(`+${it.rounds ?? 0} rounds`);
			push(true);
			return;
		}
		if (it.kind === "key") {
			say(`${it.name} — find its gate`);
			push(true);
			return;
		}
		say("The beetle ticks like a warm watch");
		push(true);
	}
	function moveItem(from, to) {
		if (from === to || from < 0 || to < 0 || from >= 8 || to >= 8) return;
		const a = slots[from];
		slots[from] = slots[to] ?? null;
		slots[to] = a ?? null;
		push(true);
	}
	function dropItem(index) {
		const it = slots[index];
		if (!it) return;
		slots[index] = null;
		const fx = -Math.sin(yaw);
		const fz = -Math.cos(yaw);
		let dx = x + fx * 1.25;
		let dz = z + fz * 1.25;
		if (blocked(dx, dz, .2)) {
			dx = x + fx * .45;
			dz = z + fz * .45;
		}
		const mesh = makeItemMesh(it);
		mesh.position.set(dx, .35, dz);
		drops.push({
			x: dx,
			z: dz,
			item: it,
			mesh
		});
		audio.pickup();
		say(`Dropped ${it.name}`);
		push(true);
	}
	function spawnLoose(wx, wz, rounds) {
		const mesh = new Mesh(ammoGeo, ammoMat);
		mesh.position.set(wx, .22, wz);
		scene.add(mesh);
		loose.push({
			x: wx,
			z: wz,
			rounds,
			alive: true,
			mesh,
			extra: true
		});
	}
	function killEnemy(e) {
		e.alive = false;
		e.group.visible = false;
		kills++;
		const rounds = e.kind === "goblin" ? 3 + (Math.random() * 3 | 0) : 5 + (Math.random() * 3 | 0);
		spawnLoose(e.x, e.z, rounds);
		burst(e.x, .7, e.z, 10, 3.4);
		audio.kill();
		say(e.kind === "goblin" ? `Goblin down — +${rounds} rounds` : `Orc down — +${rounds} rounds`);
		push(true);
	}
	function syncRig() {
		const sway = phase === "menu" && !reduced ? Math.sin(performance.now() / 900) * .12 : 0;
		yawGroup.position.set(x, y, z);
		yawGroup.rotation.y = yaw + sway;
		const shx = reduced ? 0 : (Math.random() - .5) * shake;
		const shy = reduced ? 0 : (Math.random() - .5) * shake;
		camera.position.set(shx, EYE + bobY + shy, 0);
		camera.rotation.x = pitch + recoilKick;
		camera.rotation.z = 0;
		yawGroup.updateMatrixWorld(true);
	}
	function shoot() {
		if (reloading) return;
		if (mag <= 0) {
			audio.empty();
			if (reserve > 0) {
				reloading = true;
				reloadT = .9;
			} else say("Handgun empty", .8);
			push(true);
			return;
		}
		mag--;
		fireCd = .32;
		recoilKick = .055;
		gunKick = 1;
		muzzle = .045;
		yaw += (Math.random() - .5) * .012;
		if (!reduced) shake = Math.min(.18, shake + .035);
		audio.shot();
		syncRig();
		camera.getWorldPosition(_pos);
		camera.getWorldDirection(_dir);
		_dir.x += (Math.random() - .5) * .008;
		_dir.y += (Math.random() - .5) * .008;
		_dir.z += (Math.random() - .5) * .008;
		_dir.normalize();
		muzzleLight.position.copy(_pos);
		let wallT = 36;
		for (let t = .25; t < wallT; t += .18) {
			const px = _pos.x + _dir.x * t;
			const py = _pos.y + _dir.y * t;
			const pz = _pos.z + _dir.z * t;
			if (py <= .02 || py >= 3.02 || solid(Math.floor(px / 3.25), Math.floor(pz / 3.25))) {
				wallT = t;
				break;
			}
		}
		let bestT = wallT;
		let hit = null;
		for (const e of enemies) {
			if (!e.alive) continue;
			const t = raySphere(_pos.x, _pos.y, _pos.z, _dir.x, _dir.y, _dir.z, e.x, e.kind === "goblin" ? .72 : .9, e.z, e.kind === "goblin" ? .42 : .55);
			if (t > .2 && t < bestT) {
				bestT = t;
				hit = e;
			}
		}
		burst(_pos.x + _dir.x * bestT, _pos.y + _dir.y * bestT, _pos.z + _dir.z * bestT, hit ? 8 : 4, hit ? 2.4 : 1.6);
		if (hit) {
			hit.hp -= 1;
			hit.flash = .12;
			hit.alert = true;
			hit.memory = 2.4;
			hitMarker = .12;
			audio.hit();
			if (hit.hp <= 0) killEnemy(hit);
		} else audio.impact();
		for (const e of enemies) {
			if (!e.alive) continue;
			if (Math.hypot(e.x - x, e.z - z) < 8) {
				e.alert = true;
				e.memory = Math.max(e.memory, 2);
			}
		}
		if (mag === 0 && reserve > 0) {
			reloading = true;
			reloadT = .9;
		}
		push(true);
	}
	function nearest() {
		let bestI = -1;
		let bestKind = "chest";
		let bestD = Infinity;
		for (let i = 0; i < chests.length; i++) {
			const c = chests[i];
			if (!c.loot.length) continue;
			const d = Math.hypot(x - c.wx, z - c.wz);
			if (d <= 1.8 && d < bestD) {
				bestD = d;
				bestI = i;
				bestKind = "chest";
			}
		}
		for (let i = 0; i < maze.gates.length; i++) {
			if (gatesOpen[i]) continue;
			const g = maze.gates[i];
			const d = Math.hypot(x - (g.x + .5) * CELL, z - (g.z + .5) * CELL);
			if (d <= 2.55 && d < bestD) {
				bestD = d;
				bestI = i;
				bestKind = "gate";
			}
		}
		if (bestI < 0) return null;
		return {
			kind: bestKind,
			i: bestI
		};
	}
	function interact() {
		const target = nearest();
		if (!target) return;
		if (target.kind === "chest") {
			const chest = chests[target.i];
			const left = [];
			let moved = 0;
			for (const loot of chest.loot) {
				const slot = firstEmpty();
				if (slot < 0) {
					left.push(loot);
					continue;
				}
				slots[slot] = makeItem(loot);
				moved++;
			}
			chest.loot = left;
			chest.opened = true;
			if (moved) {
				audio.chest();
				burst(chest.wx, .7, chest.wz, 6, 1.5);
				say(left.length ? "Pack is full — drag something out" : "The chest creaks open");
			} else say("Pack is full — drag something out");
			push(true);
			return;
		}
		const gate = maze.gates[target.i];
		const si = slots.findIndex((s) => s && s.kind === "key" && s.keyColor === gate.keyColor);
		if (si < 0) {
			audio.empty();
			say(`Needs a ${(gate.keyColor[0].toUpperCase() + gate.keyColor.slice(1)).toLowerCase()} key`);
			push(true);
			return;
		}
		slots[si] = null;
		gatesOpen[target.i] = true;
		audio.gate();
		say(`${gate.keyColor[0].toUpperCase() + gate.keyColor.slice(1)} gate unlocks`);
		push(true);
	}
	function pollEdges() {
		const press = (code) => keys.has(code) && !prevKeys.has(code);
		if (press("Space")) jumpEdge = true;
		if (press("KeyE")) useEdge = true;
		if (press("KeyR")) reloadEdge = true;
		if (press("KeyF")) torchEdge = true;
		if (press("Tab") || press("KeyQ")) invEdge = true;
		if (press("Escape")) pauseEdge = true;
		for (let i = 0; i < 8; i++) if (press(`Digit${i + 1}`)) useSlot = i;
		prevKeys = new Set(keys);
	}
	function pollGamepad(frameDt) {
		const pads = navigator.getGamepads?.();
		if (!pads) return;
		let stickX = 0;
		let stickY = 0;
		let lookX = 0;
		let lookY = 0;
		let fire = false;
		let jump = false;
		let use = false;
		let reload = false;
		for (const pad of pads) {
			if (!pad) continue;
			const move = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
			stickX += move.x;
			stickY += -move.y;
			const look = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, .2);
			lookX += look.x;
			lookY += look.y;
			fire = fire || (pad.buttons[7]?.value ?? 0) > .45 || !!pad.buttons[5]?.pressed;
			jump = jump || !!pad.buttons[0]?.pressed;
			use = use || !!pad.buttons[2]?.pressed;
			reload = reload || !!pad.buttons[1]?.pressed;
		}
		touchX += stickX;
		touchY += stickY;
		if (phase === "play") {
			yaw -= lookX * 1.8 * frameDt;
			pitch -= lookY * 1.35 * frameDt;
		}
		if (fire && !padFire) attackEdge = true;
		if (jump && !padJump) jumpEdge = true;
		if (use && !padUse) useEdge = true;
		if (reload && !padReload) reloadEdge = true;
		padFire = fire;
		padJump = jump;
		padUse = use;
		padReload = reload;
	}
	function tick(dt, first) {
		if (first) {
			if (useSlot >= 0 && (phase === "play" || phase === "inventory")) useItem(useSlot);
			useSlot = -1;
			if (invEdge) {
				invEdge = false;
				if (phase === "play" || phase === "paused") {
					phase = "inventory";
					if (document.pointerLockElement) document.exitPointerLock();
					push(true);
				} else if (phase === "inventory") {
					phase = "play";
					push(true);
				}
			}
			if (pauseEdge) {
				pauseEdge = false;
				if (phase === "play") {
					phase = "paused";
					if (document.pointerLockElement) document.exitPointerLock();
					push(true);
				} else if (phase === "paused" || phase === "inventory") {
					phase = "play";
					push(true);
				}
			}
			if (torchEdge) {
				torchEdge = false;
				if (phase === "play") {
					torchOn = !torchOn;
					say(torchOn ? "Torch up" : "Torch low", .7);
					push(true);
				}
			}
		}
		toastT = Math.max(0, toastT - dt);
		hurtFlash = Math.max(0, hurtFlash - dt * 1.7);
		hitMarker = Math.max(0, hitMarker - dt);
		fullCd = Math.max(0, fullCd - dt);
		if (phase !== "play") {
			if (first) {
				attackEdge = false;
				jumpEdge = false;
				useEdge = false;
				reloadEdge = false;
			}
			vx = 0;
			vz = 0;
			return;
		}
		clock += dt;
		playTime += dt;
		iframe = Math.max(0, iframe - dt);
		fireCd = Math.max(0, fireCd - dt);
		recoilKick *= Math.exp(-12 * dt);
		gunKick = Math.max(0, gunKick - dt * 7);
		shake = Math.max(0, shake - dt * 1.6);
		muzzle = Math.max(0, muzzle - dt);
		if (reloading) {
			reloadT -= dt;
			if (reloadT <= 0) {
				const n = Math.min(8 - mag, reserve);
				mag += n;
				reserve -= n;
				reloading = false;
				audio.reload();
				push(true);
			}
		}
		let mx = touchX;
		let my = touchY;
		if (keys.has("KeyW") || keys.has("ArrowUp")) my += 1;
		if (keys.has("KeyS") || keys.has("ArrowDown")) my -= 1;
		if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
		if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
		const magMove = Math.hypot(mx, my);
		if (magMove > 1) {
			mx /= magMove;
			my /= magMove;
		}
		const fx = -Math.sin(yaw);
		const fz = -Math.cos(yaw);
		const rx = Math.cos(yaw);
		const rz = -Math.sin(yaw);
		const speed = slowed ? 1.62 : 4.85;
		const rate = 1 - Math.exp(-(grounded ? 24 : 6.5) * dt);
		vx += (fx * my * speed + rx * mx * speed - vx) * rate;
		vz += (fz * my * speed + rz * mx * speed - vz) * rate;
		const nx = x + vx * dt;
		if (!blocked(nx, z, RADIUS)) x = nx;
		else vx = 0;
		const nz = z + vz * dt;
		if (!blocked(x, nz, RADIUS)) z = nz;
		else vz = 0;
		if (jumpEdge || jumpBuf > 0) jumpBuf = Math.max(jumpBuf, .12);
		jumpBuf = Math.max(0, jumpBuf - dt);
		if (!grounded) coyote = Math.max(0, coyote - dt);
		if (jumpBuf > 0 && (grounded || coyote > 0)) {
			vy = 6.5;
			grounded = false;
			coyote = 0;
			jumpBuf = 0;
			audio.jump();
		}
		vy -= 19.5 * dt;
		y += vy * dt;
		if (y <= 0) {
			y = 0;
			vy = 0;
			if (!grounded) grounded = true;
			grounded = true;
			coyote = .12;
		} else grounded = false;
		const moving = grounded && Math.hypot(vx, vz) > .55;
		if (moving) bobPhase += Math.hypot(vx, vz) * dt * 2.15;
		const targetBob = moving && !reduced ? Math.sin(bobPhase) * .045 : 0;
		bobY += (targetBob - bobY) * (1 - Math.exp(-10 * dt));
		if (moving) {
			stepAcc += Math.hypot(vx, vz) * dt;
			if (stepAcc > 2.05) {
				stepAcc = 0;
				audio.step();
			}
		}
		for (const spike of spikes) {
			const on = y < .55 && Math.hypot(x - spike.x, z - spike.z) < .72;
			if (spike.state === "idle") {
				if (on) {
					spike.state = "windup";
					spike.t = .18;
					spike.hit = false;
				}
			} else {
				spike.t -= dt;
				if (spike.t <= 0) {
					if (spike.state === "windup") {
						spike.state = "up";
						spike.t = .42;
						if (on && !spike.hit) {
							spike.hit = true;
							hurt(2, {
								iframe: true,
								text: "Spikes — 1 heart",
								sx: spike.x,
								sz: spike.z,
								knock: true
							});
							if (phase !== "play") return;
						}
					} else if (spike.state === "up") {
						spike.state = "down";
						spike.t = .28;
					} else spike.state = "idle";
				}
			}
			const targetY = spike.state === "up" ? .18 : spike.state === "windup" ? -.42 : -.75;
			spike.spikes.position.y += (targetY - spike.spikes.position.y) * (1 - Math.exp(-16 * dt));
		}
		const period = 2.7;
		for (const fire of fires) {
			const t = (clock + fire.phase) % period;
			const active = t > 2.2;
			const warning = !active && t > 1.7500000000000002;
			const burstId = Math.floor((clock + fire.phase) / period);
			fire.mat.opacity = active ? .95 : warning ? .45 : .16;
			const s = active ? 1 : warning ? .38 : .14;
			for (const cone of fire.cones) cone.scale.set(1, s, 1);
			const on = y < 1.35 && Math.hypot(x - fire.x, z - fire.z) < .78;
			if (active && on && fire.lastBurst !== burstId) {
				fire.lastBurst = burstId;
				hurt(2, {
					iframe: true,
					text: "Fire — 1 heart",
					sx: fire.x,
					sz: fire.z,
					knock: true
				});
				if (phase !== "play") return;
			}
		}
		let inSlime = false;
		if (y < .34) {
			for (const slime of slimes) if (Math.hypot(x - slime.x, z - slime.z) < 1.02) inSlime = true;
		}
		slowed = inSlime;
		if (inSlime) {
			slimeAcc += dt;
			if (slimeAcc >= 1) {
				slimeAcc -= 1;
				hurt(1, {
					iframe: false,
					text: "Slime — ½ heart"
				});
				if (phase !== "play") return;
			}
		} else slimeAcc = Math.max(0, slimeAcc - dt);
		for (let i = 0; i < gems.length; i++) {
			const gem = gems[i];
			if (!gem.alive) continue;
			if (Math.hypot(x - gem.mesh.position.x, z - gem.mesh.position.z) < .95) {
				gem.alive = false;
				gem.mesh.visible = false;
				gemsGot++;
				audio.gem();
				push(true);
			}
		}
		for (const drop of loose) {
			if (!drop.alive) continue;
			if (Math.hypot(x - drop.x, z - drop.z) < 1) {
				drop.alive = false;
				drop.mesh.visible = false;
				reserve += drop.rounds;
				audio.pickup();
				say(`+${drop.rounds} rounds`);
				push(true);
			}
		}
		for (let i = drops.length - 1; i >= 0; i--) {
			const drop = drops[i];
			if (Math.hypot(x - drop.x, z - drop.z) > 1.05) continue;
			const slot = firstEmpty();
			if (slot < 0) {
				if (fullCd <= 0) {
					fullCd = 1.4;
					say("Pack is full");
					push(true);
				}
				continue;
			}
			slots[slot] = drop.item;
			scene.remove(drop.mesh);
			drops.splice(i, 1);
			audio.pickup();
			say(drop.item.name);
			push(true);
		}
		for (const e of enemies) {
			if (!e.alive) continue;
			const edist = Math.hypot(e.x - x, e.z - z);
			if (edist < (e.kind === "goblin" ? 11 : 12.5) && los(e.x, e.z, x, z)) {
				e.alert = true;
				e.memory = 2.3;
			} else {
				e.memory -= dt;
				if (e.memory <= 0) e.alert = false;
			}
			e.think -= dt;
			e.attackCd = Math.max(0, e.attackCd - dt);
			if (e.think <= 0) {
				e.think = .34;
				if (e.alert) e.path = bfs(Math.floor(e.x / 3.25), Math.floor(e.z / 3.25), Math.floor(x / 3.25), Math.floor(z / 3.25)) ?? [];
				else e.path = [];
			}
			if (e.alert && edist > 1.15) {
				let tx = x;
				let tz = z;
				if (e.path.length) {
					const ecx = Math.floor(e.x / CELL);
					const ecz = Math.floor(e.z / CELL);
					if (e.path[0] && e.path[0].x === ecx && e.path[0].z === ecz) e.path.shift();
					const n = e.path[0];
					if (n) {
						tx = (n.x + .5) * CELL;
						tz = (n.z + .5) * CELL;
					}
				}
				const dx = tx - e.x;
				const dz = tz - e.z;
				const len = Math.hypot(dx, dz) || 1;
				const sp = (e.kind === "goblin" ? 2.55 : 1.82) * dt;
				const mxE = dx / len * sp;
				const mzE = dz / len * sp;
				if (!blocked(e.x + mxE, e.z, .32)) e.x += mxE;
				if (!blocked(e.x, e.z + mzE, .32)) e.z += mzE;
			}
			const range = e.kind === "goblin" ? 1.38 : 1.55;
			if (e.alert && edist < range && e.attackCd <= 0 && e.windup <= 0) {
				e.windup = e.kind === "goblin" ? .22 : .36;
				e.attackCd = e.kind === "goblin" ? 1.05 : 1.35;
			}
			if (e.windup > 0) {
				e.windup -= dt;
				if (e.windup <= 0) {
					if (Math.hypot(e.x - x, e.z - z) < (e.kind === "goblin" ? 1.55 : 1.75) && y < .5 && los(e.x, e.z, x, z)) {
						if (e.kind === "goblin") hurt(1, {
							iframe: true,
							text: "Goblin — ½ heart",
							sx: e.x,
							sz: e.z,
							knock: true
						});
						else hurt(2, {
							iframe: true,
							text: "Orc — 1 heart",
							sx: e.x,
							sz: e.z,
							knock: true
						});
						if (phase !== "play") return;
					}
				}
			}
			e.flash = Math.max(0, e.flash - dt);
			if (e.windup > 0) e.skin.emissive.setHex(14914106);
			else if (e.flash > 0) e.skin.emissive.setHex(16774890);
			else e.skin.emissive.setHex(0);
			e.skin.emissiveIntensity = e.windup > 0 || e.flash > 0 ? .65 : 0;
			const ratio = Math.max(.02, e.hp / e.max);
			e.fill.scale.x = ratio;
			e.fill.position.x = -.24 * (1 - ratio);
			e.bar.visible = e.hp < e.max;
			const bob = Math.sin(clock * (e.kind === "goblin" ? 8 : 5.5) + e.yaw) * (e.alert ? .04 : .015);
			e.group.position.set(e.x, bob, e.z);
			if (e.alert) e.group.lookAt(x, bob, z);
			else e.group.rotation.set(0, e.yaw, 0);
		}
		for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
			const a = enemies[i];
			const b = enemies[j];
			if (!a.alive || !b.alive) continue;
			const dx = b.x - a.x;
			const dz = b.z - a.z;
			const d = Math.hypot(dx, dz);
			if (d > .001 && d < .85) {
				const pushAmt = (.85 - d) * .5;
				const nxE = dx / d * pushAmt;
				const nzE = dz / d * pushAmt;
				if (!blocked(a.x - nxE, a.z - nzE, .3)) {
					a.x -= nxE;
					a.z -= nzE;
				}
				if (!blocked(b.x + nxE, b.z + nzE, .3)) {
					b.x += nxE;
					b.z += nzE;
				}
			}
		}
		const ex = (maze.exit.x + .5) * CELL;
		const ez = (maze.exit.z + .5) * CELL;
		if (Math.hypot(x - ex, z - ez) < .85 && y < .45) {
			phase = "won";
			audio.win();
			if (document.pointerLockElement) document.exitPointerLock();
			say("You found the way out", 2);
			push(true);
			return;
		}
		reveal(x, z);
		const target = nearest();
		let nextNear = "";
		if (target?.kind === "chest") nextNear = "Open chest";
		else if (target?.kind === "gate") {
			const g = maze.gates[target.i];
			const has = slots.some((s) => s && s.kind === "key" && s.keyColor === g.keyColor);
			const label = g.keyColor[0].toUpperCase() + g.keyColor.slice(1);
			nextNear = has ? `Unlock ${label.toLowerCase()} gate` : `${label} gate is locked`;
		}
		if (nextNear !== near) {
			near = nextNear;
			push(true);
		}
		if (first && attackEdge) {
			attackEdge = false;
			if (fireCd <= 0) shoot();
		}
		if (first && useEdge) {
			useEdge = false;
			interact();
		}
		if (first && reloadEdge) {
			reloadEdge = false;
			if (!reloading && mag < 8 && reserve > 0) {
				reloading = true;
				reloadT = .9;
			}
		}
		if (first) jumpEdge = false;
		for (const c of chests) {
			if (c.opened) c.anim += (1 - c.anim) * (1 - Math.exp(-8 * dt));
			c.lid.rotation.x = -c.anim * 1.35;
		}
		gateGroups.forEach((g, i) => {
			const want = gatesOpen[i] ? 1 : 0;
			g.anim += (want - g.anim) * (1 - Math.exp(-7 * dt));
			g.group.position.y = -g.anim * 2.75;
		});
		for (const p of parts) {
			if (p.life <= 0) continue;
			p.life -= dt;
			p.v.y -= 8 * dt;
			p.mesh.position.addScaledVector(p.v, dt);
			if (p.life <= 0) p.mesh.visible = false;
		}
		snapAcc += dt;
		if (snapAcc >= .12) push(true);
	}
	function drawMap() {
		if (!mapCtx) return;
		const S = 192;
		mapCtx.fillStyle = "#241f1a";
		mapCtx.fillRect(0, 0, S, S);
		const pad = 8;
		const cw = 176 / W;
		for (let gz = 0; gz < H; gz++) for (let gx = 0; gx < W; gx++) {
			if (!explored[gz * W + gx]) continue;
			mapCtx.fillStyle = grid[gz * W + gx] ? "#d9c6b0" : "#2c261f";
			mapCtx.fillRect(pad + gx * cw, pad + gz * cw, cw + .6, cw + .6);
		}
		for (let i = 0; i < maze.gates.length; i++) {
			const g = maze.gates[i];
			if (!explored[g.z * W + g.x]) continue;
			mapCtx.fillStyle = gatesOpen[i] ? "#3a332c" : g.keyColor === "gold" ? "#e6c15a" : g.keyColor === "silver" ? "#f6efe4" : "#e3923a";
			mapCtx.fillRect(pad + g.x * cw + cw * .15, pad + g.z * cw + cw * .4, cw * .7, cw * .22);
		}
		mapCtx.fillStyle = "#e3923a";
		for (const c of chests) {
			const cx = Math.floor(c.wx / CELL);
			const cz = Math.floor(c.wz / CELL);
			if (!c.loot.length || !explored[cz * W + cx]) continue;
			mapCtx.fillRect(pad + cx * cw + cw * .35, pad + cz * cw + cw * .35, cw * .3, cw * .3);
		}
		if (explored[maze.exit.z * W + maze.exit.x]) {
			mapCtx.fillStyle = "#d4533c";
			mapCtx.fillRect(pad + maze.exit.x * cw + 1.5, pad + maze.exit.z * cw + 1.5, cw - 3, cw - 3);
		}
		const px = pad + x / CELL * cw;
		const py = pad + z / CELL * cw;
		const fwx = -Math.sin(yaw);
		const fwz = -Math.cos(yaw);
		mapCtx.save();
		mapCtx.translate(px, py);
		mapCtx.rotate(Math.atan2(fwx, -fwz));
		mapCtx.fillStyle = "#e3923a";
		mapCtx.beginPath();
		mapCtx.moveTo(0, -5.5);
		mapCtx.lineTo(4.2, 4.5);
		mapCtx.lineTo(-4.2, 4.5);
		mapCtx.closePath();
		mapCtx.fill();
		mapCtx.restore();
	}
	function render(frameDt) {
		const now = performance.now() / 1e3;
		for (let i = 0; i < gems.length; i++) {
			const gem = gems[i];
			if (!gem.alive) continue;
			gem.mesh.rotation.y = now * 1.5 + i;
			gem.mesh.position.y = .58 + Math.sin(now * 2.2 + i) * .08;
		}
		for (let i = 0; i < drops.length; i++) {
			const drop = drops[i];
			drop.mesh.position.y = .36 + Math.sin(now * 2.4 + i) * .06;
			drop.mesh.rotation.y = now;
		}
		for (const a of loose) {
			if (!a.alive) continue;
			a.mesh.rotation.y = now * 1.2;
			a.mesh.position.y = .2 + Math.sin(now * 3 + a.x) * .04;
		}
		for (const slime of slimes) slime.bubbles.forEach((b, i) => {
			b.position.y = .16 + Math.sin(now * 3 + i) * .04;
		});
		veil.position.y = 1.15;
		const flick = torchOn ? 1 + Math.sin(now * 17) * .05 + Math.sin(now * 29) * .03 : .08;
		gunSwayX += (-aimDx * .0011 - gunSwayX) * .28;
		gunSwayY += (aimDy * 7e-4 - gunSwayY) * .28;
		torchLight.intensity = 14 * flick;
		torchLight.position.set(x, y + 1.35, z);
		muzzleLight.intensity = muzzle > 0 ? 16 : 0;
		flame.scale.set(1, torchOn ? .85 + Math.sin(now * 23) * .18 : .2, 1);
		flame.visible = true;
		const bobX = movingNow() && !reduced ? Math.cos(bobPhase * .5) * .012 : 0;
		gun.position.x = .28 + bobX + Math.max(-.05, Math.min(.05, gunSwayX));
		gun.position.y = -.26 - (movingNow() ? Math.abs(Math.sin(bobPhase)) * .012 : 0) + Math.max(-.04, Math.min(.04, gunSwayY));
		gun.position.z = -.5 + gunKick * .07;
		gun.rotation.x = -recoilKick * .8;
		gun.rotation.z = reloading ? Math.sin((1 - reloadT / .9) * Math.PI) * .45 : 0;
		flash.visible = muzzle > .01;
		flash.scale.setScalar(.6 + muzzle * 18);
		torch.position.y = -.28 + (movingNow() ? Math.sin(bobPhase + 1) * .01 : 0);
		syncRig();
		drawMap();
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (w > 2 && h > 2) {
			const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
			if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
				renderer.setPixelRatio(dpr);
				renderer.setSize(w, h, false);
				camera.aspect = w / Math.max(1, h);
				camera.updateProjectionMatrix();
				viewCam.aspect = camera.aspect;
				viewCam.updateProjectionMatrix();
			}
			renderer.clear();
			renderer.render(scene, camera);
			renderer.clearDepth();
			renderer.render(viewScene, viewCam);
		}
	}
	function movingNow() {
		return grounded && Math.hypot(vx, vz) > .55 && phase === "play";
	}
	const BLOCK = /* @__PURE__ */ new Set([
		"Space",
		"ArrowUp",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"Tab",
		"KeyW",
		"KeyA",
		"KeyS",
		"KeyD"
	]);
	function onKeyDown(e) {
		if (e.repeat) return;
		scripted = false;
		keys.add(e.code);
		if (BLOCK.has(e.code)) e.preventDefault();
	}
	function onKeyUp(e) {
		if (scripted) return;
		keys.delete(e.code);
	}
	function onBlur() {
		if (!scripted) keys.clear();
	}
	function onVis() {
		if (document.hidden) {
			if (!scripted) keys.clear();
			audio.suspend();
		} else {
			last = performance.now();
			audio.resume();
		}
	}
	function onMouseMove(e) {
		if (document.pointerLockElement !== canvas || phase !== "play") return;
		lookDx += e.movementX;
		lookDy += e.movementY;
	}
	function onMouseDown(e) {
		if (e.button !== 0) return;
		if (document.pointerLockElement === canvas && phase === "play") attackEdge = true;
	}
	function onLockChange() {
		locked = document.pointerLockElement === canvas;
		push(true);
	}
	function onContext(e) {
		e.preventDefault();
	}
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("blur", onBlur);
	document.addEventListener("visibilitychange", onVis);
	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mousedown", onMouseDown);
	document.addEventListener("pointerlockchange", onLockChange);
	canvas.addEventListener("contextmenu", onContext);
	let raf = 0;
	let last = performance.now();
	let acc = 0;
	function frame(now) {
		if (disposed) return;
		frames++;
		let raw = (now - last) / 1e3;
		last = now;
		if (document.hidden) raw = 0;
		else if (raw > .1) raw = .1;
		const frameDt = Math.max(0, raw);
		acc += frameDt;
		pollEdges();
		const tx = touchX;
		const ty = touchY;
		pollGamepad(frameDt);
		if (phase === "play" && !scripted) {
			const cap = 120;
			const dx = Math.max(-120, Math.min(cap, lookDx));
			const dy = Math.max(-120, Math.min(cap, lookDy));
			yaw -= dx * .00235;
			pitch -= dy * .00235;
			const lim = Math.PI / 2 - .04;
			if (pitch > lim) pitch = lim;
			if (pitch < -lim) pitch = -lim;
		}
		let first = true;
		let steps = 0;
		while (acc >= STEP && steps < 6) {
			tick(STEP, first);
			first = false;
			steps++;
			acc -= STEP;
		}
		aimDx = lookDx;
		aimDy = lookDy;
		lookDx = 0;
		lookDy = 0;
		touchX = tx;
		touchY = ty;
		render(frameDt);
		raf = requestAnimationFrame(frame);
	}
	resetRuntime();
	const getYaw = () => yaw;
	const getSpeed = () => Math.hypot(vx, vz);
	const getPos = () => ({
		x,
		y,
		z
	});
	window.__controlsTest = {
		getYaw,
		getSpeed,
		getPos,
		getFrames: () => frames,
		getHeld: () => [...keys],
		setKeys(codes) {
			scripted = true;
			keys.clear();
			for (const code of codes) keys.add(code);
		},
		faceSpawn() {
			yaw = startYaw;
			pitch = 0;
		}
	};
	const owned = token;
	window.__lanternToken = owned;
	push(true);
	onReady();
	raf = requestAnimationFrame(frame);
	return {
		start() {
			audio.unlock();
			if (phase !== "menu") return;
			phase = "play";
			push(true);
		},
		restart() {
			audio.unlock();
			resetRuntime();
			phase = "play";
			push(true);
		},
		resume() {
			if (phase === "paused" || phase === "inventory") {
				phase = "play";
				push(true);
			}
		},
		setInventory(open) {
			if (open && (phase === "play" || phase === "paused")) {
				phase = "inventory";
				if (document.pointerLockElement) document.exitPointerLock();
				push(true);
			} else if (!open && phase === "inventory") {
				phase = "play";
				push(true);
			}
		},
		useItem,
		moveItem,
		dropItem,
		toggleTorch() {
			torchOn = !torchOn;
			say(torchOn ? "Torch up" : "Torch low", .7);
			push(true);
		},
		setMove(mx, my) {
			touchX = mx;
			touchY = my;
		},
		addLook(dx, dy) {
			lookDx += dx * 2.15;
			lookDy += dy * 2.15;
		},
		pokeAttack() {
			if (phase === "play") attackEdge = true;
		},
		pokeJump() {
			if (phase === "play") jumpEdge = true;
		},
		pokeUse() {
			if (phase === "play") useEdge = true;
		},
		dispose() {
			disposed = true;
			cancelAnimationFrame(raf);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onBlur);
			document.removeEventListener("visibilitychange", onVis);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mousedown", onMouseDown);
			document.removeEventListener("pointerlockchange", onLockChange);
			canvas.removeEventListener("contextmenu", onContext);
			const dumped = /* @__PURE__ */ new Set();
			scene.traverse((obj) => {
				const mesh = obj;
				if (mesh.geometry && !dumped.has(mesh.geometry)) {
					dumped.add(mesh.geometry);
					mesh.geometry.dispose();
				}
				const mats = mesh.material;
				const list = Array.isArray(mats) ? mats : mats ? [mats] : [];
				for (const mat of list) if (!dumped.has(mat)) {
					dumped.add(mat);
					mat.dispose();
				}
			});
			viewScene.traverse((obj) => {
				const mesh = obj;
				if (mesh.geometry && !dumped.has(mesh.geometry)) {
					dumped.add(mesh.geometry);
					mesh.geometry.dispose();
				}
				const mats = mesh.material;
				const list = Array.isArray(mats) ? mats : mats ? [mats] : [];
				for (const mat of list) if (!dumped.has(mat)) {
					dumped.add(mat);
					mat.dispose();
				}
			});
			renderer.dispose();
			const holder = window;
			if (holder.__lanternToken === owned) {
				delete window.__controlsTest;
				delete holder.__lanternToken;
			}
		}
	};
}
//#endregion
export { mountGame };
