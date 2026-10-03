import { useCallback, useEffect, useRef, useState } from 'react'
import type { NpcDef } from '@/game/npcs'
import { Button } from '@/components/ui/button'

interface Props {
  npc: NpcDef
  onFinish: (result: { affinity: number; summary: string }) => void
}

const INGREDIENTS = [
  { id: 'egg', emoji: '🥚', name: '鸡蛋' },
  { id: 'butter', emoji: '🧈', name: '黄油' },
  { id: 'sugar', emoji: '🍬', name: '糖' },
  { id: 'flour', emoji: '🌾', name: '面粉' },
  { id: 'milk', emoji: '🥛', name: '牛奶' },
  { id: 'choco', emoji: '🍫', name: '巧克力' },
]

const ROUNDS = [3, 4, 5] // 每轮配方长度

type Phase = 'show' | 'input' | 'roundEnd'

export default function BakeGame({ npc, onFinish }: Props) {
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('show')
  const [inputIdx, setInputIdx] = useState(0)
  const [flash, setFlash] = useState<number | null>(null)
  const [message, setMessage] = useState(`${npc.name}：看好了，配方是这样的——`)
  const [wrong, setWrong] = useState<number | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const seqRef = useRef<number[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const startRound = useCallback((r: number) => {
    clearTimers()
    const len = ROUNDS[r]
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * INGREDIENTS.length))
    seqRef.current = seq
    setPhase('show')
    setInputIdx(0)
    setMessage(`${npc.name}：第 ${r + 1} 步，看好了——`)
    seq.forEach((ing, i) => {
      timersRef.current.push(setTimeout(() => setFlash(ing), 500 + i * 650))
      timersRef.current.push(setTimeout(() => setFlash(null), 500 + i * 650 + 380))
    })
    timersRef.current.push(
      setTimeout(() => {
        setFlash(null)
        setPhase('input')
        setMessage(`${npc.name}：轮到你了，按顺序放料！`)
      }, 500 + seq.length * 650),
    )
  }, [npc.name])

  useEffect(() => {
    startRound(0)
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = (idx: number) => {
    if (phase !== 'input') return
    if (idx === seqRef.current[inputIdx]) {
      const next = inputIdx + 1
      setInputIdx(next)
      if (next >= seqRef.current.length) {
        if (round + 1 >= ROUNDS.length) {
          setMessage(`${npc.name}：完美！这炉饼干能香飘整条街！`)
          setPhase('roundEnd')
          setTimeout(() => onFinish({ affinity: 10, summary: '完成了全部三轮烘焙，饼干大获成功' }), 1400)
        } else {
          setMessage(`${npc.name}：好记性！下一步更难了哦。`)
          setPhase('roundEnd')
          setTimeout(() => {
            setRound((r) => {
              startRound(r + 1)
              return r + 1
            })
          }, 1200)
        }
      }
    } else {
      setWrong(idx)
      setTimeout(() => setWrong(null), 500)
      setMessage(`${npc.name}：哎呀，顺序错了，面团作废了……再来一次？`)
      setPhase('roundEnd')
      setTimeout(() => startRound(round), 1300)
    }
  }

  return (
    <div className="text-center">
      <div className="text-3xl mb-1">🍪</div>
      <div className="font-bold text-amber-950 mb-1">{npc.game.name}</div>
      <div className="text-xs text-amber-800/70 mb-3">第 {round + 1} / {ROUNDS.length} 步 · 记住亮起食材的顺序，然后照样放料</div>
      <div className="min-h-[40px] flex items-center justify-center mb-3">
        <div className="text-sm text-amber-900 bg-amber-100/80 rounded-lg px-3 py-1.5 inline-block">{message}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto">
        {INGREDIENTS.map((ing, i) => (
          <button
            key={ing.id}
            onClick={() => pick(i)}
            className={`rounded-xl border-2 py-3 text-2xl transition-all ${
              flash === i
                ? 'bg-amber-300 border-amber-500 scale-105 shadow-lg'
                : wrong === i
                  ? 'bg-red-200 border-red-400 shake'
                  : phase === 'input'
                    ? 'bg-white border-amber-900/25 hover:bg-amber-50 hover:scale-105'
                    : 'bg-white/70 border-amber-900/15'
            }`}
            disabled={phase !== 'input'}
          >
            {ing.emoji}
            <div className="text-[10px] text-amber-900/70 mt-0.5">{ing.name}</div>
          </button>
        ))}
      </div>
      {phase === 'roundEnd' && round + 1 >= ROUNDS.length && (
        <Button className="mt-4 bg-amber-700 hover:bg-amber-800 text-white" onClick={() => onFinish({ affinity: 10, summary: '完成了全部三轮烘焙，饼干大获成功' })}>
          收下成果
        </Button>
      )}
    </div>
  )
}
