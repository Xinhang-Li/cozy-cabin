import { useState } from 'react'
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
import { loadAiConfig, saveAiConfig, AI_PRESETS } from '@/game/ai'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export default function SettingsDialog({ open, onOpenChange, onSaved }: Props) {
  const [cfg, setCfg] = useState(loadAiConfig)
  const [savedTip, setSavedTip] = useState(false)

  const update = (patch: Partial<typeof cfg>) => setCfg((c) => ({ ...c, ...patch }))

  const save = () => {
    saveAiConfig(cfg)
    setSavedTip(true)
    onSaved()
    setTimeout(() => setSavedTip(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fff8ec] border-amber-900/30 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-amber-950">AI 服务设置</DialogTitle>
          <DialogDescription className="text-amber-800/80">
            NPC 通过 OpenAI 兼容接口接入 AI。配置仅保存在本地浏览器，不会上传。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            {AI_PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                className="border-amber-900/30 text-amber-900 hover:bg-amber-100"
                onClick={() => update({ baseUrl: p.baseUrl, model: p.model })}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baseUrl" className="text-amber-950">Base URL</Label>
            <Input
              id="baseUrl"
              value={cfg.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="bg-white border-amber-900/25 focus-visible:ring-amber-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiKey" className="text-amber-950">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={cfg.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="bg-white border-amber-900/25 focus-visible:ring-amber-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-amber-950">模型</Label>
            <Input
              id="model"
              value={cfg.model}
              onChange={(e) => update({ model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="bg-white border-amber-900/25 focus-visible:ring-amber-600"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={save} className="bg-amber-700 hover:bg-amber-800 text-white">
              保存
            </Button>
            {savedTip && <span className="text-sm text-green-700">已保存 ✓</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
