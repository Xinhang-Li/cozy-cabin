import { TILE, MAP_W, MAP_H, type HouseMap, type FloorStyle } from './map'
import type { FurnitureItem } from './types'

export interface CharacterLook {
  shirt: string
  hair: string
  skin: string
  hairStyle: 'long' | 'bun' | 'short'
}

export const PLAYER_LOOK: CharacterLook = {
  shirt: '#d64541',
  hair: '#3a2a1a',
  skin: '#ffd9b3',
  hairStyle: 'short',
}

const FLOOR_COLORS: Record<FloorStyle, { base: string; alt: string; plank: boolean }> = {
  bedroom: { base: '#d9b382', alt: '#cfa878', plank: true },
  kitchen: { base: '#cfd8cd', alt: '#c2ccc1', plank: false },
  living: { base: '#c99e6d', alt: '#bf9464', plank: true },
  study: { base: '#b3a189', alt: '#a8977e', plank: true },
}

export function drawHouse(ctx: CanvasRenderingContext2D, house: HouseMap, t: number) {
  // floors
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const fx = x * TILE
      const fy = y * TILE
      if (house.solid[y][x]) continue
      const style = FLOOR_COLORS[house.floor[y][x]]
      ctx.fillStyle = (x + y) % 2 === 0 ? style.base : style.alt
      ctx.fillRect(fx, fy, TILE, TILE)
      if (style.plank) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)'
        ctx.fillRect(fx, fy + TILE - 1, TILE, 1)
        ctx.fillRect(fx + ((y % 2) * TILE) / 2, fy, 1, TILE)
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'
        ctx.strokeRect(fx + 0.5, fy + 0.5, TILE - 1, TILE - 1)
      }
    }
  }
  // door mats under doorways
  for (const [dx, dy] of [[7, 11], [22, 11], [14, 5], [15, 5], [14, 14], [15, 14]]) {
    if (!house.solid[dy]?.[dx]) {
      ctx.fillStyle = 'rgba(120,72,40,0.35)'
      ctx.fillRect(dx * TILE + 4, dy * TILE + 10, TILE - 8, 14)
    }
  }
  // walls
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!house.solid[y][x]) continue
      const isWall = isWallTile(house, x, y)
      if (!isWall) continue
      const fx = x * TILE
      const fy = y * TILE
      ctx.fillStyle = '#8a6a4f'
      ctx.fillRect(fx, fy, TILE, TILE)
      ctx.fillStyle = '#96755a'
      ctx.fillRect(fx, fy, TILE, 6)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(fx + TILE - 2, fy, 2, TILE)
      if (house.wallBase[y][x]) {
        ctx.fillStyle = '#6b4f38'
        ctx.fillRect(fx, fy + TILE - 10, TILE, 10)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(fx, fy + TILE - 10, TILE, 2)
      }
    }
  }
  // rugs (below furniture)
  for (const item of house.furniture) {
    if (item.kind === 'rug') drawRug(ctx, item)
  }
  // furniture
  const sorted = house.furniture.filter((i) => i.kind !== 'rug')
  for (const item of sorted) drawFurniture(ctx, item, t)
}

function isWallTile(house: HouseMap, x: number, y: number): boolean {
  // a solid tile that borders at least one floor tile → wall; else treat as void fill
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  for (const [dx, dy] of dirs) {
    const nx = x + dx
    const ny = y + dy
    if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && !house.solid[ny][nx]) return true
  }
  return y === 0 || x === 0 || y === MAP_H - 1 || x === MAP_W - 1
}

function drawRug(ctx: CanvasRenderingContext2D, item: FurnitureItem) {
  const { x, y, w, h } = item.rect
  const fx = x * TILE
  const fy = y * TILE
  const fw = w * TILE
  const fh = h * TILE
  ctx.fillStyle = '#a85c5c'
  ctx.fillRect(fx + 2, fy + 2, fw - 4, fh - 4)
  ctx.fillStyle = '#b96a6a'
  ctx.fillRect(fx + 6, fy + 6, fw - 12, fh - 12)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.strokeRect(fx + 9.5, fy + 9.5, fw - 19, fh - 19)
}

function drawFurniture(ctx: CanvasRenderingContext2D, item: FurnitureItem, _t: number) {
  const { x, y, w, h } = item.rect
  const fx = x * TILE
  const fy = y * TILE
  const fw = w * TILE
  const fh = h * TILE
  const r = item.rect

  switch (item.kind) {
    case 'bed': {
      ctx.fillStyle = '#7a5230'
      ctx.fillRect(fx, fy, fw, fh)
      ctx.fillStyle = '#e8e0d0'
      ctx.fillRect(fx + 3, fy + 3, fw - 6, 22) // pillow zone
      ctx.fillStyle = '#5b7fbf'
      ctx.fillRect(fx + 3, fy + 26, fw - 6, fh - 29) // blanket
      ctx.fillStyle = '#4d6ea3'
      for (let i = 0; i < 3; i++) ctx.fillRect(fx + 6, fy + 32 + i * 12, fw - 12, 3)
      ctx.fillStyle = '#fff'
      ctx.fillRect(fx + 6, fy + 6, fw - 12, 14) // pillow
      break
    }
    case 'wardrobe': {
      ctx.fillStyle = '#8a5a34'
      ctx.fillRect(fx + 2, fy + 2, fw - 4, fh - 2)
      ctx.fillStyle = '#9c6a40'
      ctx.fillRect(fx + 4, fy + 4, fw / 2 - 6, fh - 6)
      ctx.fillRect(fx + fw / 2 + 2, fy + 4, fw / 2 - 6, fh - 6)
      ctx.fillStyle = '#e8c87a'
      ctx.fillRect(fx + fw / 2 - 5, fy + fh / 2, 3, 5)
      ctx.fillRect(fx + fw / 2 + 2, fy + fh / 2, 3, 5)
      break
    }
    case 'fridge': {
      ctx.fillStyle = '#dde3e8'
      ctx.fillRect(fx + 2, fy + 2, fw - 4, fh - 4)
      ctx.fillStyle = '#c3ccd3'
      ctx.fillRect(fx + 2, fy + fh / 2 - 1, fw - 4, 2)
      ctx.fillStyle = '#8a97a3'
      ctx.fillRect(fx + fw - 9, fy + 8, 3, 8)
      ctx.fillRect(fx + fw - 9, fy + fh / 2 + 6, 3, 12)
      break
    }
    case 'counter': {
      ctx.fillStyle = '#a97c50'
      ctx.fillRect(fx, fy + 6, fw, fh - 6)
      ctx.fillStyle = '#c9a06c'
      ctx.fillRect(fx, fy + 4, fw, 8)
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      for (let i = 1; i < w; i++) ctx.fillRect(fx + i * TILE - 1, fy + 10, 2, fh - 12)
      break
    }
    case 'stove': {
      ctx.fillStyle = '#4a4a52'
      ctx.fillRect(fx + 2, fy + 4, fw - 4, fh - 6)
      ctx.fillStyle = '#2e2e34'
      ctx.beginPath()
      ctx.arc(fx + 10, fy + 14, 5, 0, Math.PI * 2)
      ctx.arc(fx + 22, fy + 14, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#66666e'
      ctx.fillRect(fx + 4, fy + 22, fw - 8, 3)
      break
    }
    case 'table': {
      const isDining = r.w === 2 && r.h === 2
      ctx.fillStyle = isDining ? '#b3564f' : '#8a5a34'
      ctx.fillRect(fx + 2, fy + 2, fw - 4, fh - 4)
      ctx.fillStyle = isDining ? '#c96a62' : '#9c6a40'
      ctx.fillRect(fx + 5, fy + 5, fw - 10, fh - 10)
      if (isDining) {
        ctx.fillStyle = '#e8e0d0'
        ctx.fillRect(fx + 8, fy + 8, 10, 10)
        ctx.fillStyle = '#e279a2'
        ctx.beginPath()
        ctx.arc(fx + fw - 14, fy + fh - 14, 5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = '#d8ecf5'
        ctx.fillRect(fx + 6, fy + 8, 8, 10) // teacup-ish
      }
      break
    }
    case 'sofa': {
      ctx.fillStyle = '#7d9b76'
      ctx.fillRect(fx + 2, fy + 8, fw - 4, fh - 10)
      ctx.fillStyle = '#8fae88'
      ctx.fillRect(fx + 2, fy + 4, fw - 4, 10)
      ctx.fillStyle = '#6b8a64'
      ctx.fillRect(fx + 2, fy + 4, 6, fh - 6)
      ctx.fillRect(fx + fw - 8, fy + 4, 6, fh - 6)
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(fx + fw / 2 - 1, fy + 8, 2, fh - 12)
      break
    }
    case 'tv': {
      ctx.fillStyle = '#2e2e34'
      ctx.fillRect(fx + 2, fy + 6, fw - 4, 22)
      ctx.fillStyle = '#7ec8e3'
      ctx.fillRect(fx + 5, fy + 9, fw - 10, 16)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(fx + 7, fy + 11, 8, 3)
      ctx.fillStyle = '#4a4a52'
      ctx.fillRect(fx + fw / 2 - 6, fy + 28, 12, 3)
      break
    }
    case 'bookshelf': {
      ctx.fillStyle = '#7a5230'
      ctx.fillRect(fx + 2, fy, fw - 4, fh)
      const rows = Math.floor(fh / 10)
      for (let i = 0; i < rows; i++) {
        const ry = fy + 3 + i * 10
        ctx.fillStyle = '#5f3f24'
        ctx.fillRect(fx + 4, ry + 6, fw - 8, 2)
        const palette = ['#c0574f', '#5b7fbf', '#7d9b76', '#d8a24a', '#8a6fa8']
        let bx = fx + 5
        let bi = i
        while (bx < fx + fw - 8) {
          const bw = 3 + ((bi * 7) % 3)
          ctx.fillStyle = palette[bi % palette.length]
          ctx.fillRect(bx, ry, bw, 6)
          bx += bw + 1
          bi++
        }
      }
      break
    }
    case 'desk': {
      ctx.fillStyle = '#9c6a40'
      ctx.fillRect(fx + 2, fy + 6, fw - 4, fh - 8)
      ctx.fillStyle = '#b5824f'
      ctx.fillRect(fx + 2, fy + 4, fw - 4, 6)
      ctx.fillStyle = '#e8e0d0'
      ctx.fillRect(fx + 8, fy + 6, 14, 8) // paper
      ctx.fillStyle = '#4a4a52'
      ctx.fillRect(fx + fw - 16, fy, 10, 10) // lamp base/screen
      ctx.fillStyle = '#ffe9a3'
      ctx.fillRect(fx + fw - 14, fy + 2, 6, 6)
      break
    }
    case 'plant': {
      ctx.fillStyle = '#b3564f'
      ctx.fillRect(fx + 8, fy + 18, 16, 12)
      ctx.fillStyle = '#9c463f'
      ctx.fillRect(fx + 6, fy + 18, 20, 4)
      ctx.fillStyle = '#4e7d43'
      ctx.beginPath()
      ctx.ellipse(fx + 16, fy + 12, 11, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5f9451'
      ctx.beginPath()
      ctx.ellipse(fx + 13, fy + 9, 6, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    default:
      break
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: 0 | 1 | 2 | 3, // 0 down 1 left 2 right 3 up
  look: CharacterLook,
  moving: boolean,
  phase: number,
  name?: string,
  nameColor = '#fff',
) {
  const bob = moving ? Math.sin(phase * 10) * 1.5 : Math.sin(phase * 2) * 0.6
  const legSwing = moving ? Math.sin(phase * 10) * 3 : 0

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(px, py + 13, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  const cy = py - 4 + bob
  // legs
  ctx.fillStyle = '#3d3d4d'
  ctx.fillRect(px - 6 + (dir !== 3 ? legSwing : 0), cy + 6, 5, 9)
  ctx.fillRect(px + 1 - (dir !== 3 ? legSwing : 0), cy + 6, 5, 9)
  // body
  ctx.fillStyle = look.shirt
  roundRect(ctx, px - 8, cy - 6, 16, 14, 4)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  roundRect(ctx, px - 8, cy - 6, 16, 5, 3)
  ctx.fill()
  // arms when moving
  if (moving) {
    ctx.fillStyle = shade(look.shirt, -20)
    ctx.fillRect(px - 10, cy - 3 + legSwing * 0.6, 3, 8)
    ctx.fillRect(px + 7, cy - 3 - legSwing * 0.6, 3, 8)
  }
  // head
  ctx.fillStyle = look.skin
  ctx.beginPath()
  ctx.arc(px, cy - 13, 8, 0, Math.PI * 2)
  ctx.fill()
  // hair
  ctx.fillStyle = look.hair
  if (look.hairStyle === 'long') {
    ctx.beginPath()
    ctx.arc(px, cy - 14, 8.5, Math.PI * 0.95, Math.PI * 2.05)
    ctx.fill()
    ctx.fillRect(px - 9, cy - 15, 4, 12)
    ctx.fillRect(px + 5, cy - 15, 4, 12)
  } else if (look.hairStyle === 'bun') {
    ctx.beginPath()
    ctx.arc(px, cy - 14, 8.5, Math.PI * 0.9, Math.PI * 2.1)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(px, cy - 23, 3.5, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(px, cy - 14, 8.5, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(px - 8.5, cy - 15, 17, 3)
  }
  // face
  if (dir !== 3) {
    ctx.fillStyle = '#2b2b33'
    const eyeY = cy - 13
    const off = dir === 1 ? -2 : dir === 2 ? 2 : 0
    ctx.fillRect(px - 4 + off, eyeY, 2.4, 3)
    ctx.fillRect(px + 2 + off, eyeY, 2.4, 3)
  }
  // name tag
  if (name) {
    ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    const w = ctx.measureText(name).width + 10
    roundRect(ctx, px - w / 2, py - 44, w, 15, 7)
    ctx.fill()
    ctx.fillStyle = nameColor
    ctx.fillText(name, px, py - 33)
  }
}

export function drawNightOverlay(ctx: CanvasRenderingContext2D, hour: number) {
  // darken at night: 19点~23点渐变，23点后最深
  let alpha = 0
  if (hour >= 19 && hour < 23) alpha = ((hour - 19) / 4) * 0.32
  else if (hour >= 23 || hour < 6) alpha = 0.32
  else if (hour >= 6 && hour < 8) alpha = 0.32 * (1 - (hour - 6) / 2)
  if (alpha <= 0) return
  ctx.fillStyle = `rgba(12, 18, 48, ${alpha})`
  ctx.fillRect(0, 0, MAP_W * TILE, MAP_H * TILE)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt))
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** NPC 头顶的对话气泡，(px, py) 为脚底坐标 */
export function drawBubble(ctx: CanvasRenderingContext2D, px: number, py: number, text: string) {  ctx.font = '11px "Microsoft YaHei", "PingFang SC", sans-serif'
  const maxW = 150
  // wrap
  const lines: string[] = []
  let cur = ''
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW || ch === '\n') {
      if (cur) lines.push(cur)
      cur = ch === '\n' ? '' : ch
    } else cur += ch
  }
  if (cur) lines.push(cur)
  if (!lines.length) lines.push(text)
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 16
  const h = lines.length * 15 + 10
  const x = Math.max(4, Math.min(px - w / 2, 960 - w - 4))
  const y = py - 56 - h

  ctx.fillStyle = 'rgba(255,253,247,0.96)'
  ctx.strokeStyle = '#8a5a34'
  ctx.lineWidth = 1.5
  roundRect(ctx, x, y, w, h, 8)
  ctx.fill()
  ctx.stroke()
  // tail
  ctx.beginPath()
  ctx.moveTo(px - 5, y + h - 1)
  ctx.lineTo(px + 5, y + h - 1)
  ctx.lineTo(px, y + h + 7)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,253,247,0.96)'
  ctx.fill()
  ctx.strokeStyle = '#8a5a34'
  ctx.beginPath()
  ctx.moveTo(px - 5, y + h)
  ctx.lineTo(px, y + h + 7)
  ctx.lineTo(px + 5, y + h)
  ctx.stroke()

  ctx.fillStyle = '#4a3524'
  ctx.textAlign = 'left'
  lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 16 + i * 15))
}

export interface CatLook {
  color?: string
  dark?: string
  cream?: string
  scale?: number
  name?: string
}

function petNameTag(ctx: CanvasRenderingContext2D, px: number, topY: number, name: string) {
  ctx.font = 'bold 10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  const w = ctx.measureText(name).width + 8
  roundRect(ctx, px - w / 2, topY, w, 13, 6)
  ctx.fill()
  ctx.fillStyle = '#ffe9c9'
  ctx.fillText(name, px, topY + 10)
}

/** 小猫：(px, py) 为脚底坐标，dir 同角色方向 */
export function drawCat(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: 0 | 1 | 2 | 3,
  moving: boolean,
  phase: number,
  sleeping: boolean,
  look: CatLook = {},
) {
  const orange = look.color ?? '#e8913a'
  const dark = look.dark ?? '#c97723'
  const cream = look.cream ?? '#fff2df'
  const sc = look.scale ?? 1
  ctx.save()
  ctx.translate(px, py)
  ctx.scale(sc, sc)
  ctx.translate(-px, -py)

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(px, py + 5, 11, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()

  if (sleeping) {
    // 蜷成一团
    ctx.fillStyle = orange
    ctx.beginPath()
    ctx.ellipse(px, py - 4, 11, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.ellipse(px - 3, py - 6, 5, 3, -0.4, 0, Math.PI * 2)
    ctx.fill()
    // 尾巴围住
    ctx.strokeStyle = dark
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px + 2, py - 2, 8, 0.3, Math.PI * 0.9)
    ctx.stroke()
    // Zzz
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    const bobZ = Math.sin(phase * 2) * 2
    ctx.fillText('z', px + 10, py - 18 + bobZ)
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText('Z', px + 16, py - 26 + bobZ)
    ctx.restore()
    if (look.name) petNameTag(ctx, px, py - 42 * sc, look.name)
    return
  }

  const bob = moving ? Math.sin(phase * 12) * 1.2 : 0
  const walk = moving ? Math.sin(phase * 12) * 2.5 : 0
  const dirX = dir === 1 ? -1 : dir === 2 ? 1 : 0
  const bodyX = px - dirX * 2

  // tail
  const tw = Math.sin(phase * 5) * 3
  ctx.strokeStyle = dark
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bodyX - dirX * 10, py - 6 + bob)
  ctx.quadraticCurveTo(bodyX - dirX * 16, py - 14 + bob, bodyX - dirX * 14 + tw, py - 18 + bob)
  ctx.stroke()

  // legs
  ctx.fillStyle = dark
  ctx.fillRect(bodyX - 8 + walk, py - 5, 3, 6)
  ctx.fillRect(bodyX + 5 - walk, py - 5, 3, 6)

  // body
  ctx.fillStyle = orange
  ctx.beginPath()
  ctx.ellipse(bodyX, py - 7 + bob, 11, 6.5, 0, 0, Math.PI * 2)
  ctx.fill()
  // stripes
  ctx.fillStyle = dark
  ctx.fillRect(bodyX - 6, py - 12 + bob, 2.5, 6)
  ctx.fillRect(bodyX - 1, py - 13 + bob, 2.5, 7)
  ctx.fillRect(bodyX + 4, py - 12 + bob, 2.5, 6)
  // belly
  ctx.fillStyle = cream
  ctx.beginPath()
  ctx.ellipse(bodyX + dirX * 2, py - 5 + bob, 5, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // head
  const hx = bodyX + dirX * 11
  const hy = py - 12 + bob
  ctx.fillStyle = orange
  ctx.beginPath()
  ctx.arc(hx, hy, 6, 0, Math.PI * 2)
  ctx.fill()
  // ears
  ctx.fillStyle = orange
  const earOff = dir === 3 ? 0 : dirX
  ctx.beginPath()
  ctx.moveTo(hx - 5, hy - 3)
  ctx.lineTo(hx - 6 - earOff, hy - 10)
  ctx.lineTo(hx - 1, hy - 6)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(hx + 5, hy - 3)
  ctx.lineTo(hx + 6 + earOff, hy - 10)
  ctx.lineTo(hx + 1, hy - 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e8a0a0'
  ctx.beginPath()
  ctx.moveTo(hx - 4.5, hy - 4.5)
  ctx.lineTo(hx - 5.5 - earOff, hy - 8.5)
  ctx.lineTo(hx - 2, hy - 5.5)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(hx + 4.5, hy - 4.5)
  ctx.lineTo(hx + 5.5 + earOff, hy - 8.5)
  ctx.lineTo(hx + 2, hy - 5.5)
  ctx.closePath()
  ctx.fill()

  // face (hidden when facing up)
  if (dir !== 3) {
    const eyeOff = dir === 1 ? -1.5 : dir === 2 ? 1.5 : 0
    ctx.fillStyle = '#2b2b33'
    ctx.fillRect(hx - 3.5 + eyeOff, hy - 1.5, 1.8, 2.4)
    ctx.fillRect(hx + 1.7 + eyeOff, hy - 1.5, 1.8, 2.4)
    ctx.fillStyle = '#d97b6c'
    ctx.fillRect(hx - 0.8 + eyeOff, hy + 1.5, 1.6, 1.2)
    // whiskers
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(hx - 2, hy + 1.5)
    ctx.lineTo(hx - 8, hy)
    ctx.moveTo(hx + 2, hy + 1.5)
    ctx.lineTo(hx + 8, hy)
    ctx.stroke()
  }
  ctx.restore()
  if (look.name) petNameTag(ctx, px, py - 34 * sc - 8, look.name)
}

/** 小狗：(px, py) 为脚底坐标，会摇尾巴 */
export function drawDog(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: 0 | 1 | 2 | 3,
  moving: boolean,
  phase: number,
  name?: string,
) {
  const body = '#b5804f'
  const dark = '#8a5c34'
  const cream = '#f5e6cf'

  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(px, py + 5, 12, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  const bob = moving ? Math.sin(phase * 11) * 1.2 : 0
  const walk = moving ? Math.sin(phase * 11) * 2.5 : 0
  const dirX = dir === 1 ? -1 : dir === 2 ? 1 : 0
  const bodyX = px - dirX * 2

  // tail（摇得欢）
  const wag = Math.sin(phase * 10) * 4
  ctx.strokeStyle = dark
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bodyX - dirX * 11, py - 7 + bob)
  ctx.quadraticCurveTo(
    bodyX - dirX * 18,
    py - 12 + bob,
    bodyX - dirX * 17 + wag,
    py - 17 + bob + Math.abs(wag) * 0.3,
  )
  ctx.stroke()

  // legs
  ctx.fillStyle = dark
  ctx.fillRect(bodyX - 8 + walk, py - 5, 3.5, 6)
  ctx.fillRect(bodyX + 5 - walk, py - 5, 3.5, 6)

  // body
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(bodyX, py - 7 + bob, 12, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = cream
  ctx.beginPath()
  ctx.ellipse(bodyX + dirX * 3, py - 5 + bob, 5.5, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // head
  const hx = bodyX + dirX * 12
  const hy = py - 13 + bob
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(hx, hy, 6.5, 0, Math.PI * 2)
  ctx.fill()
  // muzzle
  ctx.fillStyle = cream
  ctx.beginPath()
  ctx.ellipse(hx + dirX * 3.5, hy + 2, 3.5, 2.8, 0, 0, Math.PI * 2)
  ctx.fill()
  // floppy ears
  ctx.fillStyle = dark
  const earSwing = moving ? Math.sin(phase * 11) * 1.5 : 0
  ctx.beginPath()
  ctx.ellipse(hx - 3, hy - 5 + earSwing, 2.6, 4.5, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(hx + 3, hy - 5 - earSwing, 2.6, 4.5, 0.5, 0, Math.PI * 2)
  ctx.fill()

  if (dir !== 3) {
    const eyeOff = dir === 1 ? -1.5 : dir === 2 ? 1.5 : 0
    ctx.fillStyle = '#2b2b33'
    ctx.fillRect(hx - 3.5 + eyeOff, hy - 2, 1.8, 2.4)
    ctx.fillRect(hx + 1.7 + eyeOff, hy - 2, 1.8, 2.4)
    // nose
    ctx.fillStyle = '#3d2b20'
    ctx.fillRect(hx + dirX * 5.5 - 1 + eyeOff * 0.5, hy + 0.5, 2.4, 2)
    // tongue
    if (!moving) {
      ctx.fillStyle = '#e88a8a'
      ctx.fillRect(hx + dirX * 4, hy + 4, 2.5, 3.5)
    }
  }

  if (name) {
    ctx.font = 'bold 10px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    const w = ctx.measureText(name).width + 8
    roundRect(ctx, px - w / 2, py - 44, w, 13, 6)
    ctx.fill()
    ctx.fillStyle = '#ffe9c9'
    ctx.fillText(name, px, py - 34)
  }
}
