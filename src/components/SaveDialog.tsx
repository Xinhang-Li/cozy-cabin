import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  AUTO_SLOT,
  MANUAL_SLOTS,
  loadSlots,
  writeSlot,
  deleteSlot,
  buildSaveData,
  applySave,
  exportSaveFile,
  parseSaveFile,
  type SaveData,
} from '@/game/save'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  getWorld: () => { day: number; minutes: number; player: { x: number; y: number } }
  onSaved: (slot: string) => void
}

function fmtTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fmtClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`

export default function SaveDialog({ open, onOpenChange, getWorld, onSaved }: Props) {
  const [tick, setTick] = useState(0)
  const [tip, setTip] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const slots = loadSlots()

  const refresh = (msg: string) => {
    setTick((t) => t + 1)
    setTip(msg)
    setTimeout(() => setTip(''), 2000)
  }

  const doSave = (slot: string) => {
    writeSlot(slot, buildSaveData(getWorld()))
    onSaved(slot)
    refresh(slot === AUTO_SLOT ? '已保存到自动存档' : `已保存到存档 ${slot.slice(-1)}`)
  }

  const doLoad = (slot: string) => {
    const data = slots[slot]
    if (!data) return
    if (!applySave(data)) {
      refresh('存档损坏，无法读取')
      return
    }
    location.reload()
  }

  const doExport = (slot: string) => {
    const data = slots[slot]
    if (data) exportSaveFile(data)
  }

  const doImportFile = async (file: File) => {
    const text = await file.text()
    const data = parseSaveFile(text)
    if (!data) {
      refresh('文件不是有效的存档')
      return
    }
    writeSlot(`import-${Date.now()}`, data)
    refresh('导入成功，已生成新存档')
  }

  const slotRow = (slot: string, label: string, data: SaveData | undefined, isAuto: boolean) => (
    <div
      key={`${slot}-${tick}`}
      className="flex items-center gap-2 rounded-xl border border-amber-900/20 bg-white px-3 py-2.5"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-amber-950">
          {label}
          {isAuto && <span className="ml-1 text-[10px] font-normal text-amber-700 bg-amber-100 rounded px-1">每 30 秒自动更新</span>}
        </div>
        {data ? (
          <div className="text-[11px] text-amber-800/70">
            第 {data.day} 天 {fmtClock(data.minutes)} · {fmtTime(data.savedAt)}
          </div>
        ) : (
          <div className="text-[11px] text-amber-800/40">空</div>
        )}
      </div>
      <Button size="sm" variant="outline" className="border-amber-900/30 text-amber-900 h-7 px-2" onClick={() => doSave(slot)}>
        存档
      </Button>
      <Button size="sm" variant="outline" className="border-amber-900/30 text-amber-900 h-7 px-2" disabled={!data} onClick={() => doExport(slot)}>
        导出
      </Button>
      <Button
        size="sm"
        className="bg-amber-700 hover:bg-amber-800 text-white h-7 px-2"
        disabled={!data}
        onClick={() => doLoad(slot)}
      >
        读档
      </Button>
      {!isAuto && data && (
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 px-1" onClick={() => { deleteSlot(slot); refresh('已删除') }}>
          ×
        </Button>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fff8ec] border-amber-900/30 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-amber-950">💾 存档 / 读档</DialogTitle>
          <DialogDescription className="text-amber-800/80">
            保存天数、时间、位置、对话记忆、好感度和礼物。读档会刷新页面并恢复全部进度。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {slotRow(AUTO_SLOT, '自动存档', slots[AUTO_SLOT], true)}
          {MANUAL_SLOTS.map((s, i) => slotRow(s, `存档 ${i + 1}`, slots[s], false))}
          {Object.keys(slots)
            .filter((k) => k.startsWith('import-'))
            .map((k) => slotRow(k, '导入的存档', slots[k], false))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" className="border-amber-900/30 text-amber-900" onClick={() => fileRef.current?.click()}>
            📂 从文件导入
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImportFile(f)
              e.target.value = ''
            }}
          />
          {tip && <span className="text-sm text-green-700">{tip}</span>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
