import { NPC_BASE, type NpcDef } from './npcs'
import type { ChatMessage } from './types'

const OVR_KEY = 'cozy-cabin-npc-overrides'
const HIST_KEY = 'cozy-cabin-histories'

export type NpcOverrides = Record<string, Partial<NpcDef>>

export function loadOverrides(): NpcOverrides {
  try {
    const raw = localStorage.getItem(OVR_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

export function saveOverrides(o: NpcOverrides) {
  localStorage.setItem(OVR_KEY, JSON.stringify(o))
}

export function resetOverride(id: string) {
  const o = loadOverrides()
  delete o[id]
  saveOverrides(o)
}

/** 默认角色卡 + 玩家自定义覆盖 */
export function loadNpcDefs(): NpcDef[] {
  const ov = loadOverrides()
  return NPC_BASE.map((base) => ({ ...base, ...(ov[base.id] ?? {}) }))
}

/** 每个 NPC 独立的对话记忆（跨天、跨刷新保留） */
export function loadHistories(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(HIST_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

export function saveHistories(h: Record<string, ChatMessage[]>) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(h))
  } catch {
    /* storage full — ignore */
  }
}

// ────────────────────────── 好感度 & 礼物

const AFF_KEY = 'cozy-cabin-affinity'
const GIFT_KEY = 'cozy-cabin-gifts'

export interface Gift {
  id: string
  npcId: string
  npcName: string
  name: string
  emoji: string
  desc: string
  day: number
}

export function loadAffinity(): Record<string, number> {
  try {
    const raw = localStorage.getItem(AFF_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

export function saveAffinity(a: Record<string, number>) {
  try {
    localStorage.setItem(AFF_KEY, JSON.stringify(a))
  } catch {
    /* ignore */
  }
}

export function loadGifts(): Gift[] {
  try {
    const raw = localStorage.getItem(GIFT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

export function saveGifts(g: Gift[]) {
  try {
    localStorage.setItem(GIFT_KEY, JSON.stringify(g))
  } catch {
    /* ignore */
  }
}

// ────────────────────────── 运行时状态（天数 / 时钟 / 位置），供读档恢复

const RUN_KEY = 'cozy-cabin-run-state'

export interface RunState {
  day: number
  minutes: number
  playerX: number
  playerY: number
}

export function saveRunState(s: RunState) {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function loadRunState(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

export function clearRunState() {
  localStorage.removeItem(RUN_KEY)
}
