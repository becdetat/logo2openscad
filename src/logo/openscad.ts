import type { Point, LogoPolygon } from './types'
import { formatNum } from './utils'

function pointsEqual(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y
}

function buildBlock(headerLines: string[], geometryLines: string[], generateHull: boolean, indent: string): string {
  if (generateHull) {
    const indented = geometryLines.map(line => indent + line)
    const hullBlock = `hull() {\n${indented.join('\n')}\n}`
    if (headerLines.length === 0) return hullBlock
    return `${headerLines.join('\n')}\n${hullBlock}`
  }
  return [...headerLines, ...geometryLines].join('\n')
}

export function generateOpenScad(
  polygons: LogoPolygon[],
  indentSpaces: number = 2,
  optimizeCircles: boolean = true,
  verbose: boolean = false,
  sourceLines: string[] = [],
  generateHull: boolean = true,
): string {
  if (polygons.length === 0) return '// No polygons'

  const indent = ' '.repeat(indentSpaces)

  const blocks: string[] = []
  for (const poly of polygons) {
    const headerLines: string[] = []
    const geometryLines: string[] = []

    for (const comment of poly.comments) {
      headerLines.push(comment.text)
    }

    if (poly.commentOnly) {
      if (headerLines.length > 0) blocks.push(headerLines.join('\n'))
      continue
    }

    if (poly.circleGeometry && optimizeCircles) {
      const { center, radius, fn } = poly.circleGeometry

      for (const [, comments] of Array.from(poly.commentsByPointIndex.entries()).sort(([a], [b]) => a - b)) {
        for (const comment of comments) {
          geometryLines.push(comment.text)
        }
      }

      geometryLines.push(`translate([${formatNum(center.x)}, ${formatNum(center.y)}])`)
      geometryLines.push(`circle(r=${formatNum(radius)}, $fn=${fn});`)
      blocks.push(buildBlock(headerLines, geometryLines, generateHull, indent))
      continue
    }

    const pts = [...poly.points]
    if (pts.length === 0) pts.push({ x: 0, y: 0 })

    const first = pts[0]
    const last = pts[pts.length - 1]
    if (!pointsEqual(first, last)) pts.push({ ...first })

    geometryLines.push('polygon(points=[')
    for (let i = 0; i < pts.length; i++) {
      if (verbose && poly.verboseSourceLines) {
        const verboseLines = poly.verboseSourceLines.get(i)
        if (verboseLines) {
          for (const lineNum of verboseLines) {
            const lineText = sourceLines[lineNum - 1]?.trimEnd()
            if (lineText !== undefined) {
              geometryLines.push(`// ${lineText}`)
            }
          }
        }
      }

      const commentsForThisPoint = poly.commentsByPointIndex.get(i)
      if (commentsForThisPoint) {
        for (const comment of commentsForThisPoint) {
          geometryLines.push(comment.text)
        }
      }

      const p = pts[i]
      const comma = i === pts.length - 1 ? '' : ','
      geometryLines.push(`${indent}[${formatNum(p.x)}, ${formatNum(p.y)}]${comma}`)
    }
    geometryLines.push(']);')

    blocks.push(buildBlock(headerLines, geometryLines, generateHull, indent))
  }

  return blocks.join('\n\n')
}
