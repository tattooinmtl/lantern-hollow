import * as THREE from "three"
import { createAudio } from "@/game/audio"
import { CELL, generateMaze, type Maze } from "@/game/maze"
import {
  MAG_SIZE,
  MAX_HP,
  SLOT_COUNT,
  type Item,
  type LootTemplate,
  type Snapshot,
} from "@/game/types"

export type GameHandle = {
  start: () => void
  restart: () => void
  resume: () => void
  setInventory: (open: boolean) => void
  useItem: (index: number) => void
  moveItem: (from: number, to: number) => void
  dropItem: (index: number) => void
  toggleTorch: () => void
  setMove: (x: number, y: number) => void
  addLook: (dx: number, dy: number) => void
  pokeAttack: () => void
  pokeJump: () => void
  pokeUse: () => void
  dispose: () => void
}

export type MountOpts = {
  canvas: HTMLCanvasElement
  minimap: HTMLCanvasElement
  seed: number
  onSnapshot: (snap: Snapshot) => void
  onReady: () => void
  onError: (message: string) => void
}

const STEP = 1 / 60
const RADIUS = 0.34
const EYE = 1.48
const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number
      getSpeed: () => number
      getPos: () => { x: number; y: number; z: number }
      getFrames?: () => number
      getHeld?: () => string[]
      setKeys: (codes: string[]) => void
      faceSpawn?: () => void
    }
  }
}

function radial(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y)
  if (m < dz || m === 0) return { x: 0, y: 0 }
  const s = (m - dz) / (1 - dz) / m
  return { x: x * s, y: y * s }
}

function raySphere(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  r: number,
) {
  const lx = cx - ox
  const ly = cy - oy
  const lz = cz - oz
  const tca = lx * dx + ly * dy + lz * dz
  if (tca < 0) return -1
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca
  const r2 = r * r
  if (d2 > r2) return -1
  return tca - Math.sqrt(r2 - d2)
}

function noopHandle(): GameHandle {
  const noop = () => {}
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
    dispose: noop,
  }
}

export function mountGame(opts: MountOpts): GameHandle {
  const { canvas, minimap, onSnapshot, onReady, onError } = opts
  const audio = createAudio()
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let maze: Maze
  try {
    maze = generateMaze(opts.seed)
  } catch {
    onError("The hollow wouldn't settle.")
    onReady()
    return noopHandle()
  }

  const { w: W, h: H } = maze
  const grid = maze.grid
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    })
  } catch {
    onError("This browser couldn't open the 3D view.")
    onReady()
    return noopHandle()
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setClearColor(0x16130f, 1)
  renderer.autoClear = false

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x16130f)
  scene.fog = new THREE.Fog(0x16130f, 8, 28)
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x5c4638, 0.46))
  scene.add(new THREE.AmbientLight(0xfff4e8, 0.08))
  const moon = new THREE.DirectionalLight(0xd7e2ff, 0.18)
  moon.position.set(-8, 14, 6)
  scene.add(moon)

  const torchLight = new THREE.PointLight(0xffb15e, 14, 16, 1.35)
  scene.add(torchLight)
  const muzzleLight = new THREE.PointLight(0xffe2b0, 0, 7, 2)
  scene.add(muzzleLight)

  const camera = new THREE.PerspectiveCamera(74, 1, 0.08, 80)
  const yawGroup = new THREE.Group()
  yawGroup.add(camera)
  camera.position.set(0, EYE, 0)
  scene.add(yawGroup)

  const viewScene = new THREE.Scene()
  const viewCam = new THREE.PerspectiveCamera(46, 1, 0.05, 8)
  viewScene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const viewKey = new THREE.DirectionalLight(0xfff1dd, 1.35)
  viewKey.position.set(0.5, 1.2, 1)
  viewScene.add(viewKey)

  const mapCtx = minimap.getContext("2d")
  minimap.width = 192
  minimap.height = 192

  const gateAt = new Map<number, number>()
  maze.gates.forEach((g, i) => gateAt.set(g.z * W + g.x, i))

  function solid(cx: number, cz: number) {
    if (cx < 0 || cz < 0 || cx >= W || cz >= H) return true
    const i = cz * W + cx
    if (!grid[i]) return true
    const gi = gateAt.get(i)
    if (gi !== undefined && !gatesOpen[gi]) return true
    return false
  }

  function blocked(px: number, pz: number, rad: number) {
    const minX = Math.floor((px - rad) / CELL)
    const maxX = Math.floor((px + rad) / CELL)
    const minZ = Math.floor((pz - rad) / CELL)
    const maxZ = Math.floor((pz + rad) / CELL)
    for (let cz = minZ; cz <= maxZ; cz++) {
      for (let cx = minX; cx <= maxX; cx++) {
        if (!solid(cx, cz)) continue
        const x0 = cx * CELL
        const z0 = cz * CELL
        const qx = Math.max(x0, Math.min(px, x0 + CELL))
        const qz = Math.max(z0, Math.min(pz, z0 + CELL))
        const dx = px - qx
        const dz = pz - qz
        if (dx * dx + dz * dz < rad * rad) return true
      }
    }
    return false
  }

  function overlap(px: number, pz: number, rad: number) {
    let bestPen = 0
    let nx = 0
    let nz = 0
    const minX = Math.floor((px - rad) / CELL)
    const maxX = Math.floor((px + rad) / CELL)
    const minZ = Math.floor((pz - rad) / CELL)
    const maxZ = Math.floor((pz + rad) / CELL)
    for (let cz = minZ; cz <= maxZ; cz++) {
      for (let cx = minX; cx <= maxX; cx++) {
        if (!solid(cx, cz)) continue
        const x0 = cx * CELL
        const z0 = cz * CELL
        const qx = Math.max(x0, Math.min(px, x0 + CELL))
        const qz = Math.max(z0, Math.min(pz, z0 + CELL))
        const dx = px - qx
        const dz = pz - qz
        const d2 = dx * dx + dz * dz
        if (d2 >= rad * rad) continue
        const d = Math.sqrt(d2)
        let pen: number
        let nnx: number
        let nnz: number
        if (d > 1e-5) {
          pen = rad - d
          nnx = dx / d
          nnz = dz / d
        } else {
          const left = px - x0
          const right = x0 + CELL - px
          const back = pz - z0
          const front = z0 + CELL - pz
          const m = Math.min(left, right, back, front)
          pen = rad + m
          if (m === left) {
            nnx = -1
            nnz = 0
          } else if (m === right) {
            nnx = 1
            nnz = 0
          } else if (m === back) {
            nnx = 0
            nnz = -1
          } else {
            nnx = 0
            nnz = 1
          }
        }
        if (pen > bestPen) {
          bestPen = pen
          nx = nnx
          nz = nnz
        }
      }
    }
    return bestPen > 0 ? { nx, nz, pen: bestPen } : null
  }

  function freeOfWalls(px: number, pz: number) {
    let ox = px
    let oz = pz
    for (let i = 0; i < 4; i++) {
      const hit = overlap(ox, oz, RADIUS)
      if (!hit) break
      ox += hit.nx * (hit.pen + 0.002)
      oz += hit.nz * (hit.pen + 0.002)
    }
    return { x: ox, z: oz }
  }

  function stepMove(px: number, pz: number, vx0: number, vz0: number, dt: number) {
    const dx = vx0 * dt
    const dz = vz0 * dt
    let ox = px
    let oz = pz
    let mvx = 0
    let mvz = 0
    if (!blocked(px + dx, pz, RADIUS)) {
      ox = px + dx
      mvx = dx
    }
    if (!blocked(ox, pz + dz, RADIUS)) {
      oz = pz + dz
      mvz = dz
    }
    const out = freeOfWalls(ox, oz)
    const inv = dt > 0 ? 1 / dt : 0
    return { x: out.x, z: out.z, vx: mvx * inv, vz: mvz * inv }
  }

  function los(x0: number, z0: number, x1: number, z1: number) {
    const dist = Math.hypot(x1 - x0, z1 - z0)
    const steps = Math.max(1, Math.ceil(dist / 0.35))
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const px = x0 + (x1 - x0) * t
      const pz = z0 + (z1 - z0) * t
      if (solid(Math.floor(px / CELL), Math.floor(pz / CELL))) return false
    }
    return true
  }

  function bfs(sx: number, sz: number, tx: number, tz: number) {
    const start = sz * W + sx
    const goal = tz * W + tx
    if (sx === tx && sz === tz) return [] as { x: number; z: number }[]
    const prev = new Int32Array(W * H).fill(-1)
    const seen = new Uint8Array(W * H)
    const q = [start]
    seen[start] = 1
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi]!
      const x = i % W
      const z = (i / W) | 0
      for (const [dx, dz] of N4) {
        const nx = x + dx
        const nz = z + dz
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue
        const ni = nz * W + nx
        if (seen[ni] || !grid[ni]) continue
        const g = gateAt.get(ni)
        if (g !== undefined && !gatesOpen[g]) continue
        seen[ni] = 1
        prev[ni] = i
        if (ni === goal) {
          const path: { x: number; z: number }[] = []
          let c = goal
          while (c !== start && c !== -1) {
            path.push({ x: c % W, z: (c / W) | 0 })
            c = prev[c] ?? -1
          }
          path.reverse()
          return path
        }
        q.push(ni)
      }
    }
    return null
  }

  const stone = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })
  const floorMat = stone
  const wallColors = [0xc4ad96, 0xb89d86, 0xd2bba4]
  const floorColors = [0x9a8068, 0x8d7460]
  let floorN = 0
  let wallN = 0
  let ceilN = 0
  const skylight = (x: number, z: number) => (x * 3 + z * 5) % 11 === 0 && !(x === maze.start.x && z === maze.start.z)
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (grid[z * W + x]) {
        floorN++
        if (!skylight(x, z)) ceilN++
      } else wallN++
    }
  }

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const floors = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 0.4, CELL), floorMat, floorN)
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 3.05, CELL), stone, Math.max(1, wallN))
  const ceils = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 0.28, CELL), stone, Math.max(1, ceilN))
  let fi = 0
  let wi = 0
  let ci = 0
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const wx = (x + 0.5) * CELL
      const wz = (z + 0.5) * CELL
      if (grid[z * W + x]) {
        dummy.position.set(wx, -0.2, wz)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        floors.setMatrixAt(fi, dummy.matrix)
        floors.setColorAt(fi, color.setHex(floorColors[(x + z) & 1]!))
        fi++
        if (!skylight(x, z)) {
          dummy.position.set(wx, 3.19, wz)
          dummy.updateMatrix()
          ceils.setMatrixAt(ci, dummy.matrix)
          ceils.setColorAt(ci, color.setHex(0x3a332c))
          ci++
        }
      } else {
        dummy.position.set(wx, 1.525, wz)
        dummy.updateMatrix()
        walls.setMatrixAt(wi, dummy.matrix)
        walls.setColorAt(wi, color.setHex(wallColors[(x * 3 + z) % 3]!))
        wi++
      }
    }
  }
  floors.instanceMatrix.needsUpdate = true
  walls.instanceMatrix.needsUpdate = true
  ceils.instanceMatrix.needsUpdate = true
  if (floors.instanceColor) floors.instanceColor.needsUpdate = true
  if (walls.instanceColor) walls.instanceColor.needsUpdate = true
  if (ceils.instanceColor) ceils.instanceColor.needsUpdate = true
  scene.add(floors, walls, ceils)

  const starPos = new Float32Array(180 * 3)
  for (let i = 0; i < 180; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 70
    starPos[i * 3 + 1] = 6 + Math.random() * 8
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 70
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xf6efe4, size: 0.07 })))

  const exitLight = new THREE.PointLight(0xffc56a, 3.4, 10, 1.7)
  exitLight.position.set((maze.exit.x + 0.5) * CELL, 1.5, (maze.exit.z + 0.5) * CELL)
  scene.add(exitLight)

  function runsOnX(cx: number, cz: number) {
    let hx = 0
    let hz = 0
    for (const [dx, dz] of N4) {
      const nx = cx + dx
      const nz = cz + dz
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue
      if (!grid[nz * W + nx]) continue
      if (dx !== 0) hx++
      else hz++
    }
    return hx >= hz
  }

  const archMat = new THREE.MeshLambertMaterial({
    color: 0xe3923a,
    emissive: 0xe3923a,
    emissiveIntensity: 0.8,
    flatShading: true,
  })
  const arch = new THREE.Group()
  const postGeo = new THREE.BoxGeometry(0.16, 2.35, 0.16)
  const leftPost = new THREE.Mesh(postGeo, archMat)
  leftPost.position.set(-0.72, 1.18, 0)
  const rightPost = new THREE.Mesh(postGeo, archMat)
  rightPost.position.set(0.72, 1.18, 0)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.16, 0.16), archMat)
  lintel.position.y = 2.32
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 2.05),
    new THREE.MeshBasicMaterial({
      color: 0xffd089,
      transparent: true,
      opacity: 0.33,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  veil.position.y = 1.15
  arch.add(leftPost, rightPost, lintel, veil)
  arch.position.copy(exitLight.position)
  arch.position.y = 0
  if (runsOnX(maze.exit.x, maze.exit.z)) arch.rotation.y = Math.PI / 2
  scene.add(arch)

  const gateColors: Record<string, number> = { bronze: 0xc4844a, silver: 0xd5d8df, gold: 0xe6c15a }
  const barGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.65, 5)
  const gatesOpen = maze.gates.map(() => false)
  const gateGroups = maze.gates.map((g) => {
    const mat = new THREE.MeshLambertMaterial({
      color: gateColors[g.keyColor] ?? 0xd5d8df,
      flatShading: true,
      emissive: gateColors[g.keyColor] ?? 0xd5d8df,
      emissiveIntensity: 0.18,
    })
    const group = new THREE.Group()
    const alongX = runsOnX(g.x, g.z)
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(barGeo, mat)
      bar.position.y = 1.32
      if (alongX) bar.position.z = i * 0.28
      else bar.position.x = i * 0.28
      group.add(bar)
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.16 : 1.5, 0.1, alongX ? 1.5 : 0.16), mat)
    cap.position.y = 2.6
    group.add(cap)
    group.position.set((g.x + 0.5) * CELL, 0, (g.z + 0.5) * CELL)
    scene.add(group)
    return { group, anim: 0 }
  })

  const wood = new THREE.MeshLambertMaterial({ color: 0xa56b3c, flatShading: true })
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x7a4e2c, flatShading: true })
  const bandMat = new THREE.MeshLambertMaterial({
    color: 0xe3923a,
    emissive: 0xe3923a,
    emissiveIntensity: 0.35,
    flatShading: true,
  })
  const lidGeo = new THREE.BoxGeometry(0.74, 0.14, 0.48)
  lidGeo.translate(0, 0.07, -0.24)

  type ChestRt = {
    wx: number
    wz: number
    loot: LootTemplate[]
    anim: number
    opened: boolean
    lid: THREE.Mesh
  }
  const chests: ChestRt[] = maze.chests.map((c) => {
    const group = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.46), wood)
    body.position.y = 0.28
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.5), bandMat)
    band.position.y = 0.32
    const lid = new THREE.Mesh(lidGeo, woodDark)
    lid.position.set(0, 0.48, 0.24)
    group.add(body, band, lid)
    const wx = (c.x + 0.5) * CELL + c.ox * 0.95
    const wz = (c.z + 0.5) * CELL + c.oz * 0.95
    group.position.set(wx, 0, wz)
    if (c.ox !== 0) group.rotation.y = c.ox > 0 ? Math.PI / 2 : -Math.PI / 2
    if (c.oz > 0) group.rotation.y = 0
    if (c.oz < 0) group.rotation.y = Math.PI
    scene.add(group)
    return { wx, wz, loot: c.loot.map((t) => ({ ...t })), anim: 0, opened: false, lid }
  })

  const plateGeo = new THREE.CylinderGeometry(0.62, 0.68, 0.08, 8)
  const spikeGeo = new THREE.ConeGeometry(0.07, 0.85, 5)
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x8d939c, flatShading: true })
  const spikeMat = new THREE.MeshLambertMaterial({ color: 0xd5d8df, flatShading: true })
  type SpikeRt = {
    x: number
    z: number
    state: "idle" | "windup" | "up" | "down"
    t: number
    hit: boolean
    spikes: THREE.Group
  }
  const spikes: SpikeRt[] = maze.spikes.map((s) => {
    const group = new THREE.Group()
    const plate = new THREE.Mesh(plateGeo, plateMat)
    plate.position.y = 0.04
    const spikeG = new THREE.Group()
    for (let i = 0; i < 7; i++) {
      const cone = new THREE.Mesh(spikeGeo, spikeMat)
      const a = (i / 7) * Math.PI * 2
      cone.position.set(Math.cos(a) * 0.28, 0.42, Math.sin(a) * 0.28)
      spikeG.add(cone)
    }
    const mid = new THREE.Mesh(spikeGeo, spikeMat)
    mid.position.y = 0.42
    spikeG.add(mid)
    spikeG.position.y = -0.75
    group.add(plate, spikeG)
    const x = (s.x + 0.5) * CELL
    const z = (s.z + 0.5) * CELL
    group.position.set(x, 0, z)
    scene.add(group)
    return { x, z, state: "idle", t: 0, hit: false, spikes: spikeG }
  })

  const flameGeo = new THREE.ConeGeometry(0.16, 0.7, 5)
  const grateGeo = new THREE.CylinderGeometry(0.46, 0.5, 0.06, 8)
  type FireRt = {
    x: number
    z: number
    phase: number
    lastBurst: number
    mat: THREE.MeshBasicMaterial
    cones: THREE.Mesh[]
  }
  const fires: FireRt[] = maze.fires.map((f) => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    const group = new THREE.Group()
    const grate = new THREE.Mesh(
      grateGeo,
      new THREE.MeshLambertMaterial({ color: 0x4a4038, emissive: 0x7a3414, emissiveIntensity: 0.4 }),
    )
    grate.position.y = 0.04
    group.add(grate)
    const cones: THREE.Mesh[] = []
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(flameGeo, mat)
      cone.position.set((i - 1) * 0.18, 0.4, 0)
      group.add(cone)
      cones.push(cone)
    }
    const x = (f.x + 0.5) * CELL
    const z = (f.z + 0.5) * CELL
    group.position.set(x, 0, z)
    scene.add(group)
    return { x, z, phase: f.phase, lastBurst: -1, mat, cones }
  })

  const slimeMat = new THREE.MeshLambertMaterial({
    color: 0x3faf6a,
    emissive: 0x145c32,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  })
  const slimes = maze.slimes.map((s, i) => {
    const group = new THREE.Group()
    const blob = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.14, 10), slimeMat)
    blob.position.y = 0.07
    group.add(blob)
    const bubbleGeo = new THREE.SphereGeometry(0.1, 6, 5)
    const bubbles: THREE.Mesh[] = []
    for (let b = 0; b < 3; b++) {
      const bubble = new THREE.Mesh(bubbleGeo, slimeMat)
      bubble.position.set(Math.cos(b * 2.1 + i) * 0.45, 0.16, Math.sin(b * 2.1 + i) * 0.45)
      group.add(bubble)
      bubbles.push(bubble)
    }
    const x = (s.x + 0.5) * CELL
    const z = (s.z + 0.5) * CELL
    group.position.set(x, 0, z)
    scene.add(group)
    return { x, z, bubbles }
  })

  const gemGeo = new THREE.OctahedronGeometry(0.16, 0)
  const gemMat = new THREE.MeshLambertMaterial({
    color: 0xffd39a,
    emissive: 0xe3923a,
    emissiveIntensity: 0.85,
    flatShading: true,
  })
  const gems = maze.gems.map((g) => {
    const mesh = new THREE.Mesh(gemGeo, gemMat)
    mesh.position.set((g.x + 0.5) * CELL + g.ox, 0.6, (g.z + 0.5) * CELL + g.oz)
    scene.add(mesh)
    return { mesh, alive: true }
  })

  const ammoGeo = new THREE.BoxGeometry(0.18, 0.1, 0.24)
  const ammoMat = new THREE.MeshLambertMaterial({
    color: 0xd4a35a,
    emissive: 0x5a3a16,
    emissiveIntensity: 0.35,
    flatShading: true,
  })
  type Loose = { x: number; z: number; rounds: number; alive: boolean; mesh: THREE.Mesh; extra: boolean }
  const loose: Loose[] = maze.ammo.map((a) => {
    const mesh = new THREE.Mesh(ammoGeo, ammoMat)
    const x = (a.x + 0.5) * CELL
    const z = (a.z + 0.5) * CELL
    mesh.position.set(x, 0.22, z)
    scene.add(mesh)
    return { x, z, rounds: a.rounds, alive: true, mesh, extra: false }
  })

  function makeFighter(kind: "goblin" | "orc") {
    const goblin = kind === "goblin"
    const group = new THREE.Group()
    const skin = new THREE.MeshLambertMaterial({
      color: goblin ? 0x7dba6a : 0x6e8f4e,
      flatShading: true,
      emissive: 0x000000,
    })
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(goblin ? 0.48 : 0.72, goblin ? 0.52 : 0.68, goblin ? 0.32 : 0.44),
      skin,
    )
    body.position.y = goblin ? 0.5 : 0.64
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(goblin ? 0.34 : 0.44, goblin ? 0.3 : 0.36, goblin ? 0.3 : 0.38),
      skin,
    )
    head.position.set(0, goblin ? 0.92 : 1.16, 0.02)
    group.add(body, head)
    const eye = new THREE.MeshBasicMaterial({ color: 0xf6efe4 })
    const pupil = new THREE.MeshBasicMaterial({ color: 0x1a1612 })
    const eyeY = goblin ? 0.94 : 1.18
    const eyeZ = goblin ? 0.16 : 0.2
    const eyeX = goblin ? 0.08 : 0.11
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), eye)
      e.position.set(s * eyeX, eyeY, eyeZ)
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.02), pupil)
      p.position.set(s * eyeX, eyeY, eyeZ + 0.03)
      group.add(e, p)
    }
    if (goblin) {
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), skin)
        ear.position.set(s * 0.2, 1.08, 0)
        group.add(ear)
      }
    } else {
      const tuskMat = new THREE.MeshLambertMaterial({ color: 0xf0e2c4, flatShading: true })
      for (const s of [-1, 1]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 4), tuskMat)
        tusk.rotation.x = Math.PI
        tusk.position.set(s * 0.1, 0.98, 0.2)
        group.add(tusk)
      }
    }
    const bar = new THREE.Group()
    bar.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: 0x241f1a })))
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.045, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xd4533c }),
    )
    fill.position.z = 0.012
    bar.add(fill)
    bar.position.y = goblin ? 1.28 : 1.58
    bar.visible = false
    group.add(bar)
    return { group, skin, fill, bar }
  }

  type Enemy = {
    kind: "goblin" | "orc"
    x: number
    z: number
    yaw: number
    hp: number
    max: number
    alive: boolean
    alert: boolean
    memory: number
    think: number
    path: { x: number; z: number }[]
    attackCd: number
    windup: number
    flash: number
    group: THREE.Group
    skin: THREE.MeshLambertMaterial
    fill: THREE.Mesh
    bar: THREE.Group
  }
  const enemies: Enemy[] = maze.enemies.map((e) => {
    const made = makeFighter(e.kind)
    const x = (e.x + 0.5) * CELL
    const z = (e.z + 0.5) * CELL
    made.group.position.set(x, 0, z)
    scene.add(made.group)
    const max = e.kind === "goblin" ? 2 : 3
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
      think: Math.random() * 0.3,
      path: [],
      attackCd: 0.4,
      windup: 0,
      flash: 0,
      group: made.group,
      skin: made.skin,
      fill: made.fill,
      bar: made.bar,
    }
  })

  const partGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08)
  const partMats = [
    new THREE.MeshBasicMaterial({ color: 0xf6efe4 }),
    new THREE.MeshBasicMaterial({ color: 0xe3923a }),
  ]
  const parts = Array.from({ length: 28 }, (_, i) => {
    const mesh = new THREE.Mesh(partGeo, partMats[i % 2]!)
    mesh.visible = false
    scene.add(mesh)
    return { mesh, v: new THREE.Vector3(), life: 0 }
  })
  let partCursor = 0
  function burst(x: number, y: number, z: number, n = 8, speed = 3.2) {
    for (let i = 0; i < n; i++) {
      const p = parts[partCursor++ % parts.length]!
      p.mesh.visible = true
      p.mesh.position.set(x, y, z)
      p.v.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed)
      p.life = 0.28 + Math.random() * 0.22
    }
  }

  const steel = new THREE.MeshLambertMaterial({ color: 0x4a525c, flatShading: true })
  const steelDark = new THREE.MeshLambertMaterial({ color: 0x2a2622, flatShading: true })
  const gripMat = new THREE.MeshLambertMaterial({ color: 0x6a3e2a, flatShading: true })
  const gun = new THREE.Group()
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.32), steel)
  slide.position.set(0, 0.045, -0.02)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.24, 6), steel)
  barrel.rotation.x = -Math.PI / 2
  barrel.position.set(0, 0.05, -0.26)
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.12, 0.16), steelDark)
  receiver.position.set(0, -0.02, 0.02)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), gripMat)
  grip.position.set(0, -0.13, 0.07)
  grip.rotation.x = 0.38
  gun.add(slide, barrel, receiver, grip)
  gun.position.set(0.28, -0.26, -0.5)
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffe7b8,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), flashMat)
  flash.position.set(0, 0.05, -0.4)
  flash.visible = false
  gun.add(flash)
  viewScene.add(gun)

  const woodTorch = new THREE.MeshLambertMaterial({ color: 0x6b442c, flatShading: true })
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb14a })
  const torch = new THREE.Group()
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.46, 5), woodTorch)
  stick.rotation.z = 0.15
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 5), flameMat)
  flame.position.y = 0.28
  torch.add(stick, flame)
  torch.position.set(-0.34, -0.28, -0.46)
  viewScene.add(torch)

  const startX = (maze.start.x + 0.5) * CELL
  const startZ = (maze.start.z + 0.5) * CELL
  const startYaw = Math.atan2(-maze.startDir.x, -maze.startDir.z)

  let phase: Snapshot["phase"] = "menu"
  let x = startX
  let y = 0
  let z = startZ
  let yaw = startYaw
  let pitch = 0
  let vx = 0
  let vy = 0
  let vz = 0
  let hp = MAX_HP
  let iframe = 0
  let hurtFlash = 0
  let mag = MAG_SIZE
  let reserve = 0
  let reloading = false
  let reloadT = 0
  let fireCd = 0
  let slots: (Item | null)[] = Array.from({ length: SLOT_COUNT }, () => null)
  let gemsGot = 0
  let kills = 0
  let playTime = 0
  let torchOn = true
  let slowed = false
  let slimeAcc = 0
  let grounded = true
  let coyote = 0
  let jumpBuf = 0
  let bobPhase = 0
  let bobY = 0
  let recoilKick = 0
  let gunKick = 0
  let gunSwayX = 0
  let gunSwayY = 0
  let aimDx = 0
  let aimDy = 0
  let muzzle = 0
  let shake = 0
  let toast = ""
  let toastT = 0
  let near = ""
  let hitMarker = 0
  let clock = 0
  let fullCd = 0
  let stepAcc = 0
  let seq = 1
  let snapAcc = 0
  let locked = false
  const explored = new Uint8Array(W * H)
  const keys = new Set<string>()
  let prevKeys = new Set<string>()
  let touchX = 0
  let touchY = 0
  let lookDx = 0
  let lookDy = 0
  let attackEdge = false
  let jumpEdge = false
  let useEdge = false
  let reloadEdge = false
  let torchEdge = false
  let invEdge = false
  let pauseEdge = false
  let useSlot = -1
  let padFire = false
  let padJump = false
  let padUse = false
  let padReload = false
  let scripted = false
  let frames = 0
  let disposed = false
  const token = {}

  type Drop = { x: number; z: number; item: Item; mesh: THREE.Group }
  let drops: Drop[] = []

  const _pos = new THREE.Vector3()
  const _dir = new THREE.Vector3()

  function makeItem(t: LootTemplate): Item {
    return { ...t, id: `it${seq++}` }
  }

  function makeItemMesh(item: Item) {
    const group = new THREE.Group()
    if (item.kind === "key") {
      const hex = item.keyColor === "gold" ? 0xe6c15a : item.keyColor === "silver" ? 0xd5d8df : 0xc4844a
      const mat = new THREE.MeshLambertMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.28, flatShading: true })
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 4, 6), mat)
      bow.rotation.x = Math.PI / 2
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.035), mat)
      shaft.position.y = -0.12
      group.add(bow, shaft)
    } else if (item.kind === "potion") {
      const mat = new THREE.MeshLambertMaterial({ color: 0xd4533c, emissive: 0x6a1e16, emissiveIntensity: 0.45, flatShading: true })
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 6), mat)
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.08, 5), mat)
      neck.position.y = 0.14
      group.add(bottle, neck)
    } else if (item.kind === "ammo") {
      group.add(new THREE.Mesh(ammoGeo, ammoMat))
    } else {
      const mat = new THREE.MeshLambertMaterial({ color: 0x9fe0cf, emissive: 0x1c6a58, emissiveIntensity: 0.55, flatShading: true })
      group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat))
    }
    scene.add(group)
    return group
  }

  function push(force = false) {
    snapAcc += force ? 1 : 0
    if (!force && snapAcc < 0.1) return
    snapAcc = 0
    onSnapshot(buildSnap())
  }

  function buildSnap(): Snapshot {
    return {
      phase,
      hp,
      mag,
      reserve,
      reload: reloading ? Math.min(1, 1 - reloadT / 0.9) : 0,
      time: playTime,
      gems: gemsGot,
      gemsTotal: maze.gems.length,
      kills,
      slots: slots.map((s) => (s ? { ...s } : null)),
      toast: toastT > 0 ? toast : "",
      torch: torchOn,
      slowed,
      hurt: hurtFlash,
      hit: hitMarker,
      near,
      seed: maze.seed,
      locked,
      error: "",
    }
  }

  function say(text: string, seconds = 1.35) {
    toast = text
    toastT = seconds
  }

  function reveal(px: number, pz: number) {
    const cx = Math.floor(px / CELL)
    const cz = Math.floor(pz / CELL)
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx
        const gz = cz + dz
        if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue
        const i = gz * W + gx
        if (!explored[i] && gx === maze.exit.x && gz === maze.exit.z) say("The way out glints ahead", 1.8)
        explored[i] = 1
      }
    }
  }

  function resetRuntime() {
    phase = "menu"
    x = startX
    y = 0
    z = startZ
    yaw = startYaw
    pitch = 0
    vx = 0
    vy = 0
    vz = 0
    hp = MAX_HP
    iframe = 0
    hurtFlash = 0
    mag = MAG_SIZE
    reserve = 0
    reloading = false
    reloadT = 0
    fireCd = 0
    slots = Array.from({ length: SLOT_COUNT }, () => null)
    gemsGot = 0
    kills = 0
    playTime = 0
    torchOn = true
    slowed = false
    slimeAcc = 0
    grounded = true
    coyote = 0.12
    jumpBuf = 0
    bobPhase = 0
    bobY = 0
    recoilKick = 0
    gunKick = 0
    muzzle = 0
    shake = 0
    toast = ""
    toastT = 0
    near = ""
    hitMarker = 0
    clock = 0
    stepAcc = 0
    explored.fill(0)
    reveal(x, z)
    for (let i = 0; i < gatesOpen.length; i++) gatesOpen[i] = false
    for (const g of gateGroups) {
      g.anim = 0
      g.group.position.y = 0
    }
    chests.forEach((c, i) => {
      c.loot = maze.chests[i]!.loot.map((t) => ({ ...t }))
      c.anim = 0
      c.opened = false
      c.lid.rotation.x = 0
    })
    for (const s of spikes) {
      s.state = "idle"
      s.t = 0
      s.hit = false
      s.spikes.position.y = -0.75
    }
    for (const f of fires) f.lastBurst = -1
    for (const g of gems) {
      g.alive = true
      g.mesh.visible = true
    }
    for (let i = loose.length - 1; i >= 0; i--) {
      const a = loose[i]!
      if (a.extra) {
        scene.remove(a.mesh)
        loose.splice(i, 1)
      } else {
        a.alive = true
        a.mesh.visible = true
      }
    }
    for (const d of drops) scene.remove(d.mesh)
    drops = []
    for (const e of enemies) {
      const src = maze.enemies[enemies.indexOf(e)]!
      e.x = (src.x + 0.5) * CELL
      e.z = (src.z + 0.5) * CELL
      e.hp = e.max
      e.alive = true
      e.alert = false
      e.memory = 0
      e.path = []
      e.attackCd = 0.5
      e.windup = 0
      e.flash = 0
      e.group.visible = true
      e.bar.visible = false
      e.skin.emissive.setHex(0x000000)
    }
    for (const p of parts) {
      p.life = 0
      p.mesh.visible = false
    }
  }

  function hurt(
    pips: number,
    o: { iframe: boolean; text: string; sx?: number; sz?: number; knock?: boolean },
  ) {
    if (hp <= 0 || phase !== "play") return
    if (o.iframe && iframe > 0) return
    hp = Math.max(0, hp - pips)
    if (o.iframe) iframe = 0.72
    hurtFlash = 1
    if (!reduced) shake = Math.min(0.32, shake + 0.07 * pips)
    say(o.text, 1.1)
    audio.hurt()
    if (o.knock && o.sx !== undefined && o.sz !== undefined) {
      const dx = x - o.sx
      const dz = z - o.sz
      const len = Math.hypot(dx, dz) || 1
      vx += (dx / len) * 4.4
      vz += (dz / len) * 4.4
    }
    if (hp <= 0) {
      phase = "dead"
      vx = 0
      vz = 0
      vy = 0
      audio.die()
      if (document.pointerLockElement) document.exitPointerLock()
    }
    push(true)
  }

  function firstEmpty() {
    return slots.findIndex((s) => s == null)
  }

  function useItem(index: number) {
    const it = slots[index]
    if (!it) return
    if (it.kind === "potion") {
      const heal = it.heal ?? 4
      if (hp >= MAX_HP) {
        say("Already brimming", 1)
        push(true)
        return
      }
      hp = Math.min(MAX_HP, hp + heal)
      slots[index] = null
      audio.potion()
      const hearts = heal / 2
      say(`${it.name} — ${hearts} heart${hearts === 1 ? "" : "s"}`)
      push(true)
      return
    }
    if (it.kind === "ammo") {
      reserve += it.rounds ?? 0
      slots[index] = null
      audio.pickup()
      say(`+${it.rounds ?? 0} rounds`)
      push(true)
      return
    }
    if (it.kind === "key") {
      say(`${it.name} — find its gate`)
      push(true)
      return
    }
    say("The beetle ticks like a warm watch")
    push(true)
  }

  function moveItem(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= SLOT_COUNT || to >= SLOT_COUNT) return
    const a = slots[from]
    slots[from] = slots[to] ?? null
    slots[to] = a ?? null
    push(true)
  }

  function dropItem(index: number) {
    const it = slots[index]
    if (!it) return
    slots[index] = null
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    let dx = x + fx * 1.25
    let dz = z + fz * 1.25
    if (blocked(dx, dz, 0.2)) {
      dx = x + fx * 0.45
      dz = z + fz * 0.45
    }
    const mesh = makeItemMesh(it)
    mesh.position.set(dx, 0.35, dz)
    drops.push({ x: dx, z: dz, item: it, mesh })
    audio.pickup()
    say(`Dropped ${it.name}`)
    push(true)
  }

  function spawnLoose(wx: number, wz: number, rounds: number) {
    const mesh = new THREE.Mesh(ammoGeo, ammoMat)
    mesh.position.set(wx, 0.22, wz)
    scene.add(mesh)
    loose.push({ x: wx, z: wz, rounds, alive: true, mesh, extra: true })
  }

  function killEnemy(e: Enemy) {
    e.alive = false
    e.group.visible = false
    kills++
    const rounds = e.kind === "goblin" ? 3 + ((Math.random() * 3) | 0) : 5 + ((Math.random() * 3) | 0)
    spawnLoose(e.x, e.z, rounds)
    burst(e.x, 0.7, e.z, 10, 3.4)
    audio.kill()
    say(e.kind === "goblin" ? `Goblin down — +${rounds} rounds` : `Orc down — +${rounds} rounds`)
    push(true)
  }

  function syncRig() {
    const sway = phase === "menu" && !reduced ? Math.sin(performance.now() / 900) * 0.12 : 0
    yawGroup.position.set(x, y, z)
    yawGroup.rotation.y = yaw + sway
    const shx = reduced ? 0 : (Math.random() - 0.5) * shake
    const shy = reduced ? 0 : (Math.random() - 0.5) * shake
    camera.position.set(shx, EYE + bobY + shy, 0)
    camera.rotation.x = pitch + recoilKick
    camera.rotation.z = 0
    yawGroup.updateMatrixWorld(true)
  }

  function shoot() {
    if (reloading) return
    if (mag <= 0) {
      audio.empty()
      if (reserve > 0) {
        reloading = true
        reloadT = 0.9
      } else say("Handgun empty", 0.8)
      push(true)
      return
    }
    mag--
    fireCd = 0.32
    recoilKick = 0.055
    gunKick = 1
    muzzle = 0.045
    yaw += (Math.random() - 0.5) * 0.012
    if (!reduced) shake = Math.min(0.18, shake + 0.035)
    audio.shot()
    syncRig()
    camera.getWorldPosition(_pos)
    camera.getWorldDirection(_dir)
    _dir.x += (Math.random() - 0.5) * 0.008
    _dir.y += (Math.random() - 0.5) * 0.008
    _dir.z += (Math.random() - 0.5) * 0.008
    _dir.normalize()
    muzzleLight.position.copy(_pos)
    let wallT = 36
    for (let t = 0.25; t < wallT; t += 0.18) {
      const px = _pos.x + _dir.x * t
      const py = _pos.y + _dir.y * t
      const pz = _pos.z + _dir.z * t
      if (py <= 0.02 || py >= 3.02 || solid(Math.floor(px / CELL), Math.floor(pz / CELL))) {
        wallT = t
        break
      }
    }
    let bestT = wallT
    let hit: Enemy | null = null
    for (const e of enemies) {
      if (!e.alive) continue
      const t = raySphere(
        _pos.x,
        _pos.y,
        _pos.z,
        _dir.x,
        _dir.y,
        _dir.z,
        e.x,
        e.kind === "goblin" ? 0.72 : 0.9,
        e.z,
        e.kind === "goblin" ? 0.42 : 0.55,
      )
      if (t > 0.2 && t < bestT) {
        bestT = t
        hit = e
      }
    }
    const hx = _pos.x + _dir.x * bestT
    const hy = _pos.y + _dir.y * bestT
    const hz = _pos.z + _dir.z * bestT
    burst(hx, hy, hz, hit ? 8 : 4, hit ? 2.4 : 1.6)
    if (hit) {
      hit.hp -= 1
      hit.flash = 0.12
      hit.alert = true
      hit.memory = 2.4
      hitMarker = 0.12
      audio.hit()
      if (hit.hp <= 0) killEnemy(hit)
    } else audio.impact()
    for (const e of enemies) {
      if (!e.alive) continue
      if (Math.hypot(e.x - x, e.z - z) < 8) {
        e.alert = true
        e.memory = Math.max(e.memory, 2)
      }
    }
    if (mag === 0 && reserve > 0) {
      reloading = true
      reloadT = 0.9
    }
    push(true)
  }

  function nearest() {
    let bestI = -1
    let bestKind: "chest" | "gate" = "chest"
    let bestD = Infinity
    for (let i = 0; i < chests.length; i++) {
      const c = chests[i]!
      if (!c.loot.length) continue
      const d = Math.hypot(x - c.wx, z - c.wz)
      if (d <= 1.8 && d < bestD) {
        bestD = d
        bestI = i
        bestKind = "chest"
      }
    }
    for (let i = 0; i < maze.gates.length; i++) {
      if (gatesOpen[i]) continue
      const g = maze.gates[i]!
      const d = Math.hypot(x - (g.x + 0.5) * CELL, z - (g.z + 0.5) * CELL)
      if (d <= 2.55 && d < bestD) {
        bestD = d
        bestI = i
        bestKind = "gate"
      }
    }
    if (bestI < 0) return null
    return { kind: bestKind, i: bestI }
  }

  function interact() {
    const target = nearest()
    if (!target) return
    if (target.kind === "chest") {
      const chest = chests[target.i]!
      const left: LootTemplate[] = []
      let moved = 0
      for (const loot of chest.loot) {
        const slot = firstEmpty()
        if (slot < 0) {
          left.push(loot)
          continue
        }
        slots[slot] = makeItem(loot)
        moved++
      }
      chest.loot = left
      chest.opened = true
      if (moved) {
        audio.chest()
        burst(chest.wx, 0.7, chest.wz, 6, 1.5)
        say(left.length ? "Pack is full — drag something out" : "The chest creaks open")
      } else say("Pack is full — drag something out")
      push(true)
      return
    }
    const gate = maze.gates[target.i]!
    const si = slots.findIndex((s) => s && s.kind === "key" && s.keyColor === gate.keyColor)
    if (si < 0) {
      audio.empty()
      const label = gate.keyColor[0]!.toUpperCase() + gate.keyColor.slice(1)
      say(`Needs a ${label.toLowerCase()} key`)
      push(true)
      return
    }
    slots[si] = null
    gatesOpen[target.i] = true
    audio.gate()
    const label = gate.keyColor[0]!.toUpperCase() + gate.keyColor.slice(1)
    say(`${label} gate unlocks`)
    push(true)
  }

  function pollEdges() {
    const press = (code: string) => keys.has(code) && !prevKeys.has(code)
    if (press("Space")) jumpEdge = true
    if (press("KeyE")) useEdge = true
    if (press("KeyR")) reloadEdge = true
    if (press("KeyF")) torchEdge = true
    if (press("Tab") || press("KeyQ")) invEdge = true
    if (press("Escape")) pauseEdge = true
    for (let i = 0; i < 8; i++) if (press(`Digit${i + 1}`)) useSlot = i
    prevKeys = new Set(keys)
  }

  function pollGamepad(frameDt: number) {
    const pads = navigator.getGamepads?.()
    if (!pads) return
    let stickX = 0
    let stickY = 0
    let lookX = 0
    let lookY = 0
    let fire = false
    let jump = false
    let use = false
    let reload = false
    for (const pad of pads) {
      if (!pad) continue
      const move = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0)
      stickX += move.x
      stickY += -move.y
      const look = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.2)
      lookX += look.x
      lookY += look.y
      fire = fire || (pad.buttons[7]?.value ?? 0) > 0.45 || !!pad.buttons[5]?.pressed
      jump = jump || !!pad.buttons[0]?.pressed
      use = use || !!pad.buttons[2]?.pressed
      reload = reload || !!pad.buttons[1]?.pressed
    }
    touchX += stickX
    touchY += stickY
    if (phase === "play") {
      yaw -= lookX * 1.8 * frameDt
      pitch -= lookY * 1.35 * frameDt
    }
    if (fire && !padFire) attackEdge = true
    if (jump && !padJump) jumpEdge = true
    if (use && !padUse) useEdge = true
    if (reload && !padReload) reloadEdge = true
    padFire = fire
    padJump = jump
    padUse = use
    padReload = reload
  }

  function tick(dt: number, first: boolean) {
    if (first) {
      if (useSlot >= 0 && (phase === "play" || phase === "inventory")) useItem(useSlot)
      useSlot = -1
      if (invEdge) {
        invEdge = false
        if (phase === "play" || phase === "paused") {
          phase = "inventory"
          if (document.pointerLockElement) document.exitPointerLock()
          push(true)
        } else if (phase === "inventory") {
          phase = "play"
          push(true)
        }
      }
      if (pauseEdge) {
        pauseEdge = false
        if (phase === "play") {
          phase = "paused"
          if (document.pointerLockElement) document.exitPointerLock()
          push(true)
        } else if (phase === "paused" || phase === "inventory") {
          phase = "play"
          push(true)
        }
      }
      if (torchEdge) {
        torchEdge = false
        if (phase === "play") {
          torchOn = !torchOn
          say(torchOn ? "Torch up" : "Torch low", 0.7)
          push(true)
        }
      }
    }

    toastT = Math.max(0, toastT - dt)
    hurtFlash = Math.max(0, hurtFlash - dt * 1.7)
    hitMarker = Math.max(0, hitMarker - dt)
    fullCd = Math.max(0, fullCd - dt)

    if (phase !== "play") {
      if (first) {
        attackEdge = false
        jumpEdge = false
        useEdge = false
        reloadEdge = false
      }
      vx = 0
      vz = 0
      return
    }

    clock += dt
    playTime += dt
    iframe = Math.max(0, iframe - dt)
    fireCd = Math.max(0, fireCd - dt)
    recoilKick *= Math.exp(-12 * dt)
    gunKick = Math.max(0, gunKick - dt * 7)
    shake = Math.max(0, shake - dt * 1.6)
    muzzle = Math.max(0, muzzle - dt)

    if (reloading) {
      reloadT -= dt
      if (reloadT <= 0) {
        const n = Math.min(MAG_SIZE - mag, reserve)
        mag += n
        reserve -= n
        reloading = false
        audio.reload()
        push(true)
      }
    }

    let mx = touchX
    let my = touchY
    if (keys.has("KeyW") || keys.has("ArrowUp")) my += 1
    if (keys.has("KeyS") || keys.has("ArrowDown")) my -= 1
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1
    const magMove = Math.hypot(mx, my)
    if (magMove > 1) {
      mx /= magMove
      my /= magMove
    }
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)
    const speed = slowed ? 1.62 : 4.85
    const accel = grounded ? 24 : 6.5
    const rate = 1 - Math.exp(-accel * dt)
    vx += (fx * my * speed + rx * mx * speed - vx) * rate
    vz += (fz * my * speed + rz * mx * speed - vz) * rate

    const moved = stepMove(x, z, vx, vz, dt)
    x = moved.x
    z = moved.z
    vx = moved.vx
    vz = moved.vz

    if (jumpEdge || jumpBuf > 0) jumpBuf = Math.max(jumpBuf, 0.12)
    jumpBuf = Math.max(0, jumpBuf - dt)
    if (!grounded) coyote = Math.max(0, coyote - dt)
    if (jumpBuf > 0 && (grounded || coyote > 0)) {
      vy = 6.5
      grounded = false
      coyote = 0
      jumpBuf = 0
      audio.jump()
    }
    vy -= 19.5 * dt
    y += vy * dt
    if (y <= 0) {
      y = 0
      vy = 0
      if (!grounded) grounded = true
      grounded = true
      coyote = 0.12
    } else grounded = false

    const moving = grounded && Math.hypot(vx, vz) > 0.55
    if (moving) bobPhase += Math.hypot(vx, vz) * dt * 2.15
    const targetBob = moving && !reduced ? Math.sin(bobPhase) * 0.045 : 0
    bobY += (targetBob - bobY) * (1 - Math.exp(-10 * dt))
    if (moving) {
      stepAcc += Math.hypot(vx, vz) * dt
      if (stepAcc > 2.05) {
        stepAcc = 0
        audio.step()
      }
    }

    for (const spike of spikes) {
      const on = y < 0.55 && Math.hypot(x - spike.x, z - spike.z) < 0.72
      if (spike.state === "idle") {
        if (on) {
          spike.state = "windup"
          spike.t = 0.18
          spike.hit = false
        }
      } else {
        spike.t -= dt
        if (spike.t <= 0) {
          if (spike.state === "windup") {
            spike.state = "up"
            spike.t = 0.42
            if (on && !spike.hit) {
              spike.hit = true
              hurt(2, { iframe: true, text: "Spikes — 1 heart", sx: spike.x, sz: spike.z, knock: true })
              if (phase !== "play") return
            }
          } else if (spike.state === "up") {
            spike.state = "down"
            spike.t = 0.28
          } else spike.state = "idle"
        }
      }
      const targetY = spike.state === "up" ? 0.18 : spike.state === "windup" ? -0.42 : -0.75
      spike.spikes.position.y += (targetY - spike.spikes.position.y) * (1 - Math.exp(-16 * dt))
    }

    const period = 2.7
    for (const fire of fires) {
      const t = (clock + fire.phase) % period
      const active = t > period - 0.5
      const warning = !active && t > period - 0.95
      const burstId = Math.floor((clock + fire.phase) / period)
      fire.mat.opacity = active ? 0.95 : warning ? 0.45 : 0.16
      const s = active ? 1 : warning ? 0.38 : 0.14
      for (const cone of fire.cones) cone.scale.set(1, s, 1)
      const on = y < 1.35 && Math.hypot(x - fire.x, z - fire.z) < 0.78
      if (active && on && fire.lastBurst !== burstId) {
        fire.lastBurst = burstId
        hurt(2, { iframe: true, text: "Fire — 1 heart", sx: fire.x, sz: fire.z, knock: true })
        if (phase !== "play") return
      }
    }

    let inSlime = false
    if (y < 0.34) {
      for (const slime of slimes) {
        if (Math.hypot(x - slime.x, z - slime.z) < 1.02) inSlime = true
      }
    }
    slowed = inSlime
    if (inSlime) {
      slimeAcc += dt
      if (slimeAcc >= 1) {
        slimeAcc -= 1
        hurt(1, { iframe: false, text: "Slime — ½ heart" })
        if (phase !== "play") return
      }
    } else slimeAcc = Math.max(0, slimeAcc - dt)

    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i]!
      if (!gem.alive) continue
      if (Math.hypot(x - gem.mesh.position.x, z - gem.mesh.position.z) < 0.95) {
        gem.alive = false
        gem.mesh.visible = false
        gemsGot++
        audio.gem()
        push(true)
      }
    }

    for (const drop of loose) {
      if (!drop.alive) continue
      if (Math.hypot(x - drop.x, z - drop.z) < 1) {
        drop.alive = false
        drop.mesh.visible = false
        reserve += drop.rounds
        audio.pickup()
        say(`+${drop.rounds} rounds`)
        push(true)
      }
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i]!
      if (Math.hypot(x - drop.x, z - drop.z) > 1.05) continue
      const slot = firstEmpty()
      if (slot < 0) {
        if (fullCd <= 0) {
          fullCd = 1.4
          say("Pack is full")
          push(true)
        }
        continue
      }
      slots[slot] = drop.item
      scene.remove(drop.mesh)
      drops.splice(i, 1)
      audio.pickup()
      say(drop.item.name)
      push(true)
    }

    for (const e of enemies) {
      if (!e.alive) continue
      const edist = Math.hypot(e.x - x, e.z - z)
      const see = edist < (e.kind === "goblin" ? 11 : 12.5) && los(e.x, e.z, x, z)
      if (see) {
        e.alert = true
        e.memory = 2.3
      } else {
        e.memory -= dt
        if (e.memory <= 0) e.alert = false
      }
      e.think -= dt
      e.attackCd = Math.max(0, e.attackCd - dt)
      if (e.think <= 0) {
        e.think = 0.34
        if (e.alert) {
          e.path =
            bfs(Math.floor(e.x / CELL), Math.floor(e.z / CELL), Math.floor(x / CELL), Math.floor(z / CELL)) ??
            []
        } else e.path = []
      }
      if (e.alert && edist > 1.15) {
        let tx = x
        let tz = z
        if (e.path.length) {
          const ecx = Math.floor(e.x / CELL)
          const ecz = Math.floor(e.z / CELL)
          if (e.path[0] && e.path[0].x === ecx && e.path[0].z === ecz) e.path.shift()
          const n = e.path[0]
          if (n) {
            tx = (n.x + 0.5) * CELL
            tz = (n.z + 0.5) * CELL
          }
        }
        const dx = tx - e.x
        const dz = tz - e.z
        const len = Math.hypot(dx, dz) || 1
        const sp = (e.kind === "goblin" ? 2.55 : 1.82) * dt
        const mxE = (dx / len) * sp
        const mzE = (dz / len) * sp
        if (!blocked(e.x + mxE, e.z, 0.32)) e.x += mxE
        if (!blocked(e.x, e.z + mzE, 0.32)) e.z += mzE
      }
      const range = e.kind === "goblin" ? 1.38 : 1.55
      if (e.alert && edist < range && e.attackCd <= 0 && e.windup <= 0) {
        e.windup = e.kind === "goblin" ? 0.22 : 0.36
        e.attackCd = e.kind === "goblin" ? 1.05 : 1.35
      }
      if (e.windup > 0) {
        e.windup -= dt
        if (e.windup <= 0) {
          const d2 = Math.hypot(e.x - x, e.z - z)
          const reach = e.kind === "goblin" ? 1.55 : 1.75
          if (d2 < reach && y < 0.5 && los(e.x, e.z, x, z)) {
            if (e.kind === "goblin") {
              hurt(1, { iframe: true, text: "Goblin — ½ heart", sx: e.x, sz: e.z, knock: true })
            } else {
              hurt(2, { iframe: true, text: "Orc — 1 heart", sx: e.x, sz: e.z, knock: true })
            }
            if (phase !== "play") return
          }
        }
      }
      e.flash = Math.max(0, e.flash - dt)
      if (e.windup > 0) e.skin.emissive.setHex(0xe3923a)
      else if (e.flash > 0) e.skin.emissive.setHex(0xfff6ea)
      else e.skin.emissive.setHex(0x000000)
      e.skin.emissiveIntensity = e.windup > 0 || e.flash > 0 ? 0.65 : 0
      const ratio = Math.max(0.02, e.hp / e.max)
      e.fill.scale.x = ratio
      e.fill.position.x = -0.24 * (1 - ratio)
      e.bar.visible = e.hp < e.max
      const bob = Math.sin(clock * (e.kind === "goblin" ? 8 : 5.5) + e.yaw) * (e.alert ? 0.04 : 0.015)
      e.group.position.set(e.x, bob, e.z)
      if (e.alert) e.group.lookAt(x, bob, z)
      else e.group.rotation.set(0, e.yaw, 0)
    }

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i]!
        const b = enemies[j]!
        if (!a.alive || !b.alive) continue
        const dx = b.x - a.x
        const dz = b.z - a.z
        const d = Math.hypot(dx, dz)
        if (d > 0.001 && d < 0.85) {
          const pushAmt = (0.85 - d) * 0.5
          const nxE = (dx / d) * pushAmt
          const nzE = (dz / d) * pushAmt
          if (!blocked(a.x - nxE, a.z - nzE, 0.3)) {
            a.x -= nxE
            a.z -= nzE
          }
          if (!blocked(b.x + nxE, b.z + nzE, 0.3)) {
            b.x += nxE
            b.z += nzE
          }
        }
      }
    }

    const ex = (maze.exit.x + 0.5) * CELL
    const ez = (maze.exit.z + 0.5) * CELL
    if (Math.hypot(x - ex, z - ez) < 0.85 && y < 0.45) {
      phase = "won"
      audio.win()
      if (document.pointerLockElement) document.exitPointerLock()
      say("You found the way out", 2)
      push(true)
      return
    }

    reveal(x, z)
    const target = nearest()
    let nextNear = ""
    if (target?.kind === "chest") nextNear = "Open chest"
    else if (target?.kind === "gate") {
      const g = maze.gates[target.i]!
      const has = slots.some((s) => s && s.kind === "key" && s.keyColor === g.keyColor)
      const label = g.keyColor[0]!.toUpperCase() + g.keyColor.slice(1)
      nextNear = has ? `Unlock ${label.toLowerCase()} gate` : `${label} gate is locked`
    }
    if (nextNear !== near) {
      near = nextNear
      push(true)
    }

    if (first && attackEdge) {
      attackEdge = false
      if (fireCd <= 0) shoot()
    }
    if (first && useEdge) {
      useEdge = false
      interact()
    }
    if (first && reloadEdge) {
      reloadEdge = false
      if (!reloading && mag < MAG_SIZE && reserve > 0) {
        reloading = true
        reloadT = 0.9
      }
    }
    if (first) jumpEdge = false

    for (const c of chests) {
      if (c.opened) c.anim += (1 - c.anim) * (1 - Math.exp(-8 * dt))
      c.lid.rotation.x = -c.anim * 1.35
    }
    gateGroups.forEach((g, i) => {
      const want = gatesOpen[i] ? 1 : 0
      g.anim += (want - g.anim) * (1 - Math.exp(-7 * dt))
      g.group.position.y = -g.anim * 2.75
    })

    for (const p of parts) {
      if (p.life <= 0) continue
      p.life -= dt
      p.v.y -= 8 * dt
      p.mesh.position.addScaledVector(p.v, dt)
      if (p.life <= 0) p.mesh.visible = false
    }

    snapAcc += dt
    if (snapAcc >= 0.12) push(true)
  }

  function drawMap() {
    if (!mapCtx) return
    const S = 192
    mapCtx.fillStyle = "#241f1a"
    mapCtx.fillRect(0, 0, S, S)
    const pad = 8
    const cw = (S - pad * 2) / W
    for (let gz = 0; gz < H; gz++) {
      for (let gx = 0; gx < W; gx++) {
        if (!explored[gz * W + gx]) continue
        mapCtx.fillStyle = grid[gz * W + gx] ? "#d9c6b0" : "#2c261f"
        mapCtx.fillRect(pad + gx * cw, pad + gz * cw, cw + 0.6, cw + 0.6)
      }
    }
    for (let i = 0; i < maze.gates.length; i++) {
      const g = maze.gates[i]!
      if (!explored[g.z * W + g.x]) continue
      mapCtx.fillStyle = gatesOpen[i] ? "#3a332c" : g.keyColor === "gold" ? "#e6c15a" : g.keyColor === "silver" ? "#f6efe4" : "#e3923a"
      mapCtx.fillRect(pad + g.x * cw + cw * 0.15, pad + g.z * cw + cw * 0.4, cw * 0.7, cw * 0.22)
    }
    mapCtx.fillStyle = "#e3923a"
    for (const c of chests) {
      const cx = Math.floor(c.wx / CELL)
      const cz = Math.floor(c.wz / CELL)
      if (!c.loot.length || !explored[cz * W + cx]) continue
      mapCtx.fillRect(pad + cx * cw + cw * 0.35, pad + cz * cw + cw * 0.35, cw * 0.3, cw * 0.3)
    }
    if (explored[maze.exit.z * W + maze.exit.x]) {
      mapCtx.fillStyle = "#d4533c"
      mapCtx.fillRect(
        pad + maze.exit.x * cw + 1.5,
        pad + maze.exit.z * cw + 1.5,
        cw - 3,
        cw - 3,
      )
    }
    const px = pad + (x / CELL) * cw
    const py = pad + (z / CELL) * cw
    const fwx = -Math.sin(yaw)
    const fwz = -Math.cos(yaw)
    mapCtx.save()
    mapCtx.translate(px, py)
    mapCtx.rotate(Math.atan2(fwx, -fwz))
    mapCtx.fillStyle = "#e3923a"
    mapCtx.beginPath()
    mapCtx.moveTo(0, -5.5)
    mapCtx.lineTo(4.2, 4.5)
    mapCtx.lineTo(-4.2, 4.5)
    mapCtx.closePath()
    mapCtx.fill()
    mapCtx.restore()
  }

  function render(frameDt: number) {
    const now = performance.now() / 1000
    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i]!
      if (!gem.alive) continue
      gem.mesh.rotation.y = now * 1.5 + i
      gem.mesh.position.y = 0.58 + Math.sin(now * 2.2 + i) * 0.08
    }
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i]!
      drop.mesh.position.y = 0.36 + Math.sin(now * 2.4 + i) * 0.06
      drop.mesh.rotation.y = now
    }
    for (const a of loose) {
      if (!a.alive) continue
      a.mesh.rotation.y = now * 1.2
      a.mesh.position.y = 0.2 + Math.sin(now * 3 + a.x) * 0.04
    }
    for (const slime of slimes) {
      slime.bubbles.forEach((b, i) => {
        b.position.y = 0.16 + Math.sin(now * 3 + i) * 0.04
      })
    }
    veil.position.y = 1.15
    const flick = torchOn ? 1 + Math.sin(now * 17) * 0.05 + Math.sin(now * 29) * 0.03 : 0.08
    gunSwayX += (-aimDx * 0.0011 - gunSwayX) * 0.28
    gunSwayY += (aimDy * 0.0007 - gunSwayY) * 0.28
    torchLight.intensity = 14 * flick
    torchLight.position.set(x, y + 1.35, z)
    muzzleLight.intensity = muzzle > 0 ? 16 : 0
    flame.scale.set(1, torchOn ? 0.85 + Math.sin(now * 23) * 0.18 : 0.2, 1)
    flame.visible = true
    const bobX = movingNow() && !reduced ? Math.cos(bobPhase * 0.5) * 0.012 : 0
    gun.position.x = 0.28 + bobX + Math.max(-0.05, Math.min(0.05, gunSwayX))
    gun.position.y = -0.26 - (movingNow() ? Math.abs(Math.sin(bobPhase)) * 0.012 : 0) + Math.max(-0.04, Math.min(0.04, gunSwayY))
    gun.position.z = -0.5 + gunKick * 0.07
    gun.rotation.x = -recoilKick * 0.8
    gun.rotation.z = reloading ? Math.sin((1 - reloadT / 0.9) * Math.PI) * 0.45 : 0
    flash.visible = muzzle > 0.01
    flash.scale.setScalar(0.6 + muzzle * 18)
    torch.position.y = -0.28 + (movingNow() ? Math.sin(bobPhase + 1) * 0.01 : 0)
    syncRig()
    drawMap()
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w > 2 && h > 2) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        renderer.setPixelRatio(dpr)
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(1, h)
        camera.updateProjectionMatrix()
        viewCam.aspect = camera.aspect
        viewCam.updateProjectionMatrix()
      }
      renderer.clear()
      renderer.render(scene, camera)
      renderer.clearDepth()
      renderer.render(viewScene, viewCam)
    }
    void frameDt
  }

  function movingNow() {
    return grounded && Math.hypot(vx, vz) > 0.55 && phase === "play"
  }

  const BLOCK = new Set([
    "Space",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Tab",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
  ])

  function onKeyDown(e: KeyboardEvent) {
    scripted = false
    keys.add(e.code)
    if (BLOCK.has(e.code)) e.preventDefault()
  }
  function onKeyUp(e: KeyboardEvent) {
    if (scripted) return
    keys.delete(e.code)
  }
  function onBlur() {
    if (!scripted) keys.clear()
  }
  function onVis() {
    if (document.hidden) {
      if (!scripted) keys.clear()
      audio.suspend()
    } else {
      last = performance.now()
      audio.resume()
    }
  }
  function onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement !== canvas || phase !== "play") return
    lookDx += e.movementX
    lookDy += e.movementY
  }
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    if (document.pointerLockElement === canvas && phase === "play") attackEdge = true
  }
  function onLockChange() {
    locked = document.pointerLockElement === canvas
    push(true)
  }
  function onContext(e: Event) {
    e.preventDefault()
  }

  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)
  window.addEventListener("blur", onBlur)
  document.addEventListener("visibilitychange", onVis)
  window.addEventListener("mousemove", onMouseMove)
  window.addEventListener("mousedown", onMouseDown)
  document.addEventListener("pointerlockchange", onLockChange)
  canvas.addEventListener("contextmenu", onContext)

  let raf = 0
  let last = performance.now()
  let acc = 0
  function frame(now: number) {
    if (disposed) return
    frames++
    let raw = (now - last) / 1000
    last = now
    if (document.hidden) raw = 0
    else if (raw > 0.1) raw = 0.1
    const frameDt = Math.max(0, raw)
    acc += frameDt
    pollEdges()
    const tx = touchX
    const ty = touchY
    pollGamepad(frameDt)
    if (phase === "play" && !scripted) {
      const cap = 120
      const dx = Math.max(-cap, Math.min(cap, lookDx))
      const dy = Math.max(-cap, Math.min(cap, lookDy))
      yaw -= dx * 0.00235
      pitch -= dy * 0.00235
      const lim = Math.PI / 2 - 0.04
      if (pitch > lim) pitch = lim
      if (pitch < -lim) pitch = -lim
    }
    let first = true
    let steps = 0
    while (acc >= STEP && steps < 6) {
      tick(STEP, first)
      first = false
      steps++
      acc -= STEP
    }
    aimDx = lookDx
    aimDy = lookDy
    lookDx = 0
    lookDy = 0
    touchX = tx
    touchY = ty
    render(frameDt)
    raf = requestAnimationFrame(frame)
  }

  resetRuntime()
  const getYaw = () => yaw
  const getSpeed = () => Math.hypot(vx, vz)
  const getPos = () => ({ x, y, z })
  window.__controlsTest = {
    getYaw,
    getSpeed,
    getPos,
    getFrames: () => frames,
    getHeld: () => [...keys],
    setKeys(codes: string[]) {
      scripted = true
      keys.clear()
      for (const code of codes) keys.add(code)
    },
    faceSpawn() {
      yaw = startYaw
      pitch = 0
    },
  }
  const owned = token
  ;(window as Window & { __lanternToken?: object }).__lanternToken = owned

  push(true)
  onReady()
  raf = requestAnimationFrame(frame)

  return {
    start() {
      audio.unlock()
      if (phase !== "menu") return
      phase = "play"
      push(true)
    },
    restart() {
      audio.unlock()
      resetRuntime()
      phase = "play"
      push(true)
    },
    resume() {
      if (phase === "paused" || phase === "inventory") {
        phase = "play"
        push(true)
      }
    },
    setInventory(open: boolean) {
      if (open && (phase === "play" || phase === "paused")) {
        phase = "inventory"
        if (document.pointerLockElement) document.exitPointerLock()
        push(true)
      } else if (!open && phase === "inventory") {
        phase = "play"
        push(true)
      }
    },
    useItem,
    moveItem,
    dropItem,
    toggleTorch() {
      torchOn = !torchOn
      say(torchOn ? "Torch up" : "Torch low", 0.7)
      push(true)
    },
    setMove(mx: number, my: number) {
      touchX = mx
      touchY = my
    },
    addLook(dx: number, dy: number) {
      lookDx += dx * 2.15
      lookDy += dy * 2.15
    },
    pokeAttack() {
      if (phase === "play") attackEdge = true
    },
    pokeJump() {
      if (phase === "play") jumpEdge = true
    },
    pokeUse() {
      if (phase === "play") useEdge = true
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("pointerlockchange", onLockChange)
      canvas.removeEventListener("contextmenu", onContext)
      const dumped = new Set<object>()
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry && !dumped.has(mesh.geometry)) {
          dumped.add(mesh.geometry)
          mesh.geometry.dispose()
        }
        const mats = mesh.material
        const list = Array.isArray(mats) ? mats : mats ? [mats] : []
        for (const mat of list) {
          if (!dumped.has(mat)) {
            dumped.add(mat)
            mat.dispose()
          }
        }
      })
      viewScene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry && !dumped.has(mesh.geometry)) {
          dumped.add(mesh.geometry)
          mesh.geometry.dispose()
        }
        const mats = mesh.material
        const list = Array.isArray(mats) ? mats : mats ? [mats] : []
        for (const mat of list) {
          if (!dumped.has(mat)) {
            dumped.add(mat)
            mat.dispose()
          }
        }
      })
      renderer.dispose()
      const holder = window as Window & { __lanternToken?: object }
      if (holder.__lanternToken === owned) {
        delete window.__controlsTest
        delete holder.__lanternToken
      }
    },
  }
}
