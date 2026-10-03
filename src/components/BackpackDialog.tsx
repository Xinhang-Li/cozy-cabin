import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Gift } from '@/game/store'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  gifts: Gift[]
}

export default function BackpackDialog({ open, onOpenChange, gifts }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fff8ec] border-amber-900/30 sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-950">🎒 背包 · 收到的礼物</DialogTitle>
          <DialogDescription className="text-amber-800/80">
            与 NPC 的关系升级时，他们会送你专属礼物。
          </DialogDescription>
        </DialogHeader>
        {gifts.length === 0 ? (
          <div className="text-center text-amber-800/70 text-sm py-8">
            还没有收到礼物。
            <br />
            多和 NPC 聊天、提升关系等级，他们会把心意送给你。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2">
            {gifts.map((g) => (
              <div key={g.id} className="rounded-xl border border-amber-900/20 bg-white p-3 flex gap-3 items-start">
                <div className="text-3xl leading-none mt-0.5">{g.emoji}</div>
                <div className="min-w-0">
                  <div className="font-bold text-amber-950 text-sm">{g.name}</div>
                  <div className="text-xs text-amber-900/75 leading-relaxed mt-0.5">{g.desc}</div>
                  <div className="text-[11px] text-amber-800/50 mt-1">
                    来自 {g.npcName} · 第 {g.day} 天
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
