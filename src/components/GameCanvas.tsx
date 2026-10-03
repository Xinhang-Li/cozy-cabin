import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildMap, collides, TILE, MAP_W, MAP_H, type HouseMap } from '@/game/map'
import type { NpcDef } from '@/game/npcs'
import { drawHouse, drawCharacter, drawNightOverlay, drawBubble, drawCat, drawDog, PLAYER_LOOK } from '@/game/render'
import { chatWithNpc, generateNpcDialogue, isAiReady, loadAiConfig } from '@/game/ai'
import { loadNpcDefs, loadHistories, saveHistories, loadAffinity, saveAffinity, loadGifts, saveGifts, loadRunState } from '@/game/store'
import { buildSaveData, writeSlot, AUTO_SLOT } from '@/game/save'
import { affinityInfo, POINTS_PER_CHAT } from '@/game/affinity'
import type { ChatMessage, FurnitureItem } from '@/game/types'
import ChatDialog from '@/components/ChatDialog'
import SettingsDialog from '@/components/SettingsDialog'
import CharacterCardDialog from '@/components/CharacterCardDialog'
import BackpackDialog from '@/components/BackpackDialog'
import NpcMenuDialog from '@/components/NpcMenuDialog'
import SaveDialog from '@/components/SaveDialog'
import FurnitureDialog from '@/components/FurnitureDialog'
import BakeGame from '@/components/minigames/BakeGame'
import GomokuGame from '@/components/minigames/GomokuGame'
import DebugGame from '@/components/minigames/DebugGame'
import QuizGame from '@/components/minigames/QuizGame'
import { Button } from '@/components/ui/button'

type Dir = 0 | 1 | 2 | 3 // 0下 1左 2右 3上
type Modal = 'chat' | 'furniture' | 'sleep' | 'npcmenu' | 'minigame' | null

interface NpcRuntime {
  def: NpcDef
  x: number
  y: number
  dir: Dir
  phase: number
  moving: boolean
  wpIdx: number
  wait: number
  stuck: number
  bubbleText?: string
  bubbleUntil?: number
}

interface Candidate {
  kind: 'npc' | 'furniture' | 'pet'
  npc?: NpcRuntime
  furniture?: FurnitureItem
  pet?: PetRuntime
  d: number
}

interface PetRuntime {
  kind: 'cat' | 'fatcat' | 'dog'
  name: string
  x: number
  y: number
  dir: Dir
  phase: number
  moving: boolean
  wpIdx: number
  wait: number
  stuck: number
  sleeping: boolean
  bubbleText?: string
  bubbleUntil: number
}

interface DialogueScript {
  lines: { npcId: string; text: string }[]
  idx: number
  until: number
}

const VIEW_W = MAP_W * TILE
const VIEW_H = MAP_H * TILE
const PROACTIVE_CHANCE = 0.2 // 靠近时 NPC 主动搭话概率
const NPC_CHAT_CHANCE = 0.2 // NPC 之间搭话概率
const CHECK_INTERVAL = 3.5 // 触发判定间隔（秒）
const PROACTIVE_COOLDOWN = 150 // 单个 NPC 主动搭话冷却（秒）
const PAIR_COOLDOWN = 60 // 同一对 NPC 互聊冷却（秒）

function tileCenter(t: number) {
  return t * TILE + TILE / 2
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const houseRef = useRef<HouseMap>(useMemo(buildMap, []))
  const [npcDefs, setNpcDefs] = useState<NpcDef[]>(loadNpcDefs)
  const npcDefsRef = useRef(npcDefs)
  useEffect(() => {
    npcDefsRef.current = npcDefs
    // 同步到运行时（保留位置等状态，只换角色卡）
    worldRef.current?.npcs.forEach((rt) => {
      const d = npcDefs.find((x) => x.id === rt.def.id)
      if (d) rt.def = d
    })
  }, [npcDefs])

  const worldRef = useRef({
    player: {
      x: loadRunState()?.playerX || tileCenter(houseRef.current.playerSpawn.x),
      y: loadRunState()?.playerY || tileCenter(houseRef.current.playerSpawn.y),
      dir: 0 as Dir,
      phase: 0,
      moving: false,
    },
    npcs: npcDefs.map((def, i) => ({
      def,
      x: tileCenter(def.waypoints[0].x),
      y: tileCenter(def.waypoints[0].y),
      dir: 0 as Dir,
      phase: i * 1.3,
      moving: false,
      wpIdx: 0,
      wait: 1 + i,
      stuck: 0,
    })) as NpcRuntime[],
    keys: new Set<string>(),
    day: loadRunState()?.day ?? 1,
    minutes: loadRunState()?.minutes ?? 8 * 60,
    candidate: null as Candidate | null,
    pets: [
      { kind: 'cat', name: '橘子', x: tileCenter(9), y: tileCenter(4), dir: 0 as Dir, phase: 0, moving: false, wpIdx: 0, wait: 2, stuck: 0, sleeping: false, bubbleText: undefined as string | undefined, bubbleUntil: 0 },
      { kind: 'fatcat', name: '煤球', x: tileCenter(23), y: tileCenter(6), dir: 0 as Dir, phase: 1.5, moving: false, wpIdx: 0, wait: 3, stuck: 0, sleeping: true, bubbleText: undefined as string | undefined, bubbleUntil: 0 },
      { kind: 'dog', name: '豆豆', x: tileCenter(6), y: tileCenter(8), dir: 0 as Dir, phase: 3, moving: false, wpIdx: 0, wait: 0, stuck: 0, sleeping: false, bubbleText: undefined as string | undefined, bubbleUntil: 0 },
    ] as PetRuntime[],
  })

  // 宠物配置
  const PET_DEFS: Record<string, { waypoints: { x: number; y: number }[]; speed: number }> = {
    cat: {
      waypoints: [
        { x: 4, y: 4 }, { x: 11, y: 8 }, { x: 3, y: 16 }, { x: 11, y: 13 },
        { x: 18, y: 3 }, { x: 26, y: 8 }, { x: 19, y: 17 }, { x: 25, y: 13 },
      ],
      speed: 85,
    },
    fatcat: {
      // 高冷，基本只在客厅沙发和电视附近活动
      waypoints: [{ x: 18, y: 4 }, { x: 26, y: 4 }, { x: 25, y: 8 }, { x: 18, y: 8 }, { x: 22, y: 2 }],
      speed: 30,
    },
    dog: { waypoints: [], speed: 135 },
  }
  const PET_REACTIONS: Record<string, { normal: string[]; aloof?: string[] }> = {
    cat: { normal: ['喵～', '呼噜呼噜……', '（蹭了蹭你的腿）', '（伸了个懒腰）', '喵呜！'] },
    fatcat: {
      normal: ['……喵。', '（勉强接受了你的抚摸）'],
      aloof: ['（高冷地瞥了你一眼，没动）', '（尾巴尖轻轻动了一下）', '（睁开一只眼睛，又闭上了）', '（往旁边挪了半步，拒绝了）'],
    },
    dog: { normal: ['汪汪！', '（开心地转了个圈）', '（尾巴摇成了螺旋桨）', '（扑到你脚边）'] },
  }

  const [started, setStarted] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [chatNpcId, setChatNpcId] = useState<string | null>(null)
  const [menuNpcId, setMenuNpcId] = useState<string | null>(null)
  const [gameNpcId, setGameNpcId] = useState<string | null>(null)
  const [furniture, setFurniture] = useState<FurnitureItem | null>(null)
  const [sleeping, setSleeping] = useState(false)
  const [sleepDay, setSleepDay] = useState(2)
  const [fade, setFade] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [backpackOpen, setBackpackOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [aiReady, setAiReady] = useState(() => isAiReady(loadAiConfig()))
  const [sending, setSending] = useState(false)
  const [chatTick, setChatTick] = useState(0)
  const [affTick, setAffTick] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [hud, setHud] = useState({ day: 1, time: '08:00', hint: '' })

  const modalRef = useRef<Modal>(null)
  const startedRef = useRef(false)
  const sleepingRef = useRef(false)
  const historiesRef = useRef<Record<string, ChatMessage[]>>(loadHistories())
  const affinityRef = useRef<Record<string, number>>(loadAffinity())
  const giftsRef = useRef(loadGifts())
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scriptRef = useRef<DialogueScript | null>(null)
  const proactiveCdRef = useRef<Record<string, number>>({})
  const pairCdRef = useRef<Record<string, number>>({})
  const checkAccRef = useRef(0)

  const persistHistories = useCallback(() => saveHistories(historiesRef.current), [])

  const showToast = useCallback((text: string) => {
    setToast(text)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 5000)
  }, [])

  /** 加好感；升级时发放对应等级礼物并弹提示 */
  const addAffinity = useCallback(
    (id: string, delta: number) => {
      const prev = affinityRef.current[id] ?? 0
      const now = prev + delta
      affinityRef.current[id] = now
      saveAffinity(affinityRef.current)
      const beforeLv = affinityInfo(prev).level
      const after = affinityInfo(now)
      if (after.level > beforeLv) {
        const npc = npcDefsRef.current.find((n) => n.id === id)
        const gained = (npc?.gifts ?? []).filter((g) => g.level > beforeLv && g.level <= after.level)
        for (const g of gained) {
          giftsRef.current.push({
            id: `${id}-lv${g.level}-${Date.now()}`,
            npcId: id,
            npcName: npc?.name ?? 'NPC',
            name: g.name,
            emoji: g.emoji,
            desc: g.desc,
            day: worldRef.current.day,
          })
        }
        if (gained.length) saveGifts(giftsRef.current)
        showToast(
          `💗 ${npc?.name ?? 'NPC'}与你的关系升至「${after.label}」！` +
            (gained.length ? ` 收到礼物：${gained.map((g) => `${g.emoji}${g.name}`).join('、')}` : ''),
        )
      }
      setAffTick((t) => t + 1)
    },
    [showToast],
  )

  useEffect(() => {
    modalRef.current = modal
  }, [modal])
  useEffect(() => {
    startedRef.current = started
  }, [started])
  useEffect(() => {
    sleepingRef.current = sleeping
  }, [sleeping])

  const timeStr = (mins: number) =>
    `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(Math.floor(mins % 60)).padStart(2, '0')}`

  // ────────────────────────── game loop
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const tryMove = (nx: number, ny: number, r: number) =>
      !collides(houseRef.current, nx, ny, r)

    const updateNpc = (npc: NpcRuntime, dt: number) => {
      npc.phase += dt
      if (npc.wait > 0) {
        npc.wait -= dt
        npc.moving = false
        return
      }
      const wp = npc.def.waypoints[npc.wpIdx]
      const tx = tileCenter(wp.x)
      const ty = tileCenter(wp.y)
      const dx = tx - npc.x
      const dy = ty - npc.y
      const dist = Math.hypot(dx, dy)
      if (dist < 4) {
        npc.moving = false
        npc.stuck = 0
        let next = npc.wpIdx
        while (next === npc.wpIdx) next = Math.floor(Math.random() * npc.def.waypoints.length)
        npc.wpIdx = next
        npc.wait = 1.5 + Math.random() * 3.5
        return
      }
      const sp = npc.def.speed * dt
      const ux = (dx / dist) * sp
      const uy = (dy / dist) * sp
      let moved = false
      if (Math.abs(dx) > 2 && tryMove(npc.x + ux, npc.y, 9)) {
        npc.x += ux
        moved = true
      }
      if (Math.abs(dy) > 2 && tryMove(npc.x, npc.y + uy, 9)) {
        npc.y += uy
        moved = true
      }
      npc.moving = moved
      if (Math.abs(dx) > Math.abs(dy)) npc.dir = dx > 0 ? 2 : 1
      else if (Math.abs(dy) > 2) npc.dir = dy > 0 ? 0 : 3
      if (!moved) {
        npc.stuck += dt
        if (npc.stuck > 1.5) {
          npc.stuck = 0
          npc.wpIdx = Math.floor(Math.random() * npc.def.waypoints.length)
          npc.wait = 0.5
        }
      } else npc.stuck = 0
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const w = worldRef.current
      const house = houseRef.current
      const nowS = now / 1000
      const modalOpen = modalRef.current !== null || sleepingRef.current || !startedRef.current

      // clock: 1 real second = 0.5 game minute
      w.minutes += dt * 0.5
      if (w.minutes >= 24 * 60) w.minutes = 23 * 60 + 59

      // ── player movement
      const p = w.player
      if (!modalOpen) {
        let mx = 0
        let my = 0
        if (w.keys.has('a') || w.keys.has('arrowleft')) mx -= 1
        if (w.keys.has('d') || w.keys.has('arrowright')) mx += 1
        if (w.keys.has('w') || w.keys.has('arrowup')) my -= 1
        if (w.keys.has('s') || w.keys.has('arrowdown')) my += 1
        const sp = 145 * dt
        let moved = false
        if (mx !== 0 && tryMove(p.x + mx * sp, p.y, 9)) {
          p.x += mx * sp
          moved = true
        }
        if (my !== 0 && tryMove(p.x, p.y + my * sp, 9)) {
          p.y += my * sp
          moved = true
        }
        if (mx !== 0) p.dir = mx > 0 ? 2 : 1
        else if (my !== 0) p.dir = my > 0 ? 0 : 3
        p.moving = moved
        if (moved) p.phase += dt

        // soft push out of NPCs
        for (const npc of w.npcs) {
          const dx = p.x - npc.x
          const dy = p.y - npc.y
          const d = Math.hypot(dx, dy)
          if (d < 20 && d > 0.001) {
            const push = (20 - d) / 2
            const px2 = p.x + (dx / d) * push
            const py2 = p.y + (dy / d) * push
            if (tryMove(px2, py2, 9)) {
              p.x = px2
              p.y = py2
            }
          }
        }

        // ── interaction candidate
        let best: Candidate | null = null
        for (const npc of w.npcs) {
          const d = Math.hypot(p.x - npc.x, p.y - npc.y)
          if (d < 42 && (!best || d < best.d)) best = { kind: 'npc', npc, d }
        }
        for (const pet of w.pets) {
          const d = Math.hypot(p.x - pet.x, p.y - pet.y)
          if (d < 40 && (!best || d < best.d)) best = { kind: 'pet', pet, d }
        }
        for (const fItem of house.furniture) {
          if (!fItem.interact) continue
          const cx = Math.max(fItem.rect.x * TILE, Math.min(p.x, (fItem.rect.x + fItem.rect.w) * TILE))
          const cy = Math.max(fItem.rect.y * TILE, Math.min(p.y, (fItem.rect.y + fItem.rect.h) * TILE))
          const d = Math.hypot(p.x - cx, p.y - cy)
          if (d < 34 && (!best || d < best.d)) best = { kind: 'furniture', furniture: fItem, d }
        }
        w.candidate = best
      } else {
        w.player.moving = false
        w.candidate = null
      }

      // ── NPCs keep living even while you chat
      for (const npc of w.npcs) updateNpc(npc, dt)

      // ── pets
      for (const pet of w.pets) {
        pet.phase += dt
        const def = PET_DEFS[pet.kind]
        if (pet.kind === 'dog') {
          // 小狗跟着玩家走
          const dx = p.x - pet.x
          const dy = p.y - pet.y
          const dist = Math.hypot(dx, dy)
          if (dist > 70) {
            const sp = def.speed * dt
            let moved = false
            if (Math.abs(dx) > 2 && tryMove(pet.x + (dx / dist) * sp, pet.y, 7)) {
              pet.x += (dx / dist) * sp
              moved = true
            }
            if (Math.abs(dy) > 2 && tryMove(pet.x, pet.y + (dy / dist) * sp, 7)) {
              pet.y += (dy / dist) * sp
              moved = true
            }
            pet.moving = moved
            if (Math.abs(dx) > Math.abs(dy)) pet.dir = dx > 0 ? 2 : 1
            else if (Math.abs(dy) > 2) pet.dir = dy > 0 ? 0 : 3
          } else {
            pet.moving = false
            if (dist < 30) {
              // 呆在玩家身边，朝向玩家
              pet.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3
            }
          }
          continue
        }
        // 猫：游走 + 打盹
        if (pet.wait > 0) {
          pet.wait -= dt
          pet.moving = false
          if (pet.wait <= 0) pet.sleeping = false
        } else {
          const wp = def.waypoints[pet.wpIdx]
          const tx = tileCenter(wp.x)
          const ty = tileCenter(wp.y)
          const dx = tx - pet.x
          const dy = ty - pet.y
          const dist = Math.hypot(dx, dy)
          if (dist < 4) {
            pet.moving = false
            pet.stuck = 0
            pet.wpIdx = Math.floor(Math.random() * def.waypoints.length)
            const sleepChance = pet.kind === 'fatcat' ? 0.5 : 0.35
            if (Math.random() < sleepChance) {
              pet.sleeping = true
              pet.wait = pet.kind === 'fatcat' ? 8 + Math.random() * 8 : 6 + Math.random() * 6
            } else {
              pet.wait = 2 + Math.random() * 4
            }
          } else {
            const sp = def.speed * dt
            let moved = false
            if (Math.abs(dx) > 2 && tryMove(pet.x + (dx / dist) * sp, pet.y, 7)) {
              pet.x += (dx / dist) * sp
              moved = true
            }
            if (Math.abs(dy) > 2 && tryMove(pet.x, pet.y + (dy / dist) * sp, 7)) {
              pet.y += (dy / dist) * sp
              moved = true
            }
            pet.moving = moved
            if (Math.abs(dx) > Math.abs(dy)) pet.dir = dx > 0 ? 2 : 1
            else if (Math.abs(dy) > 2) pet.dir = dy > 0 ? 0 : 3
            if (!moved) {
              pet.stuck += dt
              if (pet.stuck > 1) {
                pet.stuck = 0
                pet.wpIdx = Math.floor(Math.random() * def.waypoints.length)
              }
            } else pet.stuck = 0
          }
        }
      }

      // ── advance NPC-NPC dialogue bubbles
      const script = scriptRef.current
      if (script && !modalRef.current && startedRef.current) {
        if (nowS >= script.until) {
          script.idx++
          if (script.idx >= script.lines.length) {
            scriptRef.current = null
          } else {
            const line = script.lines[script.idx]
            const npc = w.npcs.find((n) => n.def.id === line.npcId)
            const dur = 2 + Math.min(line.text.length * 0.055, 2.2)
            if (npc) {
              npc.bubbleText = line.text
              npc.bubbleUntil = nowS + dur
              npc.wait = Math.max(npc.wait, dur + 0.3)
              npc.moving = false
            }
            script.until = nowS + dur
          }
        }
      }

      // ── social triggers (checked every CHECK_INTERVAL seconds)
      checkAccRef.current += dt
      if (checkAccRef.current >= CHECK_INTERVAL) {
        checkAccRef.current = 0
        if (startedRef.current && !modalRef.current && !sleepingRef.current && !scriptRef.current) {
          // 1) NPC 主动找玩家聊天（基础 20%，好感越高概率越高，最多 +10%）
          for (const npc of w.npcs) {
            const d = Math.hypot(p.x - npc.x, p.y - npc.y)
            const cd = proactiveCdRef.current[npc.def.id] ?? 0
            const affBonus = Math.min(0.1, (affinityRef.current[npc.def.id] ?? 0) * 0.001)
            if (d < 64 && nowS > cd && Math.random() < PROACTIVE_CHANCE + affBonus) {
              proactiveCdRef.current[npc.def.id] = nowS + PROACTIVE_COOLDOWN
              initiateProactiveRef.current(npc)
              break
            }
          }
          // 2) NPC 之间互相聊天（20%，需要玩家在附近围观）
          if (!scriptRef.current && !modalRef.current) {
            const px2 = p.x
            const py2 = p.y
            outer: for (let i = 0; i < w.npcs.length; i++) {
              for (let j = i + 1; j < w.npcs.length; j++) {
                const a = w.npcs[i]
                const b = w.npcs[j]
                const d = Math.hypot(a.x - b.x, a.y - b.y)
                if (d > 46) continue
                const pd = Math.hypot((a.x + b.x) / 2 - px2, (a.y + b.y) / 2 - py2)
                if (pd > 330) continue
                const key = [a.def.id, b.def.id].sort().join('|')
                if (nowS - (pairCdRef.current[key] ?? -999) < PAIR_COOLDOWN) continue
                if (Math.random() < NPC_CHAT_CHANCE) {
                  pairCdRef.current[key] = nowS
                  startPairChatRef.current(a, b)
                  break outer
                }
              }
            }
          }
        }
      }

      // ── HUD state (only write when changed)
      const hint = !w.candidate
        ? ''
        : w.candidate.kind === 'pet'
          ? `按 E 摸摸${w.candidate.pet!.name}`
          : w.candidate.kind === 'npc'
            ? `按 E 和 ${w.candidate.npc!.def.name} 聊天`
            : w.candidate.furniture!.interact?.type === 'sleep'
              ? '按 E 睡觉（进入明天）'
              : `按 E 查看${w.candidate.furniture!.name}`
      setHud((h) =>
        h.day !== w.day || h.time !== timeStr(w.minutes) || h.hint !== hint
          ? { day: w.day, time: timeStr(w.minutes), hint }
          : h,
      )

      // ── render
      ctx.clearRect(0, 0, VIEW_W, VIEW_H)
      drawHouse(ctx, house, nowS)
      drawNightOverlay(ctx, Math.floor(w.minutes / 60) % 24)

      const entities = [
        ...w.npcs.map((n) => ({ y: n.y, npc: n, pet: null as PetRuntime | null })),
        ...w.pets.map((pt) => ({ y: pt.y, npc: null as NpcRuntime | null, pet: pt })),
        { y: p.y, npc: null as NpcRuntime | null, pet: null as PetRuntime | null },
      ].sort((a, b) => a.y - b.y)
      for (const e of entities) {
        if (e.npc) {
          const n = e.npc
          drawCharacter(ctx, n.x, n.y, n.dir, n.def, n.moving, n.phase, n.def.name)
        } else if (e.pet) {
          const pt = e.pet
          if (pt.kind === 'dog') drawDog(ctx, pt.x, pt.y, pt.dir, pt.moving, pt.phase, pt.name)
          else if (pt.kind === 'fatcat')
            drawCat(ctx, pt.x, pt.y, pt.dir, pt.moving, pt.phase, pt.sleeping, {
              color: '#4a4a52', dark: '#33333a', cream: '#9a9aa2', scale: 1.3, name: pt.name,
            })
          else drawCat(ctx, pt.x, pt.y, pt.dir, pt.moving, pt.phase, pt.sleeping, { name: pt.name })
        } else {
          drawCharacter(ctx, p.x, p.y, p.dir, PLAYER_LOOK, p.moving, p.phase)
        }
      }

      // NPC / 宠物 气泡
      for (const npc of w.npcs) {
        if (npc.bubbleText && npc.bubbleUntil && npc.bubbleUntil > nowS) {
          drawBubble(ctx, npc.x, npc.y, npc.bubbleText)
        }
      }
      for (const pet of w.pets) {
        if (pet.bubbleText && pet.bubbleUntil > nowS) {
          drawBubble(ctx, pet.x, pet.y, pet.bubbleText)
        }
      }

      // interact indicator
      if (w.candidate && !modalOpen) {
        let ix = 0
        let iy = 0
        if (w.candidate.kind === 'npc') {
          ix = w.candidate.npc!.x
          iy = w.candidate.npc!.y - 50
        } else if (w.candidate.kind === 'pet') {
          ix = w.candidate.pet!.x
          iy = w.candidate.pet!.y - 44
        } else {
          const r = w.candidate.furniture!.rect
          ix = (r.x + r.w / 2) * TILE
          iy = r.y * TILE - 8
        }
        const bounce = Math.sin(now / 200) * 2
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.beginPath()
        ctx.arc(ix, iy + bounce, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#8a5a34'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#8a5a34'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('E', ix, iy + bounce + 4)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ────────────────────────── proactive & pair chat
  /** NPC 主动开口：打开聊天窗，AI 生成搭话内容（未配置 AI 时用内置话题） */
  const initiateProactive = useCallback((npc: NpcRuntime) => {
    const id = npc.def.id
    const hist = (historiesRef.current[id] ??= [])
    if (!hist.length) hist.push({ role: 'assistant', content: npc.def.greeting })
    hist.push({
      role: 'user',
      content: '（情境：玩家正好走到你身边，你主动开口，自然找个话题和他聊起来）',
      hidden: true,
    })
    persistHistories()
    setChatNpcId(id)
    setModal('chat')
    setChatTick((t) => t + 1)
    if (!isAiReady(loadAiConfig())) {
      const pool = npc.def.proactive?.length ? npc.def.proactive : [npc.def.greeting]
      hist.push({ role: 'assistant', content: pool[Math.floor(Math.random() * pool.length)] })
      persistHistories()
      setChatTick((t) => t + 1)
      return
    }
    setSending(true)
    const w = worldRef.current
    chatWithNpc(npc.def, hist, {
      day: w.day,
      time: timeStr(w.minutes),
      affinityLabel: affinityInfo(affinityRef.current[id] ?? 0).label,
    })
      .then((reply) => {
        hist.push({ role: 'assistant', content: reply })
      })
      .catch((err) => {
        hist.push({
          role: 'assistant',
          content: `（${err instanceof Error ? err.message : '出错了'}）`,
        })
      })
      .finally(() => {
        if (hist.length > 60) hist.splice(0, hist.length - 60)
        setSending(false)
        persistHistories()
        setChatTick((t) => t + 1)
      })
  }, [persistHistories])

  /** NPC 之间互聊：AI 生成一段对话，按轮次显示为头顶气泡 */
  const startPairChat = useCallback((a: NpcRuntime, b: NpcRuntime) => {
    const w = worldRef.current
    const env = { day: w.day, time: timeStr(w.minutes) }
    const fallback = () => {
      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
      const pa = a.def.proactive?.length ? pick(a.def.proactive) : '今天天气真不错。'
      const pb = b.def.proactive?.length ? pick(b.def.proactive) : '是啊，挺舒服的。'
      scriptRef.current = {
        lines: [
          { npcId: a.def.id, text: pa },
          { npcId: b.def.id, text: pb },
          { npcId: a.def.id, text: '哈哈，说的是呢。' },
          { npcId: b.def.id, text: '嗯，改天再好好聊。' },
        ],
        idx: -1,
        until: 0,
      }
    }
    if (!isAiReady(loadAiConfig())) {
      fallback()
      return
    }
    generateNpcDialogue(a.def, b.def, env)
      .then((lines) => {
        scriptRef.current = { lines, idx: -1, until: 0 }
      })
      .catch(fallback)
  }, [])

  // 供游戏循环内调用（避免闭包过期）
  const initiateProactiveRef = useRef<(npc: NpcRuntime) => void>(() => {})
  const startPairChatRef = useRef<(a: NpcRuntime, b: NpcRuntime) => void>(() => {})
  useEffect(() => {
    initiateProactiveRef.current = initiateProactive
    startPairChatRef.current = startPairChat
  }, [initiateProactive, startPairChat])

  // ────────────────────────── input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const key = e.key.toLowerCase()
      if (key === 'escape') {
        if (modalRef.current && modalRef.current !== 'sleep') setModal(null)
        return
      }
      if (typing) return // 输入框内不拦截，保证光标移动/空格正常
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault()
      worldRef.current.keys.add(key)
      if ((key === 'e' || key === ' ') && !modalRef.current && startedRef.current) {
        interact()
      }
    }
    const up = (e: KeyboardEvent) => worldRef.current.keys.delete(e.key.toLowerCase())
    const blur = () => worldRef.current.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ────────────────────────── interactions
  const interact = useCallback(() => {
    const c = worldRef.current.candidate
    if (!c) return
    if (c.kind === 'pet') {
      const pet = c.pet!
      const nowS = performance.now() / 1000
      const pool = PET_REACTIONS[pet.kind]
      // 高冷的煤球大概率拒绝
      const useAloof = pool.aloof && Math.random() < 0.55
      const reactions = useAloof ? pool.aloof! : pool.normal
      pet.bubbleText = reactions[Math.floor(Math.random() * reactions.length)]
      pet.bubbleUntil = nowS + 2.2
      if (pet.kind === 'cat') {
        pet.sleeping = false
        pet.wait = 0
      } else if (pet.kind === 'fatcat') {
        if (!useAloof) {
          pet.sleeping = false
          pet.wait = Math.max(pet.wait, 1)
        }
      } else {
        pet.wait = 0
      }
      return
    }
    if (c.kind === 'npc') {
      setMenuNpcId(c.npc!.def.id)
      setModal('npcmenu')
    } else if (c.furniture!.interact?.type === 'sleep') {
      setModal('sleep')
    } else if (c.furniture) {
      setFurniture(c.furniture)
      setModal('furniture')
    }
  }, [])

  const openChat = useCallback((id: string) => {
    const hist = historiesRef.current
    if (!hist[id]) {
      const npc = npcDefsRef.current.find((n) => n.id === id)
      hist[id] = [{ role: 'assistant', content: npc?.greeting ?? '你好。' }]
      persistHistories()
    }
    setChatNpcId(id)
    setModal('chat')
  }, [persistHistories])

  const openGame = useCallback((id: string) => {
    setGameNpcId(id)
    setModal('minigame')
  }, [])

  const onGameFinish = useCallback(
    (npcId: string, result: { affinity: number; summary: string }) => {
      const npc = npcDefsRef.current.find((n) => n.id === npcId)
      addAffinity(npcId, result.affinity)
      const hist = (historiesRef.current[npcId] ??= [])
      hist.push({
        role: 'user',
        content: `（情境：你们刚才一起玩了「${npc?.game.name ?? '小游戏'}」，${result.summary}）`,
        hidden: true,
      })
      persistHistories()
      setModal(null)
      setGameNpcId(null)
      showToast(`🎮 ${npc?.name ?? 'NPC'}：${result.summary} · 好感 +${result.affinity}`)
    },
    [addAffinity, persistHistories, showToast],
  )

  const doSleep = useCallback(() => {
    setModal(null)
    setSleeping(true)
    setFade(true)
    setSleepDay(worldRef.current.day + 1)
    setTimeout(() => {
      const w = worldRef.current
      w.day += 1
      w.minutes = 8 * 60
      for (const npc of w.npcs) {
        const hist = (historiesRef.current[npc.def.id] ??= [])
        hist.push({ role: 'system', content: `【时间推进】现在是第 ${w.day} 天早上，玩家刚睡醒。` })
        if (hist.length > 60) hist.splice(0, hist.length - 60)
      }
      persistHistories()
      writeSlot(AUTO_SLOT, buildSaveData(worldRef.current))
    }, 1100)
    setTimeout(() => {
      setFade(false)
      setSleeping(false)
    }, 2100)
  }, [persistHistories])

  // 每 30 秒自动存档
  useEffect(() => {
    const t = setInterval(() => {
      if (startedRef.current) writeSlot(AUTO_SLOT, buildSaveData(worldRef.current))
    }, 30000)
    return () => clearInterval(t)
  }, [])

  // ────────────────────────── chat
  const chatNpc = chatNpcId ? npcDefs.find((n) => n.id === chatNpcId) ?? null : null
  const menuNpc = menuNpcId ? npcDefs.find((n) => n.id === menuNpcId) ?? null : null
  const gameNpc = gameNpcId ? npcDefs.find((n) => n.id === gameNpcId) ?? null : null
  const chatMessages = chatNpcId ? (historiesRef.current[chatNpcId] ?? []) : []
  void chatTick // 触发聊天界面重渲染
  void affTick // 好感变化时触发重渲染

  const sendChat = useCallback(
    async (text: string) => {
      const id = chatNpcId
      if (!id || sending) return
      const npc = npcDefsRef.current.find((n) => n.id === id)
      if (!npc) return
      const w = worldRef.current
      const hist = (historiesRef.current[id] ??= [])
      hist.push({ role: 'user', content: text })
      addAffinity(id, POINTS_PER_CHAT)
      persistHistories()
      setChatTick((t) => t + 1)
      setSending(true)
      try {
        const reply = await chatWithNpc(npc, hist, {
          day: w.day,
          time: timeStr(w.minutes),
          affinityLabel: affinityInfo(affinityRef.current[id] ?? 0).label,
        })
        hist.push({ role: 'assistant', content: reply })
      } catch (err) {
        hist.push({
          role: 'assistant',
          content: `（${err instanceof Error ? err.message : '出错了'}）`,
        })
      } finally {
        if (hist.length > 60) hist.splice(0, hist.length - 60)
        setSending(false)
        persistHistories()
        setChatTick((t) => t + 1)
      }
    },
    [chatNpcId, sending, persistHistories, addAffinity],
  )

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#2c2440] via-[#3a2d4d] to-[#241d33] p-2 sm:p-4">
      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-[#5b4636] bg-black" style={{ width: 'min(960px, 100%)' }}>
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="block w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* HUD */}
        {started && (
          <>
            <div className="absolute top-2.5 left-2.5 flex items-center gap-2 rounded-lg bg-black/55 backdrop-blur px-3 py-1.5 text-amber-50 text-sm font-medium pointer-events-none">
              <span>📅 第 {hud.day} 天</span>
              <span className="opacity-60">|</span>
              <span>🕗 {hud.time}</span>
            </div>
            <div className="absolute top-2.5 right-2.5 flex gap-2">
              <button
                onClick={() => setSaveOpen(true)}
                className="rounded-lg bg-black/55 backdrop-blur text-amber-50 text-sm px-3 py-1.5 hover:bg-black/75 transition-colors"
              >
                💾 存档
              </button>
              <button
                onClick={() => setBackpackOpen(true)}
                className="relative rounded-lg bg-black/55 backdrop-blur text-amber-50 text-sm px-3 py-1.5 hover:bg-black/75 transition-colors"
              >
                🎒 背包
                {giftsRef.current.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {giftsRef.current.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCardOpen(true)}
                className="rounded-lg bg-black/55 backdrop-blur text-amber-50 text-sm px-3 py-1.5 hover:bg-black/75 transition-colors"
              >
                🎭 角色卡
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg bg-black/55 backdrop-blur text-amber-50 text-sm px-3 py-1.5 hover:bg-black/75 transition-colors"
              >
                ⚙️ AI 设置{!aiReady && ' ⚠️'}
              </button>
            </div>
            {hud.hint && !modal && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 backdrop-blur text-amber-50 text-sm px-4 py-1.5 pointer-events-none whitespace-nowrap">
                {hud.hint}
              </div>
            )}
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/40 text-amber-50/80 text-[11px] px-2.5 py-1.5 pointer-events-none leading-relaxed">
              WASD / 方向键 移动 · E / 空格 互动 · Esc 关闭
            </div>
          </>
        )}

        {/* sleep fade */}
        <div
          className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-1000 flex items-center justify-center ${fade ? 'opacity-100' : 'opacity-0'}`}
        >
          {sleeping && (
            <div className="text-amber-50 text-center">
              <div className="text-3xl mb-2">🌙</div>
              <div className="text-lg font-medium">第 {sleepDay} 天 · 早上好</div>
              <div className="text-sm opacity-70 mt-1">你睡了个好觉</div>
            </div>
          )}
        </div>

        {/* start screen */}
        {!started && (
          <div className="absolute inset-0 bg-[#1d1830]/85 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center px-6 max-w-md">
              <div className="text-5xl mb-3">🏡</div>
              <h1 className="text-4xl font-bold text-amber-50 mb-2 tracking-wide">温馨小屋</h1>
              <p className="text-amber-100/80 text-sm leading-relaxed mb-1">
                一座有四个房间的小屋，四位性格迥异的住客——由 AI 驱动，会主动找你聊天，也会彼此闲聊。
              </p>
              <p className="text-amber-100/80 text-sm leading-relaxed mb-5">
                走近他们按 E 对话，他们记得你们聊过的一切。
              </p>
              <div className="text-amber-100/60 text-xs mb-6 space-y-1">
                <div>WASD / 方向键移动 · E / 空格互动 · 走到床边可以睡觉</div>
                <div>首次使用请先在右上角「AI 设置」中填入 API Key</div>
              </div>
              <Button
                onClick={() => setStarted(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-5 rounded-xl"
              >
                进入小屋
              </Button>
            </div>
          </div>
        )}

        {/* furniture dialog（含电视 AI 新闻） */}
        {modal === 'furniture' && furniture && (
          <FurnitureDialog furniture={furniture} onClose={() => setModal(null)} />
        )}

        {/* sleep confirm */}
        {modal === 'sleep' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
            <div
              className="w-[min(380px,90%)] rounded-2xl border-2 border-amber-900/50 bg-[#fff8ec]/95 shadow-2xl p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-3xl mb-2">🛏️</div>
              <div className="font-bold text-amber-950 text-lg mb-1">要现在睡觉吗？</div>
              <p className="text-amber-900/75 text-sm mb-4">一觉醒来就是明天早上 8:00 了。</p>
              <div className="flex gap-2">
                <Button onClick={doSleep} className="flex-1 bg-amber-700 hover:bg-amber-800 text-white">睡觉</Button>
                <Button onClick={() => setModal(null)} variant="outline" className="flex-1 border-amber-900/30 text-amber-900">再等等</Button>
              </div>
            </div>
          </div>
        )}

        {/* npc interaction menu */}
        {modal === 'npcmenu' && menuNpc && (
          <NpcMenuDialog
            npc={menuNpc}
            affinity={menuNpcId ? (affinityRef.current[menuNpcId] ?? 0) : 0}
            onChat={() => openChat(menuNpc.id)}
            onPlay={() => openGame(menuNpc.id)}
            onClose={() => setModal(null)}
          />
        )}

        {/* mini game */}
        {modal === 'minigame' && gameNpc && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-3" onClick={(e) => e.stopPropagation()}>
            <div className="w-[min(520px,96%)] rounded-2xl border-2 border-amber-900/50 bg-[#fff8ec]/95 shadow-2xl p-4 max-h-[85vh] overflow-y-auto">
              {gameNpc.game.id === 'bake' && <BakeGame npc={gameNpc} onFinish={(r) => onGameFinish(gameNpc.id, r)} />}
              {gameNpc.game.id === 'gomoku' && <GomokuGame npc={gameNpc} onFinish={(r) => onGameFinish(gameNpc.id, r)} />}
              {gameNpc.game.id === 'debug' && <DebugGame npc={gameNpc} onFinish={(r) => onGameFinish(gameNpc.id, r)} />}
              {gameNpc.game.id === 'quiz' && <QuizGame npc={gameNpc} onFinish={(r) => onGameFinish(gameNpc.id, r)} />}
            </div>
          </div>
        )}

        {/* chat */}
        {modal === 'chat' && chatNpc && (
          <ChatDialog
            npc={chatNpc}
            messages={chatMessages}
            sending={sending}
            aiReady={aiReady}
            affinity={chatNpcId ? (affinityRef.current[chatNpcId] ?? 0) : 0}
            onSend={sendChat}
            onClose={() => setModal(null)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {/* affinity level-up toast */}
        {toast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 max-w-[90%]">
            <div className="rounded-xl border-2 border-rose-300 bg-[#fff0f3]/95 backdrop-blur shadow-xl px-4 py-2.5 text-sm text-rose-900 text-center animate-bounce">
              {toast}
            </div>
          </div>
        )}

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={() => setAiReady(isAiReady(loadAiConfig()))}
        />
        <CharacterCardDialog
          open={cardOpen}
          onOpenChange={setCardOpen}
          npcs={npcDefs}
          onSaved={setNpcDefs}
        />
        <BackpackDialog open={backpackOpen} onOpenChange={setBackpackOpen} gifts={giftsRef.current} />
        <SaveDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          getWorld={() => worldRef.current}
          onSaved={() => {}}
        />
      </div>
    </div>
  )
}
