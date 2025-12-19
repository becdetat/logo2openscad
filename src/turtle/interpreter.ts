import type {
  ExecuteOptions,
  ExecuteResult,
  Point,
  TurtleCommand,
  TurtleComment,
  TurtlePolygon,
  TurtleSegment,
} from './types'
import { evaluateExpression, type VariableContext } from './expression'
import { parseTurtle } from './parser'

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
  const variables: VariableContext = new Map()

  let x = 0
  let y = 0
  let headingDeg = 0 // 0 = up
  let penDown = true
  let arcGroupId = 0

  let currentPolygon: Point[] | null = [{ x, y }]
  let currentPolygonComments: TurtleComment[] = []
  let currentPolygonCommentsByPointIndex: Map<number, TurtleComment[]> = new Map()
  let polygonStartLine = 1
  let usedCommentIndices: Set<number> = new Set()

  const finalizePolygon = () => {
    if (!currentPolygon) return
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
    polygons.push({ 
      points: currentPolygon, 
      comments: currentPolygonComments,
      commentsByPointIndex: currentPolygonCommentsByPointIndex
    })
    currentPolygon = null
    currentPolygonComments = []
    currentPolygonCommentsByPointIndex = new Map()
  }

  const ensurePolygonStarted = () => {
    if (!currentPolygon) currentPolygon = [{ x, y }]
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
  }

  const collectCommentsSince = (fromLine: number, toLine: number) => {
    const collected: TurtleComment[] = []
    for (let i = 0; i < allComments.length; i++) {
      if (usedCommentIndices.has(i)) continue
      const c = allComments[i]
      const commentEndLine = c.endLine ?? c.line
      // Include comment if it overlaps with the range [fromLine, toLine]
      if (commentEndLine >= fromLine && c.line <= toLine) {
        collected.push(c)
        usedCommentIndices.add(i)
      }
    }
    // Sort by line number to maintain source order
    collected.sort((a, b) => a.line - b.line)
    currentPolygonComments.push(...collected)
  }

  const collectCommentsBeforeNextPoint = (fromLine: number, toLine: number) => {
    const commentsForThisPoint: TurtleComment[] = []
    for (let i = 0; i < allComments.length; i++) {
      if (usedCommentIndices.has(i)) continue
      const c = allComments[i]
      const commentEndLine = c.endLine ?? c.line
      // Include comment if it overlaps with the range [fromLine, toLine]
      if (commentEndLine >= fromLine && c.line <= toLine) {
        commentsForThisPoint.push(c)
        usedCommentIndices.add(i)
      }
    }
    // Sort by line number to maintain source order
    commentsForThisPoint.sort((a, b) => a.line - b.line)
    if (commentsForThisPoint.length > 0 && currentPolygon) {
      const nextPointIndex = currentPolygon.length
      const existing = currentPolygonCommentsByPointIndex.get(nextPointIndex) || []
      currentPolygonCommentsByPointIndex.set(nextPointIndex, [...existing, ...commentsForThisPoint])
    }
  }

  const executeCommands = (cmdList: TurtleCommand[]) => {
    for (const cmd of cmdList) {
      executeCommand(cmd)
    }
  }

  const executeCommand = (cmd: TurtleCommand) => {
    const cmdLine = cmd.sourceLine ?? 0

    // Collect comments up to this command line
    if (penDown && cmdLine > polygonStartLine) {
      // Check if this command will add a point
      const willAddPoint = ['FD', 'BK', 'SETX', 'SETY', 'SETXY', 'ARC', 'HOME'].includes(cmd.kind)
      if (willAddPoint) {
        collectCommentsBeforeNextPoint(polygonStartLine, cmdLine - 1)
      } else {
        collectCommentsSince(polygonStartLine, cmdLine - 1)
      }
      polygonStartLine = cmdLine
    }

    switch (cmd.kind) {
      case 'MAKE': {
        if (cmd.varName && cmd.value) {
          const value = evaluateExpression(cmd.value, variables)
          variables.set(cmd.varName, value)
        }
        break
      }
      case 'LT':
        headingDeg += cmd.value ? evaluateExpression(cmd.value, variables) : 0
        break
      case 'RT':
        headingDeg -= cmd.value ? evaluateExpression(cmd.value, variables) : 0
        break
      case 'SETH':
        headingDeg = cmd.value ? evaluateExpression(cmd.value, variables) : 0
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
          currentPolygonCommentsByPointIndex = new Map()
          usedCommentIndices = new Set()
        }
        break
      case 'SETX': {
        const nx = cmd.value ? evaluateExpression(cmd.value, variables) : 0
        segments.push({ from: { x, y }, to: { x: nx, y }, penDown })
        x = nx
        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }
        break
      }
      case 'SETY': {
        const ny = cmd.value ? evaluateExpression(cmd.value, variables) : 0
        segments.push({ from: { x, y }, to: { x, y: ny }, penDown })
        y = ny
        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }
        break
      }
      case 'SETXY': {
        const nx = cmd.value ? evaluateExpression(cmd.value, variables) : 0
        const ny = cmd.value2 ? evaluateExpression(cmd.value2, variables) : 0
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
        const value = cmd.value ? evaluateExpression(cmd.value, variables) : 0
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
        const angleDeg = cmd.value ? evaluateExpression(cmd.value, variables) : 0
        const radius = cmd.value2 ? evaluateExpression(cmd.value2, variables) : 0

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
      case "HOME": {
        segments.push({ from: { x, y }, to: { x: 0, y: 0 }, penDown })
        x = 0
        y = 0
        headingDeg = 0

        if (penDown) {
          ensurePolygonStarted()
          currentPolygon!.push({ x, y })
        }
        break
      }
      case 'REPEAT': {
        if (cmd.value && cmd.instructionList !== undefined) {
          const count = Math.floor(evaluateExpression(cmd.value, variables))
          if (count > 0) {
            const repeatResult = parseTurtle(cmd.instructionList)
            for (let i = 0; i < count; i++) {
              executeCommands(repeatResult.commands)
            }
          }
        }
        break
      }
    }
  }

  executeCommands(commands)

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
