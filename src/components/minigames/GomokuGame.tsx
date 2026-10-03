import { useState } from 'react'
import type { NpcDef } from '@/game/npcs'
import { Button } from '@/components/ui/button'

interface Props {
  npc: NpcDef
  onFinish: (result: { affinity: number; summary: string }) => void
}

const SIZE = 9
const EMPTY = 0
const BLACK = 1 // 玩家
const WHITE = 2 // 周伯

function checkWin(b: number[], size: number, idx: number, who: number): boolean {
  const x = idx % size
  const y = Math.floor(idx / size)
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of dirs) {
    let count = 1
    for (const sign of [1, -1]) {
      let nx = x + dx * sign
      let ny = y + dy * sign
      while (nx >= 0 && ny >= 0 && nx < size && ny < size && b[ny * size + nx] === who) {
        count++
        nx += dx * sign
        ny += dy * sign
      }
    }
    if (count >= 5) return true
  }
  return false
}

/** 简单 AI：能赢先赢，必堵则堵，否则落在已有棋子附近 */
function aiMove(b: number[], size: number): number {
  const empties = b.map((v, i) => (v === EMPTY ? i : -1)).filter((i) => i >= 0)
  if (!empties.length) return -1
  // 中心开局
  if (empties.length === size * size - 1) {
    const c = Math.floor(size / 2) * size + Math.floor(size / 2)
    if (b[c] === EMPTY) return c
  }
  const tryFind = (who: number) => {
    for (const i of empties) {
      b[i] = who
      const win = checkWin(b, size, i, who)
      b[i] = EMPTY
      if (win) return i
    }
    return -1
  }
  const winMove = tryFind(WHITE)
  if (winMove >= 0) return winMove
  const blockMove = tryFind(BLACK)
  if (blockMove >= 0) return blockMove
  // 落在已有棋子相邻的空位
  const near: number[] = []
  for (const i of empties) {
    const x = i % size
    const y = Math.floor(i / size)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < size && ny < size && b[ny * size + nx] !== EMPTY) near.push(i)
      }
  }
  if (near.length) return near[Math.floor(Math.random() * near.length)]
  return empties[Math.floor(Math.random() * empties.length)]
}

export default function GomokuGame({ npc, onFinish }: Props) {
  const [board, setBoard] = useState<number[]>(() => Array(SIZE * SIZE).fill(EMPTY))
  const [turn, setTurn] = useState(BLACK)
  const [over, setOver] = useState<null | 'win' | 'lose' | 'draw'>(null)
  const [msg, setMsg] = useState(`${npc.name}：你执黑先行，我可不让子。`)

  const finish = (result: 'win' | 'lose' | 'draw', newBoard: number[]) => {
    setOver(result)
    const full = newBoard.every((v) => v !== EMPTY)
    if (result === 'win') setMsg(`${npc.name}：好棋！这一局，你赢了。`)
    else if (result === 'lose') setMsg(`${npc.name}：承让承让，老夫宝刀未老。`)
    else setMsg(full ? `${npc.name}：满盘皆活，和棋，痛快！` : msg)
  }

  const place = (idx: number) => {
    if (over || turn !== BLACK || board[idx] !== EMPTY) return
    const b = [...board]
    b[idx] = BLACK
    if (checkWin(b, SIZE, idx, BLACK)) {
      setBoard(b)
      finish('win', b)
      return
    }
    if (b.every((v) => v !== EMPTY)) {
      setBoard(b)
      finish('draw', b)
      return
    }
    // AI 应招
    const ai = aiMove(b, SIZE)
    if (ai >= 0) b[ai] = WHITE
    setBoard(b)
    if (ai >= 0 && checkWin(b, SIZE, ai, WHITE)) {
      finish('lose', b)
      return
    }
    if (b.every((v) => v !== EMPTY)) {
      finish('draw', b)
      return
    }
    setTurn(BLACK)
  }

  const resultMap = {
    win: { affinity: 10, summary: '五子棋赢了周伯，他夸你是好棋' },
    draw: { affinity: 6, summary: '和周伯战成和棋，他直呼痛快' },
    lose: { affinity: 5, summary: '输给了周伯，他笑得胡子直翘' },
  } as const

  return (
    <div className="text-center">
      <div className="text-3xl mb-1">♟️</div>
      <div className="font-bold text-amber-950 mb-1">{npc.game.name}</div>
      <div className="text-xs text-amber-800/70 mb-2">你执 ⚫ 先行 · 五子连珠即胜</div>
      <div className="min-h-[34px] flex items-center justify-center mb-2">
        <div className="text-sm text-amber-900 bg-amber-100/80 rounded-lg px-3 py-1.5 inline-block">{msg}</div>
      </div>
      <div
        className="inline-grid gap-0 rounded-lg border-2 border-[#8a5a34] bg-[#e8c07a] p-1.5"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))` }}
      >
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => place(i)}
            className="w-7 h-7 sm:w-8 sm:h-8 border border-[#a5793f]/60 flex items-center justify-center hover:bg-amber-200/50"
          >
            {v === BLACK && <span className="w-5 h-5 rounded-full bg-[#2b2b33] shadow" />}
            {v === WHITE && <span className="w-5 h-5 rounded-full bg-[#f5f0e6] shadow border border-black/20" />}
          </button>
        ))}
      </div>
      {over && (
        <Button
          className="mt-3 bg-amber-700 hover:bg-amber-800 text-white"
          onClick={() => onFinish(resultMap[over])}
        >
          结束对弈
        </Button>
      )}
    </div>
  )
}
