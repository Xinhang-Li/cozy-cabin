import { useCallback, useEffect, useRef, useState } from 'react'
import type { NpcDef } from '@/game/npcs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  npc: NpcDef
  onFinish: (result: { affinity: number; summary: string }) => void
}

const WORDS = [
  'console.log', 'await', 'import', 'return', 'async', 'debug', 'commit',
  'merge', 'branch', 'cache', 'token', 'render', 'props', 'state', 'deploy',
  'null', 'undefined', 'try-catch', 'refactor', 'hotfix',
]

const DURATION = 30

export default function DebugGame({ npc, onFinish }: Props) {
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)])
  const [input, setInput] = useState('')
  const [fixed, setFixed] = useState(0)
  const [shake, setShake] = useState(false)
  const [running, setRunning] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const nextWord = useCallback(() => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)])
    setInput('')
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer)
          setRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const submit = () => {
    if (!running) return
    if (input.trim() === word) {
      setFixed((f) => f + 1)
      nextWord()
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }

  useEffect(() => {
    if (!running) {
      const affinity = Math.min(20, fixed * 2 + 2)
      const summary = `30 秒修掉了 ${fixed} 个 bug`
      const t = setTimeout(() => onFinish({ affinity, summary }), 1800)
      return () => clearTimeout(t)
    }
  }, [running, fixed, onFinish])

  return (
    <div className="text-center">
      <div className="text-3xl mb-1">🐛</div>
      <div className="font-bold text-amber-950 mb-1">{npc.game.name}</div>
      <div className="text-xs text-amber-800/70 mb-3">输入 bug 身上的代码并回车，30 秒倒计时</div>
      <div className="flex items-center justify-center gap-4 mb-3 text-sm">
        <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-900">⏱ {timeLeft}s</span>
        <span className="rounded-lg bg-green-100 px-2.5 py-1 text-green-800">✅ 已修 {fixed}</span>
      </div>
      {running ? (
        <>
          <div className={`inline-block text-2xl mb-3 ${shake ? 'shake' : ''}`}>
            <span className="text-4xl align-middle">🐛</span>{' '}
            <code className="bg-amber-900/90 text-amber-50 rounded-lg px-3 py-1.5 text-lg align-middle">{word}</code>
          </div>
          <div className="max-w-[280px] mx-auto">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="输入这行代码…"
              className="bg-white border-amber-900/25 text-center font-mono"
            />
          </div>
        </>
      ) : (
        <div className="py-4">
          <div className="text-lg font-bold text-amber-950 mb-1">时间到！</div>
          <div className="text-sm text-amber-900">
            你修掉了 {fixed} 个 bug。
          </div>
          <div className="text-xs text-amber-800/70 mt-1">
            {fixed >= 10 ? `${npc.name}：可以啊，这手速，Offer 早该发了。` : fixed >= 5 ? `${npc.name}：还行，比我想象中强一点。` : `${npc.name}：没事，生产环境会教你做人的。`}
          </div>
          <Button className="mt-3 bg-amber-700 hover:bg-amber-800 text-white" onClick={() => onFinish({ affinity: Math.min(20, fixed * 2 + 2), summary: `30 秒修掉了 ${fixed} 个 bug` })}>
            收工
          </Button>
        </div>
      )}
    </div>
  )
}
