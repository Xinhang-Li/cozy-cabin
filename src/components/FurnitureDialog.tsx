import { useEffect, useState } from 'react'
import type { FurnitureItem } from '@/game/types'
import { generateTvNews } from '@/game/ai'
import { Button } from '@/components/ui/button'

interface Props {
  furniture: FurnitureItem
  onClose: () => void
}

/** 家具互动弹窗：普通家具显示描述，电视调用 AI 生成热点新闻 */
export default function FurnitureDialog({ furniture, onClose }: Props) {
  const [news, setNews] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const isNews = furniture.interact?.type === 'news'

  useEffect(() => {
    if (!isNews) return
    let alive = true
    setLoading(true)
    generateTvNews().then((list) => {
      if (alive) {
        setNews(list)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [isNews])

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[min(420px,90%)] rounded-2xl border-2 border-amber-900/50 bg-[#fff8ec]/95 shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-amber-950 text-lg mb-2 flex items-center gap-2">
          {isNews && <span className="text-sm bg-red-100 text-red-600 rounded px-1.5 py-0.5">直播</span>}
          {furniture.name}
        </div>
        {isNews ? (
          <div className="mb-4">
            <div className="text-xs text-amber-800/70 mb-2">📺 正在播出今日热点</div>
            {loading || !news ? (
              <div className="text-sm text-amber-800/60 py-4 text-center">调台中……</div>
            ) : (
              <ul className="space-y-1.5">
                {news.map((t, i) => (
                  <li key={i} className="text-sm text-amber-950 bg-white rounded-lg px-3 py-2 border border-amber-900/15 leading-snug">
                    <span className="text-red-500 font-bold mr-1.5">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-amber-900/85 text-sm leading-relaxed mb-4">
            {furniture.interact?.type === 'flavor' ? furniture.interact.text : ''}
          </p>
        )}
        <Button onClick={onClose} className="bg-amber-700 hover:bg-amber-800 text-white w-full">
          {isNews ? '关掉电视' : '关闭'}
        </Button>
      </div>
    </div>
  )
}
