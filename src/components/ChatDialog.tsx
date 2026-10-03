import { useEffect, useRef, useState } from 'react'
import type { NpcDef } from '@/game/npcs'
import type { ChatMessage } from '@/game/types'
import { affinityInfo } from '@/game/affinity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  npc: NpcDef
  messages: ChatMessage[]
  sending: boolean
  aiReady: boolean
  affinity: number
  onSend: (text: string) => void
  onClose: () => void
  onOpenSettings: () => void
}

export default function ChatDialog({ npc, messages, sending, aiReady, affinity, onSend, onClose, onOpenSettings }: Props) {
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const submit = () => {
    const t = text.trim()
    if (!t || sending) return
    onSend(t)
    setText('')
  }

  const aff = affinityInfo(affinity)

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-[min(680px,94%)] mb-3 rounded-2xl border-2 border-amber-900/60 bg-[#fff8ec]/95 shadow-2xl backdrop-blur flex flex-col max-h-[46vh]">
        {/* header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-amber-900/20">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2"
            style={{ backgroundColor: npc.shirt, borderColor: npc.hair }}
          >
            {npc.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-amber-950 leading-tight">{npc.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-rose-600 font-medium">❤ {aff.points}</span>
              <span className="text-[11px] text-amber-800/70">{aff.label}</span>
              <div className="w-14 h-1.5 rounded-full bg-amber-900/15 overflow-hidden" title={aff.nextLabel ? `距「${aff.nextLabel}」还差 ${(aff.nextMin ?? 0) - aff.points} 点` : '已满级'}>
                <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${Math.round(aff.progress * 100)}%` }} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-900/50 hover:text-amber-900 text-xl leading-none px-2"
            title="结束对话 (Esc)"
          >
            ×
          </button>
        </div>
        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
          {messages
            .filter((m) => m.role !== 'system' && !m.hidden)
            .map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-amber-700 text-amber-50 rounded-br-sm'
                      : 'bg-white border border-amber-900/15 text-amber-950 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-amber-900/15 rounded-2xl rounded-bl-sm px-3 py-2 text-amber-800/60">
                {npc.name}正在输入…
              </div>
            </div>
          )}
          {!aiReady && (
            <div className="text-center text-xs text-amber-800/80 bg-amber-100/70 rounded-lg px-3 py-2">
              尚未配置 AI 服务，{npc.name}暂时只会复读。
              <button className="underline font-medium ml-1" onClick={onOpenSettings}>
                去设置 API Key
              </button>
            </div>
          )}
        </div>
        {/* input */}
        <div className="flex gap-2 px-4 py-3 border-t border-amber-900/20">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={`和${npc.name}说点什么…`}
            className="bg-white border-amber-900/25 focus-visible:ring-amber-600"
          />
          <Button onClick={submit} disabled={sending || !text.trim()} className="bg-amber-700 hover:bg-amber-800 text-white">
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
