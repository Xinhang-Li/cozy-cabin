import {
  loadHistories,
  saveHistories,
  loadAffinity,
  saveAffinity,
  loadGifts,
  saveGifts,
  loadOverrides,
  saveOverrides,
  saveRunState,
  clearRunState,
  type NpcOverrides,
} from './store'
import type { ChatMessage } from './types'

const SLOTS_KEY = 'cozy-cabin-saves'
export const AUTO_SLOT = 'auto'
export const MANUAL_SLOTS = ['slot1', 'slot2', 'slot3'] as const

export interface SaveData {
  version: 1
  savedAt: number
  day: number
  minutes: number
  player: { x: number; y: number }
  histories: Record<string, ChatMessage[]>
  affinity: Record<string, number>
  gifts: ReturnType<typeof loadGifts>
  npcOverrides: NpcOverrides
}

export function buildSaveData(world: {
  day: number
  minutes: number
  player: { x: number; y: number }
}): SaveData {
  return {
    version: 1,
    savedAt: Date.now(),
    day: world.day,
    minutes: world.minutes,
    player: { x: world.player.x, y: world.player.y },
    histories: loadHistories(),
    affinity: loadAffinity(),
    gifts: loadGifts(),
    npcOverrides: loadOverrides(),
  }
}

export type SaveSlots = Record<string, SaveData>

export function loadSlots(): SaveSlots {
  try {
    const raw = localStorage.getItem(SLOTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

export function writeSlot(slot: string, data: SaveData) {
  const slots = loadSlots()
  slots[slot] = data
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
  } catch {
    /* ignore */
  }
}

export function deleteSlot(slot: string) {
  const slots = loadSlots()
  delete slots[slot]
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
}

export function deleteAllSlots() {
  localStorage.removeItem(SLOTS_KEY)
}

/** 把存档写回各存储键并刷新页面完成读档 */
export function applySave(data: SaveData): boolean {
  if (!data || data.version !== 1) return false
  saveHistories(data.histories ?? {})
  saveAffinity(data.affinity ?? {})
  saveGifts(data.gifts ?? [])
  saveOverrides(data.npcOverrides ?? {})
  saveRunState({
    day: data.day ?? 1,
    minutes: data.minutes ?? 8 * 60,
    playerX: data.player?.x ?? 0,
    playerY: data.player?.y ?? 0,
  })
  return true
}

/** 开始新游戏：清掉运行时状态 */
export function resetRunState() {
  clearRunState()
}

/** 导出单个存档为 JSON 文件下载 */
export function exportSaveFile(data: SaveData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date(data.savedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  a.href = url
  a.download = `温馨小屋-存档-第${data.day}天-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 解析导入的存档文件 */
export function parseSaveFile(text: string): SaveData | null {
  try {
    const data = JSON.parse(text)
    if (data && data.version === 1 && typeof data.day === 'number') return data as SaveData
  } catch {
    /* ignore */
  }
  return null
}
