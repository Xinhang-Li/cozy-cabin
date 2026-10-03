import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { NpcDef } from '@/game/npcs'
import { loadOverrides, saveOverrides, resetOverride, loadNpcDefs } from '@/game/store'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  npcs: NpcDef[]
  onSaved: (defs: NpcDef[]) => void
}

interface Form {
  name: string
  emoji: string
  age: string
  shirt: string
  hair: string
  skin: string
  identity: string
  personality: string
  speakingStyle: string
  greeting: string
  proactiveText: string
}

const EMPTY: Form = {
  name: '',
  emoji: '',
  age: '30',
  shirt: '#888888',
  hair: '#333333',
  skin: '#ffd9b3',
  identity: '',
  personality: '',
  speakingStyle: '',
  greeting: '',
  proactiveText: '',
}

export default function CharacterCardDialog({ open, onOpenChange, npcs, onSaved }: Props) {
  const [selectedId, setSelectedId] = useState(npcs[0]?.id ?? '')
  const [form, setForm] = useState<Form>(EMPTY)
  const [savedTip, setSavedTip] = useState(false)

  const npc = npcs.find((n) => n.id === selectedId) ?? npcs[0]

  useEffect(() => {
    if (!open || !npc) return
    setForm({
      name: npc.name,
      emoji: npc.emoji,
      age: String(npc.age),
      shirt: npc.shirt,
      hair: npc.hair,
      skin: npc.skin,
      identity: npc.identity,
      personality: npc.personality,
      speakingStyle: npc.speakingStyle,
      greeting: npc.greeting,
      proactiveText: (npc.proactive ?? []).join('\n'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId])

  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  const save = () => {
    if (!npc) return
    const overrides = loadOverrides()
    overrides[npc.id] = {
      name: form.name.trim() || npc.name,
      emoji: form.emoji.trim() || npc.emoji,
      age: Number(form.age) || npc.age,
      shirt: form.shirt,
      hair: form.hair,
      skin: form.skin,
      identity: form.identity.trim(),
      personality: form.personality.trim(),
      speakingStyle: form.speakingStyle.trim(),
      greeting: form.greeting.trim(),
      proactive: form.proactiveText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    saveOverrides(overrides)
    onSaved(loadNpcDefs())
    setSavedTip(true)
    setTimeout(() => setSavedTip(false), 1500)
  }

  const reset = () => {
    if (!npc) return
    resetOverride(npc.id)
    onSaved(loadNpcDefs())
    setSelectedId(npc.id) // 触发 form 重置
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fff8ec] border-amber-900/30 sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-950">角色卡编辑</DialogTitle>
          <DialogDescription className="text-amber-800/80">
            调整每位 NPC 的身份、性格和说话方式，保存后立即生效并长期保留。
          </DialogDescription>
        </DialogHeader>
        {/* NPC selector */}
        <div className="flex flex-wrap gap-2 pt-1">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                n.id === npc?.id
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-amber-900 border-amber-900/30 hover:bg-amber-100'
              }`}
            >
              {n.emoji} {n.name}
            </button>
          ))}
        </div>
        {npc && (
          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <Label className="text-amber-950">名字</Label>
                <Input value={form.name} onChange={(e) => update({ name: e.target.value })} className="bg-white border-amber-900/25" />
              </div>
              <div className="space-y-1">
                <Label className="text-amber-950">表情</Label>
                <Input value={form.emoji} onChange={(e) => update({ emoji: e.target.value })} className="bg-white border-amber-900/25" />
              </div>
              <div className="space-y-1">
                <Label className="text-amber-950">年龄</Label>
                <Input value={form.age} onChange={(e) => update({ age: e.target.value })} className="bg-white border-amber-900/25" />
              </div>
              <div className="space-y-1">
                <Label className="text-amber-950">上衣颜色</Label>
                <input type="color" value={form.shirt} onChange={(e) => update({ shirt: e.target.value })} className="w-full h-9 rounded cursor-pointer bg-white border border-amber-900/25 p-0.5" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-amber-950">身份 / 背景故事</Label>
              <Textarea value={form.identity} onChange={(e) => update({ identity: e.target.value })} rows={3} className="bg-white border-amber-900/25" />
            </div>
            <div className="space-y-1">
              <Label className="text-amber-950">性格</Label>
              <Textarea value={form.personality} onChange={(e) => update({ personality: e.target.value })} rows={2} className="bg-white border-amber-900/25" />
            </div>
            <div className="space-y-1">
              <Label className="text-amber-950">说话风格</Label>
              <Textarea value={form.speakingStyle} onChange={(e) => update({ speakingStyle: e.target.value })} rows={2} className="bg-white border-amber-900/25" />
            </div>
            <div className="space-y-1">
              <Label className="text-amber-950">开场白</Label>
              <Input value={form.greeting} onChange={(e) => update({ greeting: e.target.value })} className="bg-white border-amber-900/25" />
            </div>
            <div className="space-y-1">
              <Label className="text-amber-950">主动聊天话题（每行一条，未配置 AI 时使用）</Label>
              <Textarea value={form.proactiveText} onChange={(e) => update({ proactiveText: e.target.value })} rows={3} className="bg-white border-amber-900/25" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={save} className="bg-amber-700 hover:bg-amber-800 text-white">保存角色卡</Button>
              <Button onClick={reset} variant="outline" className="border-amber-900/30 text-amber-900">恢复默认</Button>
              {savedTip && <span className="text-sm text-green-700">已保存 ✓</span>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
