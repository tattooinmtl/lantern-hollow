export function createAudio() {
  let ctx: AudioContext | null = null
  let noise: AudioBuffer | null = null

  function ac() {
    if (typeof AudioContext === "undefined") return null
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctor()
      const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate)
      const d = n.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      noise = n
    }
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
    const c = ac()
    if (!c) return
    const t = c.currentTime
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(Math.max(40, freq), t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  function burst(dur: number, gain: number, freq = 800) {
    const c = ac()
    if (!c || !noise) return
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = noise
    const filter = c.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = freq
    filter.Q.value = 0.7
    const g = c.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(c.destination)
    src.start(t)
    src.stop(t + dur)
  }

  return {
    unlock() {
      ac()
    },
    suspend() {
      if (ctx && ctx.state === "running") void ctx.suspend()
    },
    resume() {
      if (ctx && ctx.state === "suspended") void ctx.resume()
    },
    shot() {
      burst(0.09, 0.12, 1400)
      tone(180, 0.07, "square", 0.04, -80)
    },
    empty() {
      tone(420, 0.04, "square", 0.03)
    },
    impact() {
      burst(0.05, 0.05, 500)
    },
    hit() {
      tone(660, 0.06, "square", 0.05, 220)
    },
    kill() {
      tone(520, 0.09, "triangle", 0.06, 180)
      tone(780, 0.12, "sine", 0.04, 40)
    },
    hurt() {
      tone(140, 0.18, "sawtooth", 0.05, -80)
      burst(0.12, 0.06, 200)
    },
    die() {
      tone(180, 0.4, "triangle", 0.07, -120)
    },
    jump() {
      tone(240, 0.09, "sine", 0.04, 180)
    },
    step() {
      burst(0.04, 0.035, 280)
    },
    pickup() {
      tone(680, 0.07, "sine", 0.05, 180)
    },
    chest() {
      tone(330, 0.08, "triangle", 0.05, 40)
      tone(494, 0.12, "sine", 0.04, 20)
    },
    gate() {
      burst(0.18, 0.06, 180)
      tone(90, 0.22, "square", 0.04, -30)
    },
    potion() {
      tone(520, 0.1, "sine", 0.05, 200)
      tone(780, 0.14, "sine", 0.04, 80)
    },
    reload() {
      tone(240, 0.05, "square", 0.03, 60)
    },
    win() {
      tone(523, 0.12, "triangle", 0.05)
      setTimeout(() => tone(659, 0.12, "triangle", 0.05), 110)
      setTimeout(() => tone(784, 0.2, "triangle", 0.06), 220)
    },
    gem() {
      tone(880, 0.08, "sine", 0.04, 120)
    },
  }
}

export type AudioBus = ReturnType<typeof createAudio>
