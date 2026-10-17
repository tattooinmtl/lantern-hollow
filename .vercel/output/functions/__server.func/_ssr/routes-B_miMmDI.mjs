import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Flame, i as FlaskConical, n as KeyRound, o as Boxes, r as Gem, s as Backpack } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B_miMmDI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BEST_KEY = "lantern-hollow-v1";
var HEART = "M12 20.6s-6.9-4.3-9.2-8.2C1.2 9.7 1.7 6.4 4.3 5c2-1.1 4.2-.4 5.6 1.5L12 8.7l2.1-2.2C15.5 4.6 17.7 3.9 19.7 5c2.6 1.4 3.1 4.7 1.5 7.4-2.3 3.9-9.2 8.2-9.2 8.2z";
var EMPTY = {
	phase: "menu",
	hp: 10,
	mag: 8,
	reserve: 0,
	reload: 0,
	time: 0,
	gems: 0,
	gemsTotal: 0,
	kills: 0,
	slots: Array.from({ length: 8 }, () => null),
	toast: "",
	torch: true,
	slowed: false,
	hurt: 0,
	hit: 0,
	near: "",
	seed: 0,
	locked: false,
	error: ""
};
function readBest() {
	try {
		const raw = localStorage.getItem(BEST_KEY);
		if (!raw) return null;
		const n = Number(JSON.parse(raw).best);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}
function writeBest(time) {
	try {
		const prev = readBest();
		if (prev == null || time < prev) localStorage.setItem(BEST_KEY, JSON.stringify({
			v: 1,
			best: time
		}));
	} catch {}
}
function formatTime(t) {
	return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
}
function heartsLabel(hp) {
	const n = hp / 2;
	return Number.isInteger(n) ? `${n}` : `${Math.floor(n)}½`;
}
function Hearts({ hp }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex gap-1",
		role: "img",
		"aria-label": `${heartsLabel(hp)} of 5 hearts`,
		children: Array.from({ length: 5 }, (_, i) => {
			const left = hp - i * 2;
			const fill = left >= 2 ? 1 : left >= 1 ? .5 : 0;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				className: "h-6 w-6",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("clipPath", {
						id: `lh-heart-${i}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: "0",
							y: "0",
							width: "12",
							height: "24"
						})
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: HEART,
						fill: "var(--color-border)"
					}),
					fill > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: HEART,
						fill: "var(--color-danger)",
						clipPath: fill === .5 ? `url(#lh-heart-${i})` : void 0
					}) : null
				]
			}, i);
		})
	});
}
function ItemGlyph({ item }) {
	if (item.kind === "key") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: item.keyColor === "silver" ? "text-fg" : "text-accent" });
	if (item.kind === "potion") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlaskConical, { className: "text-danger" });
	if (item.kind === "ammo") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boxes, { className: "text-accent" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gem, { className: "text-fg" });
}
function Joystick({ onChange }) {
	const origin = (0, import_react.useRef)(null);
	const [knob, setKnob] = (0, import_react.useState)({
		x: 0,
		y: 0
	});
	function down(e) {
		e.stopPropagation();
		e.currentTarget.setPointerCapture(e.pointerId);
		origin.current = {
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY
		};
	}
	function move(e) {
		if (!origin.current || origin.current.id !== e.pointerId) return;
		let dx = e.clientX - origin.current.x;
		let dy = e.clientY - origin.current.y;
		const m = Math.hypot(dx, dy);
		const max = 42;
		if (m > max) {
			dx = dx / m * max;
			dy = dy / m * max;
		}
		setKnob({
			x: dx,
			y: dy
		});
		onChange(dx / max, -dy / max);
	}
	function up(e) {
		if (origin.current?.id !== e.pointerId) return;
		origin.current = null;
		setKnob({
			x: 0,
			y: 0
		});
		onChange(0, 0);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "stick",
		"data-ui": true,
		onPointerDown: down,
		onPointerMove: move,
		onPointerUp: up,
		onPointerCancel: up,
		"aria-label": "Move",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` } })
	});
}
function LanternApp() {
	const [seed, setSeed] = (0, import_react.useState)(20261013);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LanternSession, {
		seed,
		onNew: () => setSeed((s) => Math.imul(s ^ 2654435769, 1664525) + 1013904223 >>> 0)
	}, seed);
}
function LanternSession({ seed, onNew }) {
	const canvasRef = (0, import_react.useRef)(null);
	const mapRef = (0, import_react.useRef)(null);
	const handleRef = (0, import_react.useRef)(null);
	const panelRef = (0, import_react.useRef)(null);
	const phaseRef = (0, import_react.useRef)("menu");
	const pending = (0, import_react.useRef)(false);
	const lookId = (0, import_react.useRef)(null);
	const lookLast = (0, import_react.useRef)({
		x: 0,
		y: 0
	});
	const [snap, setSnap] = (0, import_react.useState)({
		...EMPTY,
		seed
	});
	const [ready, setReady] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [best, setBest] = (0, import_react.useState)(null);
	const [drag, setDrag] = (0, import_react.useState)(null);
	const savedWin = (0, import_react.useRef)(false);
	phaseRef.current = snap.phase;
	(0, import_react.useEffect)(() => {
		setBest(readBest());
	}, []);
	(0, import_react.useEffect)(() => {
		if (snap.phase === "won" && !savedWin.current) {
			savedWin.current = true;
			writeBest(snap.time);
			setBest(readBest());
		}
		if (snap.phase === "play") savedWin.current = false;
	}, [snap.phase, snap.time]);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		const minimap = mapRef.current;
		if (!canvas || !minimap) return;
		let dead = false;
		let handle = null;
		import("./engine-DNm9E2yx.mjs").then((mod) => {
			if (dead) return;
			handle = mod.mountGame({
				canvas,
				minimap,
				seed,
				onSnapshot: (next) => {
					if (!dead) setSnap(next);
				},
				onReady: () => {
					if (dead) return;
					setReady(true);
					if (pending.current) {
						pending.current = false;
						handle?.start();
						lock(canvas);
					}
				},
				onError: (message) => {
					if (!dead) setError(message);
				}
			});
			handleRef.current = handle;
		});
		return () => {
			dead = true;
			handle?.dispose();
			handleRef.current = null;
		};
	}, [seed]);
	function lock(target) {
		const canvas = target ?? canvasRef.current;
		if (!canvas?.requestPointerLock) return;
		try {
			const req = canvas.requestPointerLock({ unadjustedMovement: true });
			Promise.resolve(req).catch(() => {
				try {
					Promise.resolve(canvas.requestPointerLock()).catch(() => {});
				} catch {}
			});
		} catch {}
	}
	function onStart() {
		if (error) return;
		if (handleRef.current && ready) {
			handleRef.current.start();
			lock();
		} else pending.current = true;
	}
	function onRootPointerDown(e) {
		if (phaseRef.current !== "play") return;
		if (e.target?.closest?.("[data-ui]")) return;
		if (e.pointerType === "mouse") {
			if (e.button === 0) lock();
			return;
		}
		lookId.current = e.pointerId;
		lookLast.current = {
			x: e.clientX,
			y: e.clientY
		};
	}
	function onRootPointerMove(e) {
		if (lookId.current !== e.pointerId) return;
		const dx = e.clientX - lookLast.current.x;
		const dy = e.clientY - lookLast.current.y;
		lookLast.current = {
			x: e.clientX,
			y: e.clientY
		};
		handleRef.current?.addLook(dx, dy);
	}
	function onRootPointerUp(e) {
		if (lookId.current === e.pointerId) lookId.current = null;
	}
	function onSlotDown(e, index) {
		if (!snap.slots[index]) return;
		e.stopPropagation();
		e.currentTarget.setPointerCapture(e.pointerId);
		setDrag({
			index,
			x: e.clientX,
			y: e.clientY,
			ox: e.clientX,
			oy: e.clientY,
			moved: false
		});
	}
	function onSlotMove(e) {
		setDrag((current) => {
			if (!current) return current;
			const moved = current.moved || Math.hypot(e.clientX - current.ox, e.clientY - current.oy) > 8;
			return {
				...current,
				x: e.clientX,
				y: e.clientY,
				moved
			};
		});
	}
	function onSlotUp(e) {
		setDrag((current) => {
			if (!current) return null;
			const handle = handleRef.current;
			if (!current.moved) handle?.useItem(current.index);
			else {
				const panel = panelRef.current?.getBoundingClientRect();
				if (!(!!panel && e.clientX >= panel.left && e.clientX <= panel.right && e.clientY >= panel.top && e.clientY <= panel.bottom)) handle?.dropItem(current.index);
				else {
					const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-slot]");
					const to = slot instanceof HTMLElement ? Number(slot.dataset.slot) : NaN;
					if (Number.isInteger(to) && to !== current.index) handle?.moveItem(current.index, to);
				}
			}
			return null;
		});
	}
	const playing = snap.phase === "play";
	const relic = snap.slots.some((s) => s?.kind === "relic");
	const dragged = drag ? snap.slots[drag.index] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "game-root",
		onPointerDown: onRootPointerDown,
		onPointerMove: onRootPointerMove,
		onPointerUp: onRootPointerUp,
		onPointerCancel: onRootPointerUp,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "game-canvas"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vignette" }),
			snap.hurt > .02 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hurt-veil",
				style: { opacity: Math.min(.45, snap.hurt * .5) }
			}) : null,
			snap.slowed && playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "slime-veil" }) : null,
			playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `crosshair ${snap.hit > 0 ? "is-hit" : ""}`,
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "hud-top pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hearts, { hp: snap.hp }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								"aria-label": `${snap.mag} of 8 rounds, ${snap.reserve} spare`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex gap-1",
										children: Array.from({ length: 8 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 rounded-full ${i < snap.mag ? "bg-accent" : "bg-border"}` }, i))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-muted tabular-nums",
										children: snap.reserve
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, {
										className: `h-4 w-4 ${snap.torch ? "text-accent" : "text-muted"}`,
										"aria-hidden": true
									})
								]
							}),
							snap.reload > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-1 w-24 overflow-hidden rounded-full bg-border",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full bg-accent",
									style: { width: `${Math.round(snap.reload * 100)}%` }
								})
							}) : null,
							snap.slowed && playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-accent",
								children: "Slowed by slime"
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center gap-1 pt-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl tabular-nums text-fg",
							children: formatTime(snap.time)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-1 text-xs text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gem, {
									className: "h-3.5 w-3.5 text-accent",
									"aria-hidden": true
								}),
								snap.gems,
								"/",
								snap.gemsTotal || "–"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: mapRef,
						"data-ui": true,
						className: "minimap pointer-events-auto",
						"aria-label": "Explored maze"
					})
				]
			}),
			snap.toast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pointer-events-none absolute top-28 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-fg",
				"aria-live": "polite",
				children: snap.toast
			}) : null,
			playing && snap.near ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "near-prompt pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-fg",
				children: [snap.near, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "key-hints ml-2 text-muted",
					children: "E"
				})]
			}) : null,
			playing && !snap.locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "look-hint pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 translate-y-8 text-sm text-muted",
				children: "Click to look"
			}) : null,
			playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "touch-controls pointer-events-none absolute inset-x-0 bottom-4 z-10 items-end justify-between px-4 pb-[env(safe-area-inset-bottom)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Joystick, { onChange: (x, y) => {
					handleRef.current?.setMove(x, y);
				} }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto flex flex-col items-end gap-2",
					"data-ui": true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pad-btn",
							"aria-label": "Torch",
							onPointerDown: (e) => {
								e.stopPropagation();
								handleRef.current?.toggleTorch();
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-5 w-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pad-btn",
							"aria-label": "Pack",
							onPointerDown: (e) => {
								e.stopPropagation();
								handleRef.current?.setInventory(true);
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Backpack, { className: "h-5 w-5" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-end gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "pad-btn",
								"aria-label": "Jump",
								onPointerDown: (e) => {
									e.stopPropagation();
									handleRef.current?.pokeJump();
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "JUMP" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "pad-btn",
								"aria-label": "Use",
								onPointerDown: (e) => {
									e.stopPropagation();
									handleRef.current?.pokeUse();
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "USE" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "pad-btn primary",
								"aria-label": "Fire",
								onPointerDown: (e) => {
									e.stopPropagation();
									handleRef.current?.pokeAttack();
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "FIRE" })
							})
						]
					})]
				})]
			}) : null,
			playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "key-hints pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-xs text-muted",
				children: "WASD move · mouse look · Space jump · click fire · R reload · F torch · E use · Tab pack"
			}) : null,
			snap.phase === "menu" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-ui": true,
				className: "absolute inset-0 z-20 flex items-end justify-center p-4 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-h-[92dvh] w-full max-w-md overflow-auto rounded-2xl border border-border bg-surface p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-accent uppercase",
							children: "Pocket dungeon"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display mt-1 text-4xl leading-tight text-fg",
							children: "Lantern Hollow"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-muted",
							children: "A low-poly night maze. Five hearts, eight shots, and a torch that actually matters."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 space-y-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "w-16 shrink-0 text-muted",
										children: "Move"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "WASD and mouse. Space jumps. On a phone, stick and drag." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "w-16 shrink-0 text-muted",
										children: "Fight"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Handgun, 8 rounds. Goblins take half a heart, orcs a full one. Kills drop bullets." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "w-16 shrink-0 text-muted",
										children: "Pack"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Tab opens it. Click a brew to drink. Drag an item outside the pack to drop it." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "w-16 shrink-0 text-muted",
										children: "Traps"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "Spikes and fire take a heart. Slime slows you and sips half a heart a second." })]
								})
							]
						}),
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm text-danger",
							children: error
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg disabled:opacity-50",
							onClick: onStart,
							disabled: !!error,
							children: "Start"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-center text-xs text-muted",
							children: [
								"Hollow ",
								snap.seed || seed,
								best != null ? ` · best ${formatTime(best)}` : ""
							]
						})
					]
				})
			}) : null,
			snap.phase === "paused" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-ui": true,
				className: "absolute inset-0 z-20 flex items-center justify-center p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-3xl text-fg",
							children: "Paused"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm text-muted",
							children: [formatTime(snap.time), " in the dark"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg",
							onClick: () => {
								handleRef.current?.resume();
								lock();
							},
							children: "Resume"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 w-full rounded-full border border-border px-5 py-3 text-fg",
							onClick: () => handleRef.current?.setInventory(true),
							children: "Open pack"
						})
					]
				})
			}) : null,
			snap.phase === "inventory" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-20 flex items-center justify-center p-4",
				onPointerDown: (e) => {
					if (e.target === e.currentTarget && !drag) handleRef.current?.setInventory(false);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					"data-ui": true,
					className: "w-full max-w-md rounded-2xl border border-border bg-surface p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-2xl text-fg",
								children: "Pack"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "rounded-full border border-border px-4 py-2 text-sm text-fg",
								onClick: () => handleRef.current?.setInventory(false),
								children: "Close"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Click a brew or tin to use it. Drag outside this card to drop it on the floor."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 grid grid-cols-4 gap-2",
							children: snap.slots.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"data-slot": index,
								className: `pack-slot ${item ? "is-filled" : ""} ${drag?.index === index ? "opacity-40" : ""}`,
								onPointerDown: (e) => onSlotDown(e, index),
								onPointerMove: onSlotMove,
								onPointerUp: onSlotUp,
								onPointerCancel: onSlotUp,
								"aria-label": item ? item.name : "Empty slot",
								children: item ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemGlyph, { item }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs leading-tight text-fg",
									children: item.name
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted",
									children: "Empty"
								})
							}, item?.id ?? `empty-${index}`))
						})
					]
				})
			}) : null,
			drag && dragged ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none fixed z-30 flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-sm text-fg",
				style: {
					left: drag.x + 12,
					top: drag.y + 12
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemGlyph, { item: dragged }), dragged.name]
			}) : null,
			snap.phase === "dead" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-ui": true,
				className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/80 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-danger uppercase",
							children: "Down"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display mt-1 text-3xl text-fg",
							children: "The hollow keeps you"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm text-muted",
							children: [
								formatTime(snap.time),
								" · ",
								snap.gems,
								" gems · ",
								snap.kills,
								" felled"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg",
							onClick: () => handleRef.current?.restart(),
							children: "Try again"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 w-full rounded-full border border-border px-5 py-3 text-fg",
							onClick: onNew,
							children: "New hollow"
						})
					]
				})
			}) : null,
			snap.phase === "won" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-ui": true,
				className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/75 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-accent uppercase",
							children: "Out"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display mt-1 text-3xl text-fg",
							children: "You found the way out"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm text-fg",
							children: [
								formatTime(snap.time),
								" · ",
								heartsLabel(snap.hp),
								" hearts left"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [
								snap.gems,
								"/",
								snap.gemsTotal,
								" gems · ",
								snap.kills,
								" felled"
							]
						}),
						relic ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-accent",
							children: "The glass beetle came with you."
						}) : null,
						best != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-xs text-muted",
							children: ["Best descent ", formatTime(best)]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg",
							onClick: () => handleRef.current?.restart(),
							children: "Descend again"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-2 w-full rounded-full border border-border px-5 py-3 text-fg",
							onClick: onNew,
							children: "New hollow"
						})
					]
				})
			}) : null
		]
	});
}
var SplitComponent = LanternApp;
//#endregion
export { SplitComponent as component };
