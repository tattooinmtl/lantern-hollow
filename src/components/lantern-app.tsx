import { useEffect, useRef, useState } from "react"
import { Backpack, Boxes, Flame, FlaskConical, Gem, KeyRound } from "lucide-react"
import type { GameHandle } from "@/game/engine"
import { SLOT_COUNT, type Item, type Snapshot } from "@/game/types"

const BEST_KEY = "lantern-hollow-v1"
const HEART =
  "M12 20.6s-6.9-4.3-9.2-8.2C1.2 9.7 1.7 6.4 4.3 5c2-1.1 4.2-.4 5.6 1.5L12 8.7l2.1-2.2C15.5 4.6 17.7 3.9 19.7 5c2.6 1.4 3.1 4.7 1.5 7.4-2.3 3.9-9.2 8.2-9.2 8.2z"

const EMPTY: Snapshot = {
  phase: "menu",
  hp: 10,
  mag: 8,
  reserve: 0,
  reload: 0,
  time: 0,
  gems: 0,
  gemsTotal: 0,
  kills: 0,
  slots: Array.from({ length: SLOT_COUNT }, () => null),
  toast: "",
  torch: true,
  slowed: false,
  hurt: 0,
  hit: 0,
  near: "",
  seed: 0,
  locked: false,
  error: "",
}

function readBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (!raw) return null
    const n = Number((JSON.parse(raw) as { best?: number }).best)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeBest(time: number) {
  try {
    const prev = readBest()
    if (prev == null || time < prev) localStorage.setItem(BEST_KEY, JSON.stringify({ v: 1, best: time }))
  } catch {
    /* private mode */
  }
}

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function heartsLabel(hp: number) {
  const n = hp / 2
  return Number.isInteger(n) ? `${n}` : `${Math.floor(n)}½`
}

function Hearts({ hp }: { hp: number }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${heartsLabel(hp)} of 5 hearts`}>
      {Array.from({ length: 5 }, (_, i) => {
        const left = hp - i * 2
        const fill: 0 | 0.5 | 1 = left >= 2 ? 1 : left >= 1 ? 0.5 : 0
        return (
          <svg key={i} viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
            <defs>
              <clipPath id={`lh-heart-${i}`}>
                <rect x="0" y="0" width="12" height="24" />
              </clipPath>
            </defs>
            <path d={HEART} fill="var(--color-border)" />
            {fill > 0 ? (
              <path d={HEART} fill="var(--color-danger)" clipPath={fill === 0.5 ? `url(#lh-heart-${i})` : undefined} />
            ) : null}
          </svg>
        )
      })}
    </div>
  )
}

function ItemGlyph({ item }: { item: Item }) {
  if (item.kind === "key") return <KeyRound className={item.keyColor === "silver" ? "text-fg" : "text-accent"} />
  if (item.kind === "potion") return <FlaskConical className="text-danger" />
  if (item.kind === "ammo") return <Boxes className="text-accent" />
  return <Gem className="text-fg" />
}

type Drag = { index: number; x: number; y: number; ox: number; oy: number; moved: boolean }

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  function down(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!origin.current || origin.current.id !== e.pointerId) return
    let dx = e.clientX - origin.current.x
    let dy = e.clientY - origin.current.y
    const m = Math.hypot(dx, dy)
    const max = 42
    if (m > max) {
      dx = (dx / m) * max
      dy = (dy / m) * max
    }
    setKnob({ x: dx, y: dy })
    onChange(dx / max, -dy / max)
  }
  function up(e: React.PointerEvent<HTMLDivElement>) {
    if (origin.current?.id !== e.pointerId) return
    origin.current = null
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }
  return (
    <div
      className="stick"
      data-ui
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-label="Move"
    >
      <b style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  )
}

export function LanternApp() {
  const [seed, setSeed] = useState(20261013)
  return (
    <LanternSession
      key={seed}
      seed={seed}
      onNew={() => setSeed((s) => (Math.imul(s ^ 0x9e3779b9, 1664525) + 1013904223) >>> 0)}
    />
  )
}

function LanternSession({ seed, onNew }: { seed: number; onNew: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mapRef = useRef<HTMLCanvasElement>(null)
  const handleRef = useRef<GameHandle | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef<Snapshot["phase"]>("menu")
  const pending = useRef(false)
  const lookId = useRef<number | null>(null)
  const lookLast = useRef({ x: 0, y: 0 })
  const [snap, setSnap] = useState<Snapshot>({ ...EMPTY, seed })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [best, setBest] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const savedWin = useRef(false)

  phaseRef.current = snap.phase

  useEffect(() => {
    setBest(readBest())
  }, [])

  useEffect(() => {
    if (snap.phase === "won" && !savedWin.current) {
      savedWin.current = true
      writeBest(snap.time)
      setBest(readBest())
    }
    if (snap.phase === "play") savedWin.current = false
  }, [snap.phase, snap.time])

  useEffect(() => {
    const canvas = canvasRef.current
    const minimap = mapRef.current
    if (!canvas || !minimap) return
    let dead = false
    let handle: GameHandle | null = null
    void import("@/game/engine").then((mod) => {
      if (dead) return
      handle = mod.mountGame({
        canvas,
        minimap,
        seed,
        onSnapshot: (next) => {
          if (!dead) setSnap(next)
        },
        onReady: () => {
          if (dead) return
          setReady(true)
          if (pending.current) {
            pending.current = false
            handle?.start()
            lock(canvas)
          }
        },
        onError: (message) => {
          if (!dead) setError(message)
        },
      })
      handleRef.current = handle
    })
    return () => {
      dead = true
      handle?.dispose()
      handleRef.current = null
    }
  }, [seed])

  function lock(target?: HTMLCanvasElement | null) {
    const canvas = target ?? canvasRef.current
    if (!canvas?.requestPointerLock) return
    try {
      const req = canvas.requestPointerLock({ unadjustedMovement: true })
      void Promise.resolve(req).catch(() => {
        try {
          void Promise.resolve(canvas.requestPointerLock()).catch(() => {})
        } catch {
          /* pointer lock is optional */
        }
      })
    } catch {
      /* pointer lock is optional */
    }
  }

  function onStart() {
    if (error) return
    if (handleRef.current && ready) {
      handleRef.current.start()
      lock()
    } else pending.current = true
  }

  function onRootPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== "play") return
    const target = e.target as HTMLElement | null
    if (target?.closest?.("[data-ui]")) return
    if (e.pointerType === "mouse") {
      if (e.button === 0) lock()
      return
    }
    lookId.current = e.pointerId
    lookLast.current = { x: e.clientX, y: e.clientY }
  }

  function onRootPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (lookId.current !== e.pointerId) return
    const dx = e.clientX - lookLast.current.x
    const dy = e.clientY - lookLast.current.y
    lookLast.current = { x: e.clientX, y: e.clientY }
    handleRef.current?.addLook(dx, dy)
  }

  function onRootPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (lookId.current === e.pointerId) lookId.current = null
  }

  function onSlotDown(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (!snap.slots[index]) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ index, x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, moved: false })
  }

  function onSlotMove(e: React.PointerEvent<HTMLButtonElement>) {
    setDrag((current) => {
      if (!current) return current
      const moved = current.moved || Math.hypot(e.clientX - current.ox, e.clientY - current.oy) > 8
      return { ...current, x: e.clientX, y: e.clientY, moved }
    })
  }

  function onSlotUp(e: React.PointerEvent<HTMLButtonElement>) {
    setDrag((current) => {
      if (!current) return null
      const handle = handleRef.current
      if (!current.moved) {
        handle?.activateItem(current.index)
      } else {
        const panel = panelRef.current?.getBoundingClientRect()
        const inside =
          !!panel &&
          e.clientX >= panel.left &&
          e.clientX <= panel.right &&
          e.clientY >= panel.top &&
          e.clientY <= panel.bottom
        if (!inside) handle?.dropItem(current.index)
        else {
          const el = document.elementFromPoint(e.clientX, e.clientY)
          const slot = el?.closest("[data-slot]")
          const to = slot instanceof HTMLElement ? Number(slot.dataset.slot) : NaN
          if (Number.isInteger(to) && to !== current.index) handle?.moveItem(current.index, to)
        }
      }
      return null
    })
  }

  const playing = snap.phase === "play"
  const relic = snap.slots.some((s) => s?.kind === "relic")
  const dragged = drag ? snap.slots[drag.index] : null

  return (
    <div
      className="game-root"
      onPointerDown={onRootPointerDown}
      onPointerMove={onRootPointerMove}
      onPointerUp={onRootPointerUp}
      onPointerCancel={onRootPointerUp}
    >
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="vignette" />
      {snap.hurt > 0.02 ? <div className="hurt-veil" style={{ opacity: Math.min(0.45, snap.hurt * 0.5) }} /> : null}
      {snap.slowed && playing ? <div className="slime-veil" /> : null}
      {playing ? (
        <div className={`crosshair ${snap.hit > 0 ? "is-hit" : ""}`} aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
      ) : null}

      <header className="hud-top pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-3">
        <div className="flex flex-col gap-2">
          <Hearts hp={snap.hp} />
          <div className="flex items-center gap-2" aria-label={`${snap.mag} of 8 rounds, ${snap.reserve} spare`}>
            <span className="flex gap-1">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className={`h-2 w-2 rounded-full ${i < snap.mag ? "bg-accent" : "bg-border"}`} />
              ))}
            </span>
            <span className="text-sm text-muted tabular-nums">{snap.reserve}</span>
            <Flame className={`h-4 w-4 ${snap.torch ? "text-accent" : "text-muted"}`} aria-hidden />
          </div>
          {snap.reload > 0 ? (
            <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-accent" style={{ width: `${Math.round(snap.reload * 100)}%` }} />
            </div>
          ) : null}
          {snap.slowed && playing ? <p className="text-xs text-accent">Slowed by slime</p> : null}
        </div>
        <div className="flex flex-col items-center gap-1 pt-1">
          <p className="font-display text-xl tabular-nums text-fg">{formatTime(snap.time)}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Gem className="h-3.5 w-3.5 text-accent" aria-hidden />
            {snap.gems}/{snap.gemsTotal || "–"}
          </p>
        </div>
        <canvas ref={mapRef} data-ui className="minimap pointer-events-auto" aria-label="Explored maze" />
      </header>

      {snap.toast ? (
        <p className="pointer-events-none absolute top-28 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-fg" aria-live="polite">
          {snap.toast}
        </p>
      ) : null}

      {playing && snap.near ? (
        <p className="near-prompt pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-fg">
          {snap.near}
          <span className="key-hints ml-2 text-muted">E</span>
        </p>
      ) : null}

      {playing && !snap.locked ? (
        <p className="look-hint pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 translate-y-8 text-sm text-muted">
          Click to look
        </p>
      ) : null}

      {playing ? (
        <div className="touch-controls pointer-events-none absolute inset-x-0 bottom-4 z-10 items-end justify-between px-4 pb-[env(safe-area-inset-bottom)]">
          <Joystick
            onChange={(x, y) => {
              handleRef.current?.setMove(x, y)
            }}
          />
          <div className="pointer-events-auto flex flex-col items-end gap-2" data-ui>
            <div className="flex gap-2">
              <button type="button" className="pad-btn" aria-label="Torch" onPointerDown={(e) => { e.stopPropagation(); handleRef.current?.toggleTorch() }}>
                <Flame className="h-5 w-5" />
              </button>
              <button type="button" className="pad-btn" aria-label="Pack" onPointerDown={(e) => { e.stopPropagation(); handleRef.current?.setInventory(true) }}>
                <Backpack className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-end gap-2">
              <button type="button" className="pad-btn" aria-label="Jump" onPointerDown={(e) => { e.stopPropagation(); handleRef.current?.pokeJump() }}>
                <small>JUMP</small>
              </button>
              <button type="button" className="pad-btn" aria-label="Use" onPointerDown={(e) => { e.stopPropagation(); handleRef.current?.pokeUse() }}>
                <small>USE</small>
              </button>
              <button type="button" className="pad-btn primary" aria-label="Fire" onPointerDown={(e) => { e.stopPropagation(); handleRef.current?.pokeAttack() }}>
                <small>FIRE</small>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {playing ? (
        <p className="key-hints pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-xs text-muted">
          WASD move · mouse look · Space jump · click fire · R reload · F torch · E use · Tab pack
        </p>
      ) : null}

      {snap.phase === "menu" ? (
        <div data-ui className="absolute inset-0 z-20 flex items-end justify-center p-4 sm:items-center">
          <div className="max-h-[92dvh] w-full max-w-md overflow-auto rounded-2xl border border-border bg-surface p-6">
            <p className="text-xs tracking-widest text-accent uppercase">Pocket dungeon</p>
            <h1 className="font-display mt-1 text-4xl leading-tight text-fg">Lantern Hollow</h1>
            <p className="mt-2 text-muted">
              A low-poly night maze. Five hearts, eight shots, and a torch that actually matters.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">Move</dt>
                <dd>WASD and mouse. Space jumps. On a phone, stick and drag.</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">Fight</dt>
                <dd>Handgun, 8 rounds. Goblins take half a heart, orcs a full one. Kills drop bullets.</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">Pack</dt>
                <dd>Tab opens it. Click a brew to drink. Drag an item outside the pack to drop it.</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-muted">Traps</dt>
                <dd>Spikes and fire take a heart. Slime slows you and sips half a heart a second.</dd>
              </div>
            </dl>
            {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
            <button
              type="button"
              className="mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg disabled:opacity-50"
              onClick={onStart}
              disabled={!!error}
            >
              Start
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              Hollow {snap.seed || seed}
              {best != null ? ` · best ${formatTime(best)}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {snap.phase === "paused" ? (
        <div data-ui className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
            <h2 className="font-display text-3xl text-fg">Paused</h2>
            <p className="mt-2 text-sm text-muted">{formatTime(snap.time)} in the dark</p>
            <button
              type="button"
              className="mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg"
              onClick={() => {
                handleRef.current?.resume()
                lock()
              }}
            >
              Resume
            </button>
            <button
              type="button"
              className="mt-2 w-full rounded-full border border-border px-5 py-3 text-fg"
              onClick={() => handleRef.current?.setInventory(true)}
            >
              Open pack
            </button>
          </div>
        </div>
      ) : null}

      {snap.phase === "inventory" ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && !drag) handleRef.current?.setInventory(false)
          }}
        >
          <div ref={panelRef} data-ui className="w-full max-w-md rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl text-fg">Pack</h2>
              <button
                type="button"
                className="rounded-full border border-border px-4 py-2 text-sm text-fg"
                onClick={() => handleRef.current?.setInventory(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">Click a brew or tin to use it. Drag outside this card to drop it on the floor.</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {snap.slots.map((item, index) => (
                <button
                  key={item?.id ?? `empty-${index}`}
                  type="button"
                  data-slot={index}
                  className={`pack-slot ${item ? "is-filled" : ""} ${drag?.index === index ? "opacity-40" : ""}`}
                  onPointerDown={(e) => onSlotDown(e, index)}
                  onPointerMove={onSlotMove}
                  onPointerUp={onSlotUp}
                  onPointerCancel={onSlotUp}
                  aria-label={item ? item.name : "Empty slot"}
                >
                  {item ? (
                    <>
                      <ItemGlyph item={item} />
                      <span className="text-xs leading-tight text-fg">{item.name}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">Empty</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {drag && dragged ? (
        <div
          className="pointer-events-none fixed z-30 flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-2 text-sm text-fg"
          style={{ left: drag.x + 12, top: drag.y + 12 }}
        >
          <ItemGlyph item={dragged} />
          {dragged.name}
        </div>
      ) : null}

      {snap.phase === "dead" ? (
        <div data-ui className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-xs tracking-widest text-danger uppercase">Down</p>
            <h2 className="font-display mt-1 text-3xl text-fg">The hollow keeps you</h2>
            <p className="mt-2 text-sm text-muted">
              {formatTime(snap.time)} · {snap.gems} gems · {snap.kills} felled
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg"
              onClick={() => handleRef.current?.restart()}
            >
              Try again
            </button>
            <button type="button" className="mt-2 w-full rounded-full border border-border px-5 py-3 text-fg" onClick={onNew}>
              New hollow
            </button>
          </div>
        </div>
      ) : null}

      {snap.phase === "won" ? (
        <div data-ui className="absolute inset-0 z-20 flex items-center justify-center bg-bg/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-xs tracking-widest text-accent uppercase">Out</p>
            <h2 className="font-display mt-1 text-3xl text-fg">You found the way out</h2>
            <p className="mt-3 text-sm text-fg">
              {formatTime(snap.time)} · {heartsLabel(snap.hp)} hearts left
            </p>
            <p className="mt-1 text-sm text-muted">
              {snap.gems}/{snap.gemsTotal} gems · {snap.kills} felled
            </p>
            {relic ? <p className="mt-2 text-sm text-accent">The glass beetle came with you.</p> : null}
            {best != null ? <p className="mt-2 text-xs text-muted">Best descent {formatTime(best)}</p> : null}
            <button
              type="button"
              className="mt-5 w-full rounded-full bg-accent px-5 py-3 font-semibold text-bg"
              onClick={() => handleRef.current?.restart()}
            >
              Descend again
            </button>
            <button type="button" className="mt-2 w-full rounded-full border border-border px-5 py-3 text-fg" onClick={onNew}>
              New hollow
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
