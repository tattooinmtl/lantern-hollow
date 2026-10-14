export type KeyColor = "bronze" | "silver" | "gold"

export type LootTemplate =
  | { kind: "key"; keyColor: KeyColor; name: string }
  | { kind: "potion"; heal: number; name: string }
  | { kind: "ammo"; rounds: number; name: string }
  | { kind: "relic"; name: string }

export type Item = LootTemplate & { id: string }

export type Phase = "menu" | "play" | "paused" | "inventory" | "dead" | "won"

export type Snapshot = {
  phase: Phase
  hp: number
  mag: number
  reserve: number
  /** 0 when idle, otherwise 0–1 reload progress. */
  reload: number
  time: number
  gems: number
  gemsTotal: number
  kills: number
  slots: (Item | null)[]
  toast: string
  torch: boolean
  slowed: boolean
  hurt: number
  hit: number
  near: string
  seed: number
  locked: boolean
  error: string
}

export const MAX_HP = 10
export const MAG_SIZE = 8
export const SLOT_COUNT = 8
