import type {
  ExecuteOptions,
  ExecuteResult,
  Point,
  TurtleCommand,
  TurtleComment,
  TurtlePolygon,
  TurtleSegment,
} from './types'

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function executeTurtle(
  commands: TurtleCommand[],
  options: ExecuteOptions,
  allComments: TurtleComment[],
): ExecuteResult {
  const segments: TurtleSegment[] = []
  const polygons: TurtlePolygon[] = []

  let x = 0
  let y = 0
  let headingDeg = 0 // 0 = up
  let penDown = true
  let arcGroupId = 0

  let currentPolygon: Point[] | null = [{ x, y }]
  let currentPolygonComments: TurtleComment[] = []
  let polygonStartLine = 1

  const finalizePolygon = () => {
    if (!currentPolygon) return
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
    polygons.push({ points: currentPolygon, comments: currentPolygonComments })
    currentPolygon = null
    currentPolygonComments = []
  }

  const ensurePolygonStarted = () => {
    if (!currentPolygon) currentPolygon = [{ x, y }]
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
  }

  const collectCommentsSince = (fromLine: number, toLine: number) => {
    const commentsInRange = allComments.filter((c) => c.line >= fromLine && c.line <= toLine)
    currentPolygonComments.push(...commentsInRange)
  }

  for (const cmd of commands) {
    const cmdLine = cmd.sourceLine ?? 0

    // Collect comments up to this command line
    if (penDown && cmdLine > polygonStartLine) {
      collectCommentsSince(polygonStartLine, cmdLine)
      polygonStartLine = cmdLine + 1
    }

    switch (cmd.kind) {
      case 'LT':
        headingDeg += cmd.value ?? 0
        break
      case 'RT':
        headingDeg -= cmd.value ?? 0
        break
      case 'PU':
        if (penDown) {
          collectCommentsSince(polygonStartLine, cmdLine)
          finalizePolygon()
          polygonStartLine = cmdLine + 1
        }
        penDown = false
        break
      case 'PD':
        if (!penDown) {
          // Collect any comments that appeared before this polygon starts
          collectCommentsSince(polygonStartLine, cmdLine)
          polygonStartLine = cmdLine + 1
          penDown = true
          currentPolygon = [{ x, y }]
        }
        break
      case 'SETX': {
        const nx = cmd.value ?? 0
        segments.push({ from: { x, y }, to: { x: nx, y }, penDown })
        x = nx
        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }
        break
      }
      case 'SETY': {
        const ny = cmd.value ?? 0
        segments.push({ from: { x, y }, to: { x, y: ny }, penDown })
        y = ny
        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }
        break
      }
      case 'SETXY': {
        const nx = cmd.value ?? 0
        const ny = cmd.value2 ?? 0
        segments.push({ from: { x, y }, to: { x: nx, y: ny }, penDown })
        x = nx
        y = ny
        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }
        break
      }
      case 'FD':
      case 'BK': {
        const value = cmd.value ?? 0
        const dist = cmd.kind === 'BK' ? -value : value
        const rad = degToRad(headingDeg)
        const nx = x + Math.sin(rad) * dist
        const ny = y + Math.cos(rad) * dist

        segments.push({ from: { x, y }, to: { x: nx, y: ny }, penDown })

        x = nx
        y = ny

        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }

        break
      }
      case 'ARC': {
        const angleDeg = cmd.value ?? 0
        const radius = cmd.value2 ?? 0

        if (radius === 0 || angleDeg === 0) break

        const segmentCount = Math.max(1, Math.ceil((Math.abs(angleDeg) / 90) * options.arcPointsPer90Deg))

        const startHeadingRad = degToRad(headingDeg)
        const angleStep = degToRad(angleDeg) / segmentCount
        const currentArcGroup = arcGroupId++

        for (let i = 0; i <= segmentCount; i++) {
          const currentAngle = startHeadingRad + angleStep * i
          const px = x + radius * Math.sin(currentAngle)
          const py = y + radius * Math.cos(currentAngle)

          if (i > 0) {
            const prevAngle = startHeadingRad + angleStep * (i - 1)
            const prevPx = x + radius * Math.sin(prevAngle)
            const prevPy = y + radius * Math.cos(prevAngle)
            segments.push({ from: { x: prevPx, y: prevPy }, to: { x: px, y: py }, penDown, arcGroup: currentArcGroup })
          }

          if (penDown && i > 0) {
            ensurePolygonStarted()
            currentPolygon!.push({ x: px, y: py })
          }
        }

        break
      }
    }
  }

  if (penDown) {
    // Collect any remaining comments
    const lastLine = commands[commands.length - 1]?.sourceLine ?? 0
    const maxLine = Math.max(...allComments.map((c) => c.line), lastLine)
    if (maxLine >= polygonStartLine) {
      collectCommentsSince(polygonStartLine, maxLine + 1)
    }
    finalizePolygon()
  }

  return { segments, polygons }
}
