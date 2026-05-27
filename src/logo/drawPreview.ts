import type { LogoSegment, Marker } from './types.js'

export type PreviewLayout = {
  toScreen: (p: { x: number; y: number }) => { x: number; y: number }
  fromScreen: (p: { x: number; y: number }) => { x: number; y: number }
}

export type RenderablePreviewSegment = {
  segment: LogoSegment
  drawFraction: number
}

export function createPreviewLayout(
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>,
  segments: LogoSegment[],
): PreviewLayout | null {
  if (segments.length === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const s of segments) {
    minX = Math.min(minX, s.from.x, s.to.x)
    maxX = Math.max(maxX, s.from.x, s.to.x)
    minY = Math.min(minY, s.from.y, s.to.y)
    maxY = Math.max(maxY, s.from.y, s.to.y)
  }

  const pad = 24
  const spanX = Math.max(1e-9, maxX - minX)
  const spanY = Math.max(1e-9, maxY - minY)
  const scale = Math.min((canvas.width - pad * 2) / spanX, (canvas.height - pad * 2) / spanY)

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  return {
    toScreen: (p: { x: number; y: number }) => ({
      x: centerX + (p.x - midX) * scale,
      y: centerY - (p.y - midY) * scale,
    }),
    fromScreen: (p: { x: number; y: number }) => ({
      x: (p.x - centerX) / scale + midX,
      y: midY - (p.y - centerY) / scale,
    }),
  }
}

export function getRenderablePreviewSegments(
  segments: LogoSegment[],
  visibleSegments: number,
  hidePenUp: boolean,
): RenderablePreviewSegment[] {
  const fullCount = Math.floor(visibleSegments)
  const frac = visibleSegments - fullCount
  const renderable: RenderablePreviewSegment[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isPartial = i === fullCount && frac > 0
    const isVisible = i < fullCount || isPartial
    if (!isVisible) break
    if (hidePenUp && !segment.penDown) continue

    const drawFraction = segment.arcGroup !== undefined && isPartial ? 1 : isPartial ? frac : 1
    renderable.push({ segment, drawFraction })
  }

  return renderable
}

export function drawPreview(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  segments: LogoSegment[],
  visibleSegments: number,
  colors: {
    penDown: string
    penUp: string
    axis: string
  },
  hidePenUp: boolean = false,
  penWidth: number = 2,
  dpr: number = 1,
  markers: Marker[] = [],
) {
  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  if (segments.length === 0) return
  const layout = createPreviewLayout(canvas, segments)
  if (!layout) return
  const { toScreen } = layout
  const renderableSegments = getRenderablePreviewSegments(segments, visibleSegments, hidePenUp)

  // Axes
  ctx.save()
  ctx.strokeStyle = colors.axis
  ctx.lineWidth = 1 * dpr
  ctx.setLineDash([4, 6])
  const o = toScreen({ x: 0, y: 0 })
  ctx.beginPath()
  ctx.moveTo(0, o.y)
  ctx.lineTo(width, o.y)
  ctx.moveTo(o.x, 0)
  ctx.lineTo(o.x, height)
  ctx.stroke()
  ctx.restore()

  const fullCount = Math.floor(visibleSegments)
  const frac = visibleSegments - fullCount

  const drawSeg = (s: LogoSegment, t: number) => {
    const a = toScreen(s.from)
    const b = toScreen(s.to)
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  for (const { segment: s, drawFraction } of renderableSegments) {

    ctx.save()
    if (s.penDown) {
      ctx.lineWidth = penWidth
      ctx.strokeStyle = colors.penDown
      ctx.setLineDash([])
    } else {
      ctx.lineWidth = 2 * dpr
      ctx.strokeStyle = colors.penUp
      ctx.setLineDash([8, 6])
    }

    drawSeg(s, drawFraction)
    ctx.restore()
  }

  // Turtle head
  const lastIndex = Math.min(fullCount, segments.length - 1)
  if (lastIndex >= 0) {
    const last = segments[lastIndex]
    const t = lastIndex === fullCount && frac > 0 ? frac : 1
    const p = {
      x: last.from.x + (last.to.x - last.from.x) * t,
      y: last.from.y + (last.to.y - last.from.y) * t,
    }
    const sp = toScreen(p)
    ctx.save()
    ctx.fillStyle = colors.penDown
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 4 * dpr, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Draw markers as red crosses
  for (const marker of markers) {
    const sp = toScreen({ x: marker.x, y: marker.y })
    const size = 8 * dpr
    
    ctx.save()
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 2 * dpr
    ctx.setLineDash([])
    
    // Draw cross
    ctx.beginPath()
    ctx.moveTo(sp.x - size, sp.y)
    ctx.lineTo(sp.x + size, sp.y)
    ctx.moveTo(sp.x, sp.y - size)
    ctx.lineTo(sp.x, sp.y + size)
    ctx.stroke()
    
    ctx.restore()
  }
}