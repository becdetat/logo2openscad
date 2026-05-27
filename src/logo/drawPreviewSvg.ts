import type { LogoSegment, Marker } from './types.js'
import { createPreviewLayout, getRenderablePreviewSegments } from './drawPreview.js'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function drawPreviewSvg(
  segments: LogoSegment[],
  visibleSegments: number,
  colors: { penDown: string; penUp: string; axis: string },
  hidePenUp: boolean,
  penWidth: number,
  markers: Marker[],
  width = 800,
  height = 600,
): string {
  const empty = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"></svg>`
  if (segments.length === 0) return empty

  const layout = createPreviewLayout({ width, height }, segments)
  if (!layout) return empty

  const { toScreen } = layout
  const renderableSegments = getRenderablePreviewSegments(segments, visibleSegments, hidePenUp)
  const lines: string[] = []

  // Axes
  const o = toScreen({ x: 0, y: 0 })
  lines.push(`<line x1="0" y1="${o.y.toFixed(2)}" x2="${width}" y2="${o.y.toFixed(2)}" stroke="${colors.axis}" stroke-width="1" stroke-dasharray="4,6"/>`)
  lines.push(`<line x1="${o.x.toFixed(2)}" y1="0" x2="${o.x.toFixed(2)}" y2="${height}" stroke="${colors.axis}" stroke-width="1" stroke-dasharray="4,6"/>`)

  // Segments
  for (const { segment: s, drawFraction } of renderableSegments) {
    const a = toScreen(s.from)
    const b = toScreen(s.to)
    const ex = a.x + (b.x - a.x) * drawFraction
    const ey = a.y + (b.y - a.y) * drawFraction
    if (s.penDown) {
      lines.push(`<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${colors.penDown}" stroke-width="${penWidth}" stroke-linecap="round"/>`)
    } else {
      lines.push(`<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${colors.penUp}" stroke-width="2" stroke-dasharray="8,6"/>`)
    }
  }

  // Turtle head
  const fullCount = Math.floor(visibleSegments)
  const frac = visibleSegments - fullCount
  const lastIndex = Math.min(fullCount, segments.length - 1)
  if (lastIndex >= 0) {
    const last = segments[lastIndex]
    const t = lastIndex === fullCount && frac > 0 ? frac : 1
    const p = {
      x: last.from.x + (last.to.x - last.from.x) * t,
      y: last.from.y + (last.to.y - last.from.y) * t,
    }
    const sp = toScreen(p)
    lines.push(`<circle cx="${sp.x.toFixed(2)}" cy="${sp.y.toFixed(2)}" r="4" fill="${colors.penDown}"/>`)
  }

  // Markers
  for (const marker of markers) {
    const sp = toScreen({ x: marker.x, y: marker.y })
    const size = 8
    lines.push(`<line x1="${(sp.x - size).toFixed(2)}" y1="${sp.y.toFixed(2)}" x2="${(sp.x + size).toFixed(2)}" y2="${sp.y.toFixed(2)}" stroke="red" stroke-width="2"/>`)
    lines.push(`<line x1="${sp.x.toFixed(2)}" y1="${(sp.y - size).toFixed(2)}" x2="${sp.x.toFixed(2)}" y2="${(sp.y + size).toFixed(2)}" stroke="red" stroke-width="2"/>`)
    if (marker.comment) {
      lines.push(`<text x="${(sp.x + size + 2).toFixed(2)}" y="${(sp.y + 4).toFixed(2)}" font-size="12" fill="red">${escapeXml(marker.comment)}</text>`)
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${lines.join('\n')}\n</svg>`
}
