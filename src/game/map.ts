import type { FurnitureItem, Rect } from './types'

export const TILE = 32
export const MAP_W = 30
export const MAP_H = 22

export type FloorStyle = 'bedroom' | 'kitchen' | 'living' | 'study'

export interface HouseMap {
  /** solid[y][x] — walls + solid furniture baked in */
  solid: boolean[][]
  /** floor style per tile (for rendering) */
  floor: FloorStyle[][]
  /** wall side flag: wall tile that needs a shaded "base" (south neighbour is floor) */
  wallBase: boolean[][]
  furniture: FurnitureItem[]
  playerSpawn: { x: number; y: number } // tile coords
}

function flavor(_name: string, text: string) {
  return { type: 'flavor' as const, text }
}

function buildFurniture(): FurnitureItem[] {
  const f = (
    id: string,
    kind: FurnitureItem['kind'],
    name: string,
    rect: Rect,
    interact: FurnitureItem['interact'] = null,
  ): FurnitureItem => ({ id, kind, name, rect, solid: kind !== 'rug', interact })

  return [
    // ── 卧室 (x1..13, y1..9)
    f('bed', 'bed', '床', { x: 2, y: 2, w: 2, h: 3 }, { type: 'sleep' }),
    f('wardrobe', 'wardrobe', '衣柜', { x: 6, y: 1, w: 2, h: 1 },
      flavor('衣柜', '衣柜里挂着几件舒适的衣服，闻起来有阳光的味道。')),
    f('rug-b', 'rug', '地毯', { x: 5, y: 5, w: 4, h: 3 },
      flavor('地毯', '踩上去软乎乎的，橘猫最喜欢在这上面打盹。')),
    f('plant-b', 'plant', '绿植', { x: 12, y: 1, w: 1, h: 1 },
      flavor('绿植', '一盆茂盛的绿萝，叶子绿得发亮。')),

    // ── 厨房 (x1..13, y12..20)
    f('fridge', 'fridge', '冰箱', { x: 1, y: 12, w: 1, h: 2 },
      flavor('冰箱', '冰箱里塞满了食材：鸡蛋、牛奶、昨晚的剩菜，还有半块蛋糕。')),
    f('counter', 'counter', '橱柜', { x: 1, y: 20, w: 6, h: 1 },
      flavor('橱柜', '料理台上摆着调味罐和一本翻旧了的食谱。')),
    f('stove', 'stove', '灶台', { x: 2, y: 20, w: 1, h: 1 },
      flavor('灶台', '灶上的汤锅还温着，飘出淡淡的香味。')),
    f('table-k', 'table', '餐桌', { x: 4, y: 15, w: 2, h: 2 },
      flavor('餐桌', '餐桌上铺着格子桌布，花瓶里插着几支小花。')),
    f('plant-k', 'plant', '绿植', { x: 12, y: 20, w: 1, h: 1 },
      flavor('绿植', '一盆薄荷，随手掐一片就能泡茶。')),

    // ── 客厅 (x16..28, y1..9)
    f('tv', 'tv', '电视', { x: 22, y: 1, w: 1, h: 1 }, { type: 'news' }),
    f('sofa', 'sofa', '沙发', { x: 21, y: 4, w: 3, h: 1 },
      flavor('沙发', '软乎乎的布艺沙发，陷进去就不想出来。')),
    f('tea-table', 'table', '茶几', { x: 21, y: 6, w: 2, h: 1 },
      flavor('茶几', '茶几上放着一杯茶和一副没下完的棋。')),
    f('plant-l', 'plant', '绿植', { x: 27, y: 8, w: 1, h: 1 },
      flavor('绿植', '一盆虎皮兰，长得比人还高。')),

    // ── 书房 (x16..28, y12..20)
    f('shelf-1', 'bookshelf', '书架', { x: 28, y: 13, w: 1, h: 3 },
      flavor('书架', '书架上从诗词歌赋排到武侠小说，还夹着几本编程书。')),
    f('shelf-2', 'bookshelf', '书架', { x: 16, y: 12, w: 1, h: 2 },
      flavor('书架', '这一架全是旧书和笔记本，书脊已经磨白了。')),
    f('desk', 'desk', '书桌', { x: 26, y: 20, w: 2, h: 1 },
      flavor('书桌', '书桌上摊着稿纸，台灯还亮着。')),
    f('rug-s', 'rug', '地毯', { x: 20, y: 14, w: 4, h: 3 },
      flavor('地毯', '一块旧羊毛地毯，角落有被猫抓过的痕迹。')),
  ]
}

export function buildMap(): HouseMap {
  const solid: boolean[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false))
  const floor: FloorStyle[][] = Array.from({ length: MAP_H }, () =>
    Array(MAP_W).fill('living'),
  )
  const wallBase: boolean[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false))

  // border walls
  for (let x = 0; x < MAP_W; x++) {
    solid[0][x] = true
    solid[MAP_H - 1][x] = true
  }
  for (let y = 0; y < MAP_H; y++) {
    solid[y][0] = true
    solid[y][MAP_W - 1] = true
  }
  // horizontal divider y=10,11 — doors at x=7 (卧室↔厨房) and x=22 (客厅↔书房)
  for (let x = 1; x < MAP_W - 1; x++) {
    solid[10][x] = true
    solid[11][x] = true
  }
  solid[10][7] = solid[11][7] = false
  solid[10][22] = solid[11][22] = false
  // vertical divider x=14,15 — doors at y=5 (卧室↔客厅) and y=14 (厨房↔书房)
  for (let y = 1; y < MAP_H - 1; y++) {
    solid[y][14] = true
    solid[y][15] = true
  }
  solid[5][14] = solid[5][15] = false
  solid[14][14] = solid[14][15] = false

  // floor styles
  const paint = (x0: number, y0: number, x1: number, y1: number, s: FloorStyle) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) floor[y][x] = s
  }
  paint(1, 1, 13, 9, 'bedroom')
  paint(1, 12, 13, 20, 'kitchen')
  paint(16, 1, 28, 9, 'living')
  paint(16, 12, 28, 20, 'study')

  // furniture → solid grid
  const furniture = buildFurniture()
  for (const item of furniture) {
    if (!item.solid) continue
    for (let y = item.rect.y; y < item.rect.y + item.rect.h; y++) {
      for (let x = item.rect.x; x < item.rect.x + item.rect.w; x++) {
        solid[y][x] = true
      }
    }
  }

  // wall side shading: wall tile whose south neighbour is walkable floor
  for (let y = 0; y < MAP_H - 1; y++) {
    for (let x = 0; x < MAP_W; x++) {
      wallBase[y][x] = solid[y][x] && !solid[y + 1][x]
    }
  }

  return {
    solid,
    floor,
    wallBase,
    furniture,
    playerSpawn: { x: 5, y: 7 },
  }
}

/** circle-vs-tile collision */
export function collides(house: HouseMap, px: number, py: number, r: number): boolean {
  const x0 = Math.floor((px - r) / TILE)
  const x1 = Math.floor((px + r) / TILE)
  const y0 = Math.floor((py - r) / TILE)
  const y1 = Math.floor((py + r) / TILE)
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true
      if (house.solid[ty][tx]) {
        // closest point on tile to circle center
        const cx = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE))
        const cy = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE))
        const dx = px - cx
        const dy = py - cy
        if (dx * dx + dy * dy < r * r) return true
      }
    }
  }
  return false
}
