import type { LogoSegment } from './types.js'

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
) {
  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  if (segments.length === 0) return

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
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const centerX = width / 2
  const centerY = height / 2

  const toScreen = (p: { x: number; y: number }) => {
    return {
      x: centerX + (p.x - midX) * scale,
      y: centerY - (p.y - midY) * scale,
    }
  }

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

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    const isPartial = i === fullCount && frac > 0
    const isVisible = i < fullCount || isPartial
    if (!isVisible) break

    // For arc segments, don't show partial - show all or none
    const isArcSegment = s.arcGroup !== undefined
    let shouldDraw = true
    let drawFraction = 1

    if (isArcSegment && isPartial) {
      // If this arc segment is the partial one, show it fully (not partially)
      // The animation logic ensures we skip to show the whole arc at once
      shouldDraw = true
      drawFraction = 1
    } else if (isPartial) {
      drawFraction = frac
    }

    if (!shouldDraw) continue

    // Skip pen-up segments if hidePenUp is enabled
    if (hidePenUp && !s.penDown) continue

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
}