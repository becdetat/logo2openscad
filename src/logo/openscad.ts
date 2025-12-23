import type { Point, LogoPolygon } from './types'
import { formatNum } from './utils'

function pointsEqual(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y
}

export function generateOpenScad(polygons: LogoPolygon[]): string {
  if (polygons.length === 0) return '// No polygons'

  const blocks: string[] = []
  for (const poly of polygons) {
    const lines: string[] = []
    
    // Output comments that aren't associated with specific points
    for (const comment of poly.comments) {
      lines.push(comment.text)
    }
    
    // If this is a comment-only polygon, skip the geometry
    if (poly.commentOnly) {
      blocks.push(lines.join('\n'))
      continue
    }
    
    const pts = [...poly.points]
    if (pts.length === 0) pts.push({ x: 0, y: 0 })

    const first = pts[0]
    const last = pts[pts.length - 1]
    if (!pointsEqual(first, last)) pts.push({ ...first })
    
    lines.push('polygon(points=[')
    for (let i = 0; i < pts.length; i++) {
      // Insert comments before this point
      const commentsForThisPoint = poly.commentsByPointIndex.get(i)
      if (commentsForThisPoint) {
        for (const comment of commentsForThisPoint) {
          lines.push(comment.text)
        }
      }
      
      const p = pts[i]
      const comma = i === pts.length - 1 ? '' : ','
      lines.push(`  [${formatNum(p.x)}, ${formatNum(p.y)}]${comma}`)
    }
    lines.push(']);')

    blocks.push(lines.join('\n'))
  }

  return blocks.join('\n\n')
}
