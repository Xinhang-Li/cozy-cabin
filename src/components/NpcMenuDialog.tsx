import type { NpcDef } from '@/game/npcs'
import { affinityInfo } from '@/game/affinity'
import { Button } from '@/components/ui/button'

interface Props {
  npc: NpcDef
  affinity: number
  onChat: () => void
  onPlay: () => void
  onClose: () => void
}

export default function NpcMenuDialog({ npc, affinity, onChat, onPlay, onClose }: Props) {
  const aff = affinityInfo(affinity)
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[min(360px,90%)] rounded-2xl border-2 border-amber-900/50 bg-[#fff8ec]/95 shadow-2xl p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-3xl border-2 mb-2"
          style={{ backgroundColor: npc.shirt, borderColor: npc.hair }}
        >
          {npc.emoji}
        </div>
        <div className="font-bold text-amber-950 text-lg">{npc.name}</div>
        <div className="text-xs text-rose-600 mb-3">
          ❤ {aff.points} · {aff.label}
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={onChat} className="bg-amber-700 hover:bg-amber-800 text-white w-full">
            💬 聊天
          </Button>
          <Button onClick={onPlay} variant="outline" className="border-amber-900/30 text-amber-900 w-full">
            🎮 {npc.game.name}
            <span className="block text-[10px] font-normal opacity-70">{npc.game.desc}</span>
          </Button>
          <button onClick={onClose} className="text-xs text-amber-800/60 hover:text-amber-800 mt-1">
            离开 (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
