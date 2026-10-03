import { useMemo, useState } from 'react'
import type { NpcDef } from '@/game/npcs'
import { Button } from '@/components/ui/button'

interface Props {
  npc: NpcDef
  onFinish: (result: { affinity: number; summary: string }) => void
}

interface Q {
  q: string
  options: string[]
  answer: number
  comment: string // 答对后的点评
}

const BANK: Q[] = [
  {
    q: '苏格拉底讨论问题最常用的方式是？',
    options: ['长篇说教', '不断提问引导思考', '引用权威结论', '沉默不语'],
    answer: 1,
    comment: '产婆术——通过提问帮人"接生"出真理。',
  },
  {
    q: '"子非鱼，安知鱼之乐？"出自哪位思想家？',
    options: ['孔子', '孟子', '庄子', '老子'],
    answer: 2,
    comment: '庄子与惠施的濠梁之辩，是关于"知"的千古公案。',
  },
  {
    q: '"我思故我在"是谁提出的？',
    options: ['笛卡尔', '康德', '黑格尔', '叔本华'],
    answer: 0,
    comment: '笛卡尔用怀疑一切的方法，找到了不可怀疑的起点。',
  },
  {
    q: '"电车难题"主要考验的是？',
    options: ['数学计算能力', '功利与道德的冲突', '驾驶技术', '法律条文记忆'],
    answer: 1,
    comment: '救多数还是守底线？这个难题至今没有标准答案。',
  },
  {
    q: '尼采宣告"上帝已死"，意在？',
    options: ['宣传无神论邪教', '质疑传统价值的权威', '赞美上帝', '预言世界末日'],
    answer: 1,
    comment: '他指的是旧价值体系的崩塌，人必须自己创造价值。',
  },
  {
    q: '庄子的"逍遥游"追求的境界是？',
    options: ['大富大贵', '精神自由', '长生不老', '位极人臣'],
    answer: 1,
    comment: '无所依待，心灵才真正自由。',
  },
  {
    q: '柏拉图的"洞穴比喻"说明了？',
    options: ['建筑学原理', '感知到的未必是真实', '火的安全隐患', '影子的艺术'],
    answer: 1,
    comment: '囚徒把影子当全部真实——我们看到的，可能只是墙上的影子。',
  },
  {
    q: '存在主义最关心的命题是？',
    options: ['人的存在与自由选择', '宇宙的物理起源', '动植物的分类', '语法规则'],
    answer: 0,
    comment: '人被抛入世界，但如何选择，是自己的事。',
  },
]

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizGame({ npc, onFinish }: Props) {
  const questions = useMemo(() => shuffle(BANK).slice(0, 5), [])
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [phase, setPhase] = useState<'ask' | 'reveal' | 'done'>('ask')

  const cur = questions[idx]

  const pick = (i: number) => {
    if (phase !== 'ask') return
    setPicked(i)
    setPhase('reveal')
    if (i === cur.answer) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (idx + 1 >= questions.length) {
      setPhase('done')
    } else {
      setIdx((i) => i + 1)
      setPicked(null)
      setPhase('ask')
    }
  }

  const affinity = correct * 2 + 2
  const summary = `哲学问答答对 ${correct} / ${questions.length} 题`

  return (
    <div className="text-center">
      <div className="text-3xl mb-1">📖</div>
      <div className="font-bold text-amber-950 mb-1">{npc.game.name}</div>
      {phase !== 'done' ? (
        <>
          <div className="text-xs text-amber-800/70 mb-3">
            第 {idx + 1} / {questions.length} 题 · 已答对 {correct} 题
          </div>
          <div className="text-sm text-amber-950 font-medium bg-amber-100/80 rounded-lg px-3 py-2 inline-block mb-3 max-w-[380px]">
            {cur.q}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[420px] mx-auto">
            {cur.options.map((opt, i) => {
              let cls = 'bg-white border-amber-900/25 hover:bg-amber-50'
              if (phase === 'reveal') {
                if (i === cur.answer) cls = 'bg-green-100 border-green-500'
                else if (i === picked) cls = 'bg-red-100 border-red-400'
                else cls = 'bg-white/60 border-amber-900/15'
              }
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={phase === 'reveal'}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm text-amber-950 text-left transition-colors ${cls}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {phase === 'reveal' && (
            <div className="mt-3">
              <div className="text-xs text-amber-800/80 italic mb-2">
                {npc.name}：{picked === cur.answer ? cur.comment : '有意思的答案——错误往往比正确更接近思考的开始。'}
              </div>
              <Button size="sm" onClick={next} className="bg-amber-700 hover:bg-amber-800 text-white">
                {idx + 1 >= questions.length ? '结束问答' : '下一题'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="py-3">
          <div className="text-lg font-bold text-amber-950 mb-1">问答结束</div>
          <div className="text-sm text-amber-900 mb-1">
            答对 {correct} / {questions.length} 题
          </div>
          <div className="text-xs text-amber-800/70 mb-1">
            {npc.name}：
            {correct >= 4
              ? '你有一颗爱思考的心。下次，我们聊聊死亡与永恒。'
              : correct >= 2
                ? '不错的开始。哲学不在于答案，在于追问。'
                : '没关系，苏格拉底也有很多问题答不上来。'}
          </div>
          <Button className="mt-3 bg-amber-700 hover:bg-amber-800 text-white" onClick={() => onFinish({ affinity, summary })}>
            结束
          </Button>
        </div>
      )}
    </div>
  )
}
