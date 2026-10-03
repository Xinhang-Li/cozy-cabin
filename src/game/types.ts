export interface Rect {
  x: number // tile coords
  y: number
  w: number
  h: number
}

export type FurnitureKind =
  | 'bed'
  | 'wardrobe'
  | 'fridge'
  | 'stove'
  | 'counter'
  | 'table'
  | 'sofa'
  | 'tv'
  | 'bookshelf'
  | 'desk'
  | 'plant'
  | 'rug'

export interface FurnitureItem {
  id: string
  kind: FurnitureKind
  name: string
  rect: Rect
  solid: boolean
  interact: { type: 'sleep' } | { type: 'flavor'; text: string } | { type: 'news' } | null
}

export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** 不在聊天界面显示，但会作为上下文发给 AI（如主动搭话的情境提示） */
  hidden?: boolean
}
