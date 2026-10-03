/** 好感度（亲密度）系统：聊天加分，升级解锁专属礼物与更亲密的 AI 对话 */

export interface AffinityLevel {
  level: number
  label: string
  min: number
}

export const AFFINITY_LEVELS: AffinityLevel[] = [
  { level: 1, label: '相识', min: 0 },
  { level: 2, label: '熟人', min: 20 },
  { level: 3, label: '朋友', min: 50 },
  { level: 4, label: '挚友', min: 100 },
  { level: 5, label: '知心', min: 200 },
]

/** 每条玩家消息获得的好感 */
export const POINTS_PER_CHAT = 2

export interface AffinityInfo {
  level: number
  label: string
  points: number
  /** 距下一级的进度 0~1，已满级为 1 */
  progress: number
  nextLabel: string | null
  nextMin: number | null
}

export function affinityInfo(points: number): AffinityInfo {
  let cur = AFFINITY_LEVELS[0]
  for (const l of AFFINITY_LEVELS) if (points >= l.min) cur = l
  const next = AFFINITY_LEVELS.find((l) => l.min > points) ?? null
  return {
    level: cur.level,
    label: cur.label,
    points,
    progress: next ? (points - cur.min) / (next.min - cur.min) : 1,
    nextLabel: next?.label ?? null,
    nextMin: next?.min ?? null,
  }
}
