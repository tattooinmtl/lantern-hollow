import type { KeyColor, LootTemplate } from "@/game/types"

export const CELL = 3.25

export type Maze = {
  seed: number
  w: number
  h: number
  grid: Uint8Array
  start: { x: number; z: number }
  startDir: { x: number; z: number }
  exit: { x: number; z: number }
  gates: { x: number; z: number; keyColor: KeyColor }[]
  chests: { x: number; z: number; ox: number; oz: number; loot: LootTemplate[] }[]
  spikes: { x: number; z: number }[]
  fires: { x: number; z: number; phase: number }[]
  slimes: { x: number; z: number }[]
  enemies: { x: number; z: number; kind: "goblin" | "orc" }[]
  gems: { x: number; z: number; ox: number; oz: number }[]
  ammo: { x: number; z: number; rounds: number }[]
}

const W = 15
const H = 15
const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function keyName(color: KeyColor) {
  if (color === "bronze") return "Bronze key"
  if (color === "silver") return "Silver key"
  return "Gold key"
}

function tryGenerate(seed: number): Maze | null {
  const rnd = mulberry32(seed)
  const grid = new Uint8Array(W * H)
  const at = (x: number, z: number) => z * W + x

  const stack: [number, number][] = [[1, 1]]
  grid[at(1, 1)] = 1
  const grow: [number, number][] = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ]

  while (stack.length) {
    const [x, z] = stack[stack.length - 1]!
    const opts: [number, number][] = []
    for (const [dx, dz] of grow) {
      const nx = x + dx
      const nz = z + dz
      if (nx > 0 && nz > 0 && nx < W - 1 && nz < H - 1 && grid[at(nx, nz)] === 0) {
        opts.push([dx, dz])
      }
    }
    if (!opts.length) {
      stack.pop()
      continue
    }
    const [dx, dz] = opts[(rnd() * opts.length) | 0]!
    grid[at(x + dx / 2, z + dz / 2)] = 1
    grid[at(x + dx, z + dz)] = 1
    stack.push([x + dx, z + dz])
  }

  const floors: number[] = []
  for (let i = 0; i < grid.length; i++) if (grid[i]) floors.push(i)

  const dist = new Int16Array(W * H).fill(-1)
  const parent = new Int32Array(W * H).fill(-1)
  const q: number[] = [at(1, 1)]
  dist[q[0]!] = 0
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi]!
    const x = i % W
    const z = (i / W) | 0
    for (const [dx, dz] of N4) {
      const nx = x + dx
      const nz = z + dz
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue
      const ni = at(nx, nz)
      if (!grid[ni] || dist[ni] !== -1) continue
      dist[ni] = (dist[i] ?? 0) + 1
      parent[ni] = i
      q.push(ni)
    }
  }

  let exitI = q[0]!
  for (const i of q) if ((dist[i] ?? 0) > (dist[exitI] ?? 0)) exitI = i

  const path: number[] = []
  for (let i = exitI; i !== -1; i = parent[i] ?? -1) path.push(i)
  path.reverse()
  if (path.length < 18) return null

  const startI = path[0]!
  const nextI = path[1]!
  const startDir = {
    x: (nextI % W) - (startI % W),
    z: ((nextI / W) | 0) - ((startI / W) | 0),
  }

  function neighbors(i: number) {
    const x = i % W
    const z = (i / W) | 0
    const out: number[] = []
    for (const [dx, dz] of N4) {
      const nx = x + dx
      const nz = z + dz
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue
      const ni = at(nx, nz)
      if (grid[ni]) out.push(ni)
    }
    return out
  }

  const gateIdx: number[] = []
  const usedPath = new Set<number>([0, path.length - 1])
  for (let g = 0; g < 3; g++) {
    const target = Math.round(path.length * (0.3 + g * 0.22))
    let chosen = -1
    for (let rad = 0; rad < path.length && chosen === -1; rad++) {
      const tries = rad === 0 ? [target] : [target + rad, target - rad]
      for (const idx of tries) {
        if (idx < 7 || idx > path.length - 4) continue
        if (usedPath.has(idx)) continue
        let separated = true
        for (const u of usedPath) {
          if (u !== 0 && u !== path.length - 1 && Math.abs(u - idx) < 4) separated = false
        }
        if (!separated) continue
        chosen = idx
        break
      }
    }
    if (chosen === -1) return null
    usedPath.add(chosen)
    gateIdx.push(chosen)
  }

  gateIdx.sort((a, b) => (dist[path[a]!] ?? 0) - (dist[path[b]!] ?? 0))
  const colors: KeyColor[] = ["bronze", "silver", "gold"]
  const gates: Maze["gates"] = gateIdx.map((idx, i) => {
    const cell = path[idx]!
    return { x: cell % W, z: (cell / W) | 0, keyColor: colors[i]! }
  })
  const gateSet = new Set(gates.map((g) => at(g.x, g.z)))

  const deadEnds = floors.filter((i) => {
    if (i === at(1, 1) || i === exitI || gateSet.has(i)) return false
    return neighbors(i).length === 1
  })

  function wallOffset(i: number) {
    const x = i % W
    const z = (i / W) | 0
    const opens = neighbors(i)
    if (opens.length === 1) {
      const ox = (opens[0]! % W) - x
      const oz = ((opens[0]! / W) | 0) - z
      return { ox: -ox, oz: -oz }
    }
    const walls: [number, number][] = []
    for (const [dx, dz] of N4) {
      const nx = x + dx
      const nz = z + dz
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || !grid[at(nx, nz)]) walls.push([dx, dz])
    }
    const pick = walls[(rnd() * walls.length) | 0] ?? [0, -1]
    return { ox: pick[0], oz: pick[1] }
  }

  const usedChest = new Set<number>()
  const chests: Maze["chests"] = []

  for (const gate of gates) {
    const gd = dist[at(gate.x, gate.z)] ?? 0
    const candidates = deadEnds
      .filter((i) => !usedChest.has(i) && (dist[i] ?? 0) < gd && (dist[i] ?? 0) > 1)
      .sort((a, b) => (dist[b] ?? 0) - (dist[a] ?? 0))
    let cell = candidates[0]
    if (cell === undefined) {
      const gi = path.indexOf(at(gate.x, gate.z))
      cell = path[Math.max(1, gi - 1)]
      if (cell === undefined || gateSet.has(cell) || cell === exitI) return null
    }
    usedChest.add(cell)
    const off = wallOffset(cell)
    const loot: LootTemplate[] = [{ kind: "key", keyColor: gate.keyColor, name: keyName(gate.keyColor) }]
    if (gate.keyColor === "bronze") loot.push({ kind: "potion", heal: 4, name: "Heartbrew" })
    if (gate.keyColor === "gold") loot.push({ kind: "relic", name: "Glass beetle" })
    chests.push({
      x: cell % W,
      z: (cell / W) | 0,
      ox: off.ox,
      oz: off.oz,
      loot,
    })
  }

  const extraLoot: LootTemplate[][] = [
    [{ kind: "potion", heal: 4, name: "Heartbrew" }],
    [{ kind: "ammo", rounds: 6, name: "Bullet tin" }],
    [{ kind: "potion", heal: 6, name: "Deep tonic" }],
    [{ kind: "potion", heal: 4, name: "Heartbrew" }],
    [{ kind: "ammo", rounds: 8, name: "Bullet tin" }],
    [{ kind: "potion", heal: 4, name: "Heartbrew" }],
  ]
  const extraCells = deadEnds
    .filter((i) => !usedChest.has(i))
    .sort((a, b) => (dist[a] ?? 0) - (dist[b] ?? 0))
  for (let i = 0; i < extraLoot.length && i < extraCells.length; i++) {
    const cell = extraCells[i]!
    usedChest.add(cell)
    const off = wallOffset(cell)
    chests.push({
      x: cell % W,
      z: (cell / W) | 0,
      ox: off.ox,
      oz: off.oz,
      loot: extraLoot[i]!,
    })
  }

  const occupied = new Set<number>([
    at(1, 1),
    exitI,
    ...gates.map((g) => at(g.x, g.z)),
    ...chests.map((c) => at(c.x, c.z)),
  ])
  for (const g of gates) {
    for (const [dx, dz] of N4) {
      const nx = g.x + dx
      const nz = g.z + dz
      if (nx >= 0 && nz >= 0 && nx < W && nz < H) occupied.add(at(nx, nz))
    }
  }

  function pool(minDist: number) {
    return floors.filter((i) => !occupied.has(i) && (dist[i] ?? 0) >= minDist)
  }

  function takeRandom(list: number[]) {
    if (!list.length) return undefined
    const idx = (rnd() * list.length) | 0
    const cell = list.splice(idx, 1)[0]!
    occupied.add(cell)
    return cell
  }

  const spikePool = pool(5)
  const spikes: Maze["spikes"] = []
  for (let i = 0; i < 3; i++) {
    const cell = takeRandom(spikePool)
    if (cell === undefined) break
    spikes.push({ x: cell % W, z: (cell / W) | 0 })
  }

  const firePool = pool(6)
  const fires: Maze["fires"] = []
  for (let i = 0; i < 2; i++) {
    const cell = takeRandom(firePool)
    if (cell === undefined) break
    fires.push({ x: cell % W, z: (cell / W) | 0, phase: rnd() * 2.7 })
  }

  const slimePool = pool(5)
  const slimes: Maze["slimes"] = []
  for (let i = 0; i < 2; i++) {
    const cell = takeRandom(slimePool)
    if (cell === undefined) break
    slimes.push({ x: cell % W, z: (cell / W) | 0 })
  }

  const enemyPool = pool(7)
  const enemies: Maze["enemies"] = []
  const plan: ("goblin" | "orc")[] = ["goblin", "goblin", "goblin", "orc", "orc"]
  for (const kind of plan) {
    let picked: number | undefined
    for (const space of [3, 0]) {
      for (let i = 0; i < enemyPool.length; i++) {
        const cell = enemyPool[i]!
        const x = cell % W
        const z = (cell / W) | 0
        let ok = true
        if (space > 0) {
          for (const e of enemies) {
            if (Math.max(Math.abs(e.x - x), Math.abs(e.z - z)) < space) ok = false
          }
        }
        if (!ok) continue
        enemyPool.splice(i, 1)
        occupied.add(cell)
        picked = cell
        break
      }
      if (picked !== undefined) break
    }
    if (picked === undefined) continue
    enemies.push({ x: picked % W, z: (picked / W) | 0, kind })
  }
  if (enemies.filter((e) => e.kind === "goblin").length < 2) return null
  if (!enemies.some((e) => e.kind === "orc")) return null

  const ammo: Maze["ammo"] = []
  const ammoPool = pool(4)
  for (let i = 0; i < 2; i++) {
    const cell = takeRandom(ammoPool)
    if (cell === undefined) break
    ammo.push({ x: cell % W, z: (cell / W) | 0, rounds: 4 })
  }

  const gems: Maze["gems"] = []
  const gemPool = pool(2)
  const gemCount = Math.min(16, gemPool.length)
  for (let i = 0; i < gemCount; i++) {
    const cell = takeRandom(gemPool)
    if (cell === undefined) break
    gems.push({
      x: cell % W,
      z: (cell / W) | 0,
      ox: (rnd() - 0.5) * 0.9,
      oz: (rnd() - 0.5) * 0.9,
    })
  }

  return {
    seed,
    w: W,
    h: H,
    grid,
    start: { x: 1, z: 1 },
    startDir,
    exit: { x: exitI % W, z: (exitI / W) | 0 },
    gates,
    chests,
    spikes,
    fires,
    slimes,
    enemies,
    gems,
    ammo,
  }
}

function canReach(m: Maze, open: Set<string>) {
  const key = (x: number, z: number) => `${x},${z}`
  const closed = new Set(m.gates.map((g) => key(g.x, g.z)))
  for (const k of open) closed.delete(k)
  const seen = new Set<string>()
  const q = [key(m.start.x, m.start.z)]
  seen.add(q[0]!)
  let qi = 0
  while (qi < q.length) {
    const cur = q[qi++]!
    const [xs, zs] = cur.split(",")
    const x = Number(xs)
    const z = Number(zs)
    for (const [dx, dz] of N4) {
      const nx = x + dx
      const nz = z + dz
      if (nx < 0 || nz < 0 || nx >= m.w || nz >= m.h) continue
      const k = key(nx, nz)
      if (seen.has(k) || closed.has(k)) continue
      if (!m.grid[nz * m.w + nx]) continue
      seen.add(k)
      q.push(k)
    }
  }
  return seen
}

export function mazeIsFair(m: Maze) {
  const open = new Set<string>()
  for (const g of m.gates) {
    const reach = canReach(m, open)
    const chest = m.chests.find((c) =>
      c.loot.some((l) => l.kind === "key" && l.keyColor === g.keyColor),
    )
    if (!chest) return false
    if (!reach.has(`${chest.x},${chest.z}`)) return false
    if (reach.has(`${g.x},${g.z}`)) return false
    open.add(`${g.x},${g.z}`)
  }
  const done = canReach(m, open)
  if (!done.has(`${m.exit.x},${m.exit.z}`)) return false
  for (const c of m.chests) if (!done.has(`${c.x},${c.z}`)) return false
  return true
}

export function generateMaze(seed = 20261013): Maze {
  for (let i = 0; i < 40; i++) {
    const s = (seed + i * 17) >>> 0
    const m = tryGenerate(s)
    if (m && mazeIsFair(m)) return m
  }
  throw new Error("Could not build a fair maze")
}
