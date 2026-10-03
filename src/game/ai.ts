import type { AiConfig, ChatMessage } from './types'
import type { NpcDef } from './npcs'

const STORAGE_KEY = 'cozy-cabin-ai-config'

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
}

export const AI_PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
]

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_AI_CONFIG }
}

export function saveAiConfig(cfg: AiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function isAiReady(cfg: AiConfig): boolean {
  return !!cfg.apiKey.trim() && !!cfg.baseUrl.trim() && !!cfg.model.trim()
}

export interface ChatEnv {
  day: number
  time: string
  /** 好感度关系等级标签，如「朋友」 */
  affinityLabel?: string
}

function buildSystemPrompt(npc: NpcDef, env: ChatEnv): string {
  const relationLine = env.affinityLabel
    ? `【关系】玩家与你的关系等级是「${env.affinityLabel}」。${env.affinityLabel === '知心' || env.affinityLabel === '挚友' ? '你们已经非常亲近，可以分享内心深处的想法、回忆和秘密，语气像最亲密的朋友。' : env.affinityLabel === '朋友' ? '你们已经是朋友，可以更放松、更交心地交流。' : '保持自然友好的态度，像刚认识不久的朋友一样相处。'}`
    : ''
  return [
    `你是治愈系生活模拟游戏《温馨小屋》中的 NPC「${npc.name}」。`,
    `【身份】${npc.identity}`,
    `【性格】${npc.personality}`,
    `【说话风格】${npc.speakingStyle}`,
    `【当前情境】游戏内现在是第 ${env.day} 天，${env.time}。玩家是住在这栋小屋里的朋友，正站在你面前和你聊天。`,
    relationLine,
    '',
    '规则：',
    '1. 始终完全沉浸在你的角色里，用第一人称说话，绝不提及自己是 AI 或语言模型。',
    '2. 用简体中文口语回复，每次只回复 1~3 句话，简短自然，像真实聊天。',
    '3. 玩家可以和你聊任何现实话题（工作、学习、美食、心情、烦恼、八卦等），你要以你的人设、阅历和性格真实回应，可以给出建议、安慰、吐槽或分享。',
    '4. 可以偶尔结合游戏情境（时间、房间、你正在做的事）让对话更生动。',
    '5. 不要罗列要点，不要使用 Markdown 格式。',
  ].filter(Boolean).join('\n')
}

/** 调用 OpenAI 兼容的 /chat/completions 接口。
 *  history 需已包含最新一条 user 消息（可见或 hidden 情境消息均可作为上下文）。 */
export async function chatWithNpc(
  npc: NpcDef,
  history: ChatMessage[],
  env: ChatEnv,
): Promise<string> {
  const cfg = loadAiConfig()
  if (!isAiReady(cfg)) {
    throw new Error('AI 服务未配置：请先在右上角「设置」里填写 API Key。')
  }
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(npc, env) },
    ...history.filter((m) => m.role !== 'system'),
  ]
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.8,
        max_tokens: 220,
      }),
    })
  } catch {
    throw new Error('网络请求失败：请检查 Base URL 是否正确、网络是否可达（浏览器跨域需服务方允许）。')
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('API Key 鉴权失败（401/403），请检查 Key 是否正确或是否已过期。')
  }
  if (res.status === 404) {
    throw new Error('接口地址 404：请检查 Base URL 是否正确（应为 …/v1 形式）。')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI 服务返回错误（HTTP ${res.status}）：${text.slice(0, 160)}`)
  }
  const data = await res.json()
  const reply: string | undefined = data?.choices?.[0]?.message?.content
  if (!reply) throw new Error('AI 服务返回了空内容，请重试。')
  return reply.trim()
}

export interface DialogueLine {
  npcId: string
  text: string
}

/** 生成两个 NPC 之间的一段闲聊对话（一次 API 调用，双方轮替） */
export async function generateNpcDialogue(
  a: NpcDef,
  b: NpcDef,
  env: { day: number; time: string },
): Promise<DialogueLine[]> {
  const cfg = loadAiConfig()
  if (!isAiReady(cfg)) throw new Error('AI 未配置')
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const system = [
    '你是生活模拟游戏的对话编剧。根据给出的两个角色人设，创作他们之间一段自然的闲聊。',
    `要求：口语化、生活化，与当前情境（温馨小屋内，第 ${env.day} 天 ${env.time}）有关；两人轮替，每人 2~3 句；每句话不超过 40 字。`,
    '严格按以下格式输出，每行一条，不要输出任何其他内容：',
    `${a.name}：……`,
    `${b.name}：……`,
  ].join('\n')
  const user = [
    `【${a.name}】${a.identity} 性格：${a.personality} 说话风格：${a.speakingStyle}`,
    `【${b.name}】${b.identity} 性格：${b.personality} 说话风格：${b.speakingStyle}`,
  ].join('\n')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.9,
      max_tokens: 320,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ''
  const lines: DialogueLine[] = []
  for (const raw of text.split('\n')) {
    const m = raw.match(/^\s*([^：:]{1,12})[：:](.+)$/)
    if (!m) continue
    const speaker = m[1].trim()
    const content = m[2].trim()
    if (!content) continue
    if (speaker.includes(a.name) || a.name.includes(speaker)) lines.push({ npcId: a.id, text: content })
    else if (speaker.includes(b.name) || b.name.includes(speaker)) lines.push({ npcId: b.id, text: content })
  }
  if (lines.length < 2) throw new Error('对话内容解析失败')
  return lines.slice(0, 8)
}

/** AI 未配置时的 fallback 新闻 */
const FALLBACK_NEWS = [
  '全国多地迎来今冬第一场雪，网友：南方人实名羡慕',
  '国产AI助手用户数破亿，官方回应：将继续免费开放',
  '科学家发现新型电池材料，充电速度提升五倍',
  '老牌汽水品牌回归街头，年轻人排队打卡',
  '社区图书馆24小时开放，深夜座无虚席',
]

/** 让 AI 生成当前热门新闻标题（5 条） */
export async function generateTvNews(): Promise<string[]> {
  const cfg = loadAiConfig()
  if (!isAiReady(cfg)) {
    return FALLBACK_NEWS.slice(0, 5)
  }
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          {
            role: 'system',
            content: [
              '你是电视台新闻编辑。列出 5 条"当前互联网热门新闻"的标题。',
              '要求：像真实热搜标题，每条不超过 22 字，覆盖科技、社会、娱乐、体育、生活等不同领域，口语化、有点击欲。',
              '只输出 5 行标题，每行一条，不要序号、不要其他内容。',
            ].join('\n'),
          },
          { role: 'user', content: '现在有什么热门新闻？' },
        ],
        temperature: 1.0,
        max_tokens: 200,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.、]\s*/, '').trim())
      .filter((l) => l.length > 4 && l.length < 40)
      .slice(0, 5)
    if (lines.length >= 3) return lines
    throw new Error('解析失败')
  } catch {
    return FALLBACK_NEWS.slice(0, 5)
  }
}
