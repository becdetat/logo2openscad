import type {
  ExecuteResult,
  Point,
  LogoCommand,
  LogoComment,
  LogoPolygon,
  LogoSegment,
  Marker,
} from './types'
import { evaluateExpression, type VariableContext } from './expression'
import { parseLogo } from './parser'
import { formatNum } from './utils'

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function executeLogo(
  commands: LogoCommand[],
  allComments: LogoComment[],
): ExecuteResult {
  const segments: LogoSegment[] = []
  const polygons: LogoPolygon[] = []
  const markers: Marker[] = []
  const variables: VariableContext = new Map()

  let x = 0
  let y = 0
  let headingDeg = 0 // 0 = up
  let penDown = true
  let arcGroupId = 0
  let currentFn = 40 // Default FN value (40/4 = 10 segments per 90°)

  let currentPolygon: Point[] | null = [{ x, y }]
  let currentPolygonComments: LogoComment[] = []
  let currentPolygonCommentsByPointIndex: Map<number, LogoComment[]> = new Map()
  let polygonStartLine = 1
  let usedCommentIndices: Set<number> = new Set()

  const finalizePolygon = (commentOnly = false) => {
    if (!currentPolygon) return
    if (currentPolygon.length === 0) currentPolygon.push({ x, y })
    
    polygons.push({ 
      points: currentPolygon, 
      comments: currentPolygonComments,
      commentsByPointIndex: currentPolygonCommentsByPointIndex,
      commentOnly
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
    const collected: LogoComment[] = []
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
    const commentsForThisPoint: LogoComment[] = []
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

  const executeCommands = (cmdList: LogoCommand[]) => {
    for (const cmd of cmdList) {
      executeCommand(cmd)
    }
  }

  const executeCommand = (cmd: LogoCommand) => {
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
        if (cmd.varName) {
          if (cmd.instructionListValue !== undefined) {
            // Store instruction list
            variables.set(cmd.varName, { type: 'instructionList', value: cmd.instructionListValue })
          } else if (cmd.value) {
            // Store numeric value
            const value = evaluateExpression(cmd.value, variables)
            variables.set(cmd.varName, value)
          }
        }
        break
      }
      case 'LT':
        headingDeg -= cmd.value ? evaluateExpression(cmd.value, variables) : 0
        break
      case 'RT':
        headingDeg += cmd.value ? evaluateExpression(cmd.value, variables) : 0
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

        const segmentCount = Math.max(1, Math.round((Math.abs(angleDeg) / 360) * currentFn))

        const startHeadingRad = degToRad(headingDeg)
        const angleStep = degToRad(angleDeg) / segmentCount
        const currentArcGroup = arcGroupId++
        
        // Track if this is a 360-degree arc for circle generation
        const is360Arc = Math.abs(angleDeg) === 360

        // If pen is down, finalize any existing polygon before starting the arc
        // Only finalize if the polygon has more than just the initial origin point
        if (penDown && currentPolygon && currentPolygon.length > 1) {
          collectCommentsSince(polygonStartLine, cmdLine - 1)
          polygons.push({
            points: currentPolygon,
            comments: currentPolygonComments,
            commentsByPointIndex: currentPolygonCommentsByPointIndex
          })
          currentPolygon = null
          currentPolygonComments = []
          currentPolygonCommentsByPointIndex = new Map()
          polygonStartLine = cmdLine
        }

        // Start a fresh polygon for the arc without including the center point
        if (penDown) {
          currentPolygon = []
        }

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
            currentPolygon!.push({ x: px, y: py })
          }
        }
        
        // Finalize the polygon after each arc (both 360° and non-360°)
        // Note: We still store the arc points in the polygon for consistency with the preview
        // system and debugging, even though they won't be used for OpenSCAD output
        if (penDown && currentPolygon) {
          collectCommentsSince(polygonStartLine, cmdLine)
          
          // If this is a 360-degree arc, add circle geometry
          const circleGeometry = is360Arc ? {
            center: { x, y },
            radius: radius,
            fn: currentFn
          } : undefined
          
          polygons.push({
            points: currentPolygon,
            comments: currentPolygonComments,
            commentsByPointIndex: currentPolygonCommentsByPointIndex,
            circleGeometry
          })
          
          // Reset for next polygon
          currentPolygon = null
          currentPolygonComments = []
          currentPolygonCommentsByPointIndex = new Map()
          polygonStartLine = cmdLine + 1
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
      case 'EXTSETFN': {
        if (cmd.value) {
          const fnValue = evaluateExpression(cmd.value, variables)
          const fnInt = Math.floor(fnValue)
          if (fnInt < 1) {
            throw new Error(`EXTSETFN value must be at least 1, got ${fnValue}`)
          }
          currentFn = fnInt
        }
        break
      }
      case 'EXTCOMMENTPOS': {
        // Generate a comment with the current position
        const label = cmd.comment || 'Position'
        const commentText = `// ${label}: x=${formatNum(x)}, y=${formatNum(y)}`
        const positionComment: LogoComment = { text: commentText, line: cmdLine }
        
        if (penDown) {
          ensurePolygonStarted()
          // Determine where to place the comment in the output:
          // - If at initial position (length=1, only origin point), place at index 0 (before origin)
          // - Otherwise, place at currentPolygon.length (before the next point to be added)
          // This ensures comments appear right at the current position in the output
          const targetIndex = currentPolygon!.length === 1 ? 0 : currentPolygon!.length
          const existing = currentPolygonCommentsByPointIndex.get(targetIndex) || []
          currentPolygonCommentsByPointIndex.set(targetIndex, [...existing, positionComment])
        } else {
          // When pen is up, create a comment-only polygon (no geometry will be output)
          ensurePolygonStarted()
          currentPolygonComments.push(positionComment)
          finalizePolygon(true)  // Mark as comment-only
        }
        break
      }
      case 'EXTMARKER': {
        // Add a visual marker in the preview (not in OpenSCAD output)
        let markerX = x
        let markerY = y
        
        // If X, Y coordinates provided, use those instead
        if (cmd.value && cmd.value2) {
          markerX = evaluateExpression(cmd.value, variables)
          markerY = evaluateExpression(cmd.value2, variables)
        }
        
        markers.push({
          x: markerX,
          y: markerY,
          comment: cmd.comment,
        })
        
        // Also generate a comment like EXTCOMMENTPOS does
        const label = cmd.comment || 'Marker'
        const commentText = `// ${label}: x=${formatNum(markerX)}, y=${formatNum(markerY)}`
        const positionComment: LogoComment = { text: commentText, line: cmdLine }
        
        if (penDown) {
          ensurePolygonStarted()
          const targetIndex = currentPolygon!.length === 1 ? 0 : currentPolygon!.length
          const existing = currentPolygonCommentsByPointIndex.get(targetIndex) || []
          currentPolygonCommentsByPointIndex.set(targetIndex, [...existing, positionComment])
        } else {
          ensurePolygonStarted()
          currentPolygonComments.push(positionComment)
          finalizePolygon(true)
        }
        break
      }
      case 'PRINT': {
        // Generate a single-line comment with the evaluated arguments
        const printArgs = cmd.printArgs || []
        const parts: string[] = []
        
        for (const arg of printArgs) {
          if (arg.type === 'string') {
            parts.push(arg.value)
          } else {
            const value = evaluateExpression(arg.expr, variables)
            // Format number with up to 6 decimal places, trimming trailing zeros
            const formatted = formatNum(value)
            parts.push(formatted)
          }
        }
        
        const printText = parts.join(' ')
        const commentText = `// ${printText}`
        const printComment: LogoComment = { text: commentText, line: cmdLine }
        
        if (penDown) {
          ensurePolygonStarted()
          // Place the comment at the current position
          const targetIndex = currentPolygon!.length === 1 ? 0 : currentPolygon!.length
          const existing = currentPolygonCommentsByPointIndex.get(targetIndex) || []
          currentPolygonCommentsByPointIndex.set(targetIndex, [...existing, printComment])
        } else {
          // When pen is up, add to comment-only polygon
          ensurePolygonStarted()
          currentPolygonComments.push(printComment)
          finalizePolygon(true)  // Mark as comment-only
        }
        break
      }
      case 'REPEAT': {
        if (cmd.value && cmd.instructionList !== undefined) {
          const count = Math.floor(evaluateExpression(cmd.value, variables))
          if (count > 0) {
            let instructionListText = cmd.instructionList
            
            // Check if it's a variable reference (starts with :)
            if (instructionListText.startsWith(':')) {
              const varName = instructionListText.slice(1)
              const varValue = variables.get(varName)
              
              if (varValue === undefined) {
                throw new Error(`Undefined variable: ${varName}`)
              }
              if (typeof varValue !== 'object' || varValue.type !== 'instructionList') {
                throw new Error(`Variable :${varName} is not an instruction list`)
              }
              instructionListText = varValue.value
            }
            
            const repeatResult = parseLogo(instructionListText)
            for (let i = 0; i < count; i++) {
              executeCommands(repeatResult.commands)
            }
          }
        }
        break
      }
      case 'CALL': {
        // Execute instruction list stored in variable
        if (cmd.varName) {
          const varValue = variables.get(cmd.varName)
          
          if (varValue === undefined) {
            throw new Error(`Undefined variable: ${cmd.varName}`)
          }
          if (typeof varValue !== 'object' || varValue.type !== 'instructionList') {
            throw new Error(`Variable :${cmd.varName} is not an instruction list`)
          }
          
          const callResult = parseLogo(varValue.value)
          executeCommands(callResult.commands)
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
  } else if (currentPolygon) {
    // Also finalize if there's a polygon but pen is up (e.g., comment-only polygon)
    finalizePolygon()
  }

  return { segments, polygons, markers }
}
