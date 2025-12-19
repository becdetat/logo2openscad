import type {
  ParseResult,
  SourceRange,
  TurtleCommand,
  TurtleCommandKind,
  TurtleComment,
  TurtleDiagnostic,
} from './types'
import { parseExpression } from './expression'

const aliasToKind: Record<string, TurtleCommandKind> = {
  FD: 'FD',
  FORWARD: 'FD',
  BK: 'BK',
  BACK: 'BK',
  LT: 'LT',
  LEFT: 'LT',
  RT: 'RT',
  RIGHT: 'RT',
  PU: 'PU',
  PENUP: 'PU',
  PD: 'PD',
  PENDOWN: 'PD',
  ARC: 'ARC',
  SETX: 'SETX',
  SETY: 'SETY',
  SETXY: 'SETXY',
  SETH: 'SETH',
  SETHEADING: 'SETH',
  HOME: "HOME",
  MAKE: 'MAKE',
  REPEAT: 'REPEAT',
}

function rangeForSegment(lineNumber: number, startCol: number, endCol: number): SourceRange {
  return {
    startLine: lineNumber,
    startColumn: startCol,
    endLine: lineNumber,
    endColumn: Math.max(startCol + 1, endCol),
  }
}

function diagnostic(message: string, range: SourceRange): TurtleDiagnostic {
  return { message, range }
}

export function parseTurtle(source: string): ParseResult {
  const commands: TurtleCommand[] = []
  const diagnostics: TurtleDiagnostic[] = []
  const comments: TurtleComment[] = []

  // First pass: extract multi-line comments and remove them from source
  let processedSource = source
  const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g
  let match: RegExpExecArray | null
  multiLineCommentRegex.lastIndex = 0
  while ((match = multiLineCommentRegex.exec(source)) !== null) {
    const commentText = match[0]
    const startPos = match.index
    const lineNumber = source.slice(0, startPos).split(/\r?\n/).length
    comments.push({ text: commentText, line: lineNumber })
    // Replace multi-line comment with spaces to preserve positions
    processedSource =
      processedSource.slice(0, startPos) +
      ' '.repeat(commentText.length) +
      processedSource.slice(startPos + commentText.length)
  }

  // Second pass: normalize multi-line REPEAT commands by replacing newlines inside brackets with spaces
  let normalizedSource = ''
  let bracketDepth = 0
  let inRepeat = false
  
  for (let i = 0; i < processedSource.length; i++) {
    const char = processedSource[i]
    
    // Check if we're starting a REPEAT command
    if (!inRepeat && i < processedSource.length - 6) {
      const word = processedSource.slice(i, i + 6).toUpperCase()
      if (word === 'REPEAT' && (i === 0 || /\s/.test(processedSource[i - 1]))) {
        inRepeat = true
      }
    }
    
    if (char === '[') {
      bracketDepth++
      normalizedSource += char
    } else if (char === ']') {
      bracketDepth--
      if (bracketDepth === 0) inRepeat = false
      normalizedSource += char
    } else if (char === '\n' && inRepeat && bracketDepth > 0) {
      // Replace newlines inside REPEAT brackets with semicolon to preserve command separation
      normalizedSource += '; '
    } else {
      normalizedSource += char
    }
  }

  const lines = normalizedSource.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const line = lines[i]

    const hashIdx = line.indexOf('#')
    const slashIdx = line.indexOf('//')
    let cut = line.length
    let commentStart = -1
    if (hashIdx >= 0) {
      cut = Math.min(cut, hashIdx)
      commentStart = hashIdx
    }
    if (slashIdx >= 0 && (commentStart === -1 || slashIdx < commentStart)) {
      cut = Math.min(cut, slashIdx)
      commentStart = slashIdx
    }
    const content = line.slice(0, cut)

    // Extract comment if present
    if (commentStart >= 0) {
      const commentText = line.slice(commentStart).trim()
      if (commentText.length > 0) {
        comments.push({ text: commentText, line: lineNumber })
      }
    }

    let segStart = 0
    while (segStart <= content.length) {
      // Find next semicolon, but skip semicolons inside brackets
      let semiIdx = -1
      let bracketDepth = 0
      for (let i = segStart; i < content.length; i++) {
        if (content[i] === '[') bracketDepth++
        else if (content[i] === ']') bracketDepth--
        else if (content[i] === ';' && bracketDepth === 0) {
          semiIdx = i
          break
        }
      }
      
      const segEnd = semiIdx >= 0 ? semiIdx : content.length

      const raw = content.slice(segStart, segEnd)
      const leadingWs = raw.match(/^\s*/)?.[0].length ?? 0
      const trailingWs = raw.match(/\s*$/)?.[0].length ?? 0
      const trimmed = raw.trim()

      if (trimmed.length > 0) {
        const startCol = segStart + leadingWs + 1
        const endCol = segEnd - trailingWs + 1
        const segRange = rangeForSegment(lineNumber, startCol, endCol)

        const parts = trimmed.split(/\s+/)
        const cmdRaw = parts[0] ?? ''
        const cmdText = cmdRaw.toUpperCase()
        const kind = aliasToKind[cmdText]

        if (!kind) {
          diagnostics.push(diagnostic(`Unknown command: ${cmdRaw}`, segRange))
        } else if (kind === 'ARC' || kind === 'SETXY') {
          // These commands require two expressions separated by comma
          const argsText = trimmed.slice(cmdRaw.length).trim()
          const commaIdx = argsText.indexOf(',')
          
          if (commaIdx === -1) {
            const errorMsg = kind === 'ARC' 
              ? 'ARC requires two expressions separated by comma (angle, radius)'
              : 'SETXY requires two expressions separated by comma (xcor, ycor)'
            diagnostics.push(diagnostic(errorMsg, segRange))
          } else {
            const expr1Text = argsText.slice(0, commaIdx).trim()
            const expr2Text = argsText.slice(commaIdx + 1).trim()
            
            const expr1 = parseExpression(expr1Text)
            const expr2 = parseExpression(expr2Text)
            
            if (!expr1) {
              diagnostics.push(diagnostic(`Invalid expression: ${expr1Text}`, segRange))
            } else if (!expr2) {
              diagnostics.push(diagnostic(`Invalid expression: ${expr2Text}`, segRange))
            } else {
              commands.push({ kind, value: expr1, value2: expr2, sourceLine: lineNumber })
            }
          }
        } else if (kind === 'MAKE') {
          // MAKE requires "varname expression
          const argsText = trimmed.slice(cmdRaw.length).trim()
          
          if (!argsText.startsWith('"')) {
            diagnostics.push(diagnostic('MAKE requires quoted variable name: MAKE "varname expression', segRange))
          } else {
            const restText = argsText.slice(1).trim()
            const spaceIdx = restText.search(/\s/)
            
            if (spaceIdx === -1) {
              diagnostics.push(diagnostic('MAKE requires variable name and expression', segRange))
            } else {
              const varName = restText.slice(0, spaceIdx).toLowerCase()
              const exprText = restText.slice(spaceIdx).trim()
              
              if (!varName) {
                diagnostics.push(diagnostic('Variable name cannot be empty', segRange))
              } else if (!exprText) {
                diagnostics.push(diagnostic('MAKE requires an expression', segRange))
              } else {
                const expr = parseExpression(exprText)
                if (!expr) {
                  diagnostics.push(diagnostic(`Invalid expression: ${exprText}`, segRange))
                } else {
                  commands.push({ kind, varName, value: expr, sourceLine: lineNumber })
                }
              }
            }
          }
        } else if (kind === 'REPEAT') {
          // REPEAT requires num [instructionlist]
          const argsText = trimmed.slice(cmdRaw.length).trim()
          const bracketStart = argsText.indexOf('[')
          
          if (bracketStart === -1) {
            diagnostics.push(diagnostic('REPEAT requires instruction list in brackets: REPEAT num [instructions]', segRange))
          } else {
            const bracketEnd = argsText.lastIndexOf(']')
            if (bracketEnd === -1 || bracketEnd < bracketStart) {
              diagnostics.push(diagnostic('REPEAT instruction list missing closing bracket ]', segRange))
            } else {
              const countText = argsText.slice(0, bracketStart).trim()
              const instructionList = argsText.slice(bracketStart + 1, bracketEnd)
              
              if (!countText) {
                diagnostics.push(diagnostic('REPEAT requires a count expression', segRange))
              } else {
                const countExpr = parseExpression(countText)
                if (!countExpr) {
                  diagnostics.push(diagnostic(`Invalid expression: ${countText}`, segRange))
                } else {
                  commands.push({ kind, value: countExpr, instructionList, sourceLine: lineNumber })
                }
              }
            }
          }
        } else {
          // These commands require zero or one expression
          const expectsNumber = kind === 'FD' || kind === 'BK' || kind === 'LT' || kind === 'RT' || kind === 'SETX' || kind === 'SETY' || kind === 'SETH'

          if (expectsNumber) {
            const exprText = trimmed.slice(cmdRaw.length).trim()
            if (!exprText) {
              diagnostics.push(diagnostic(`${cmdText} requires an expression`, segRange))
            } else {
              const expr = parseExpression(exprText)
              if (!expr) {
                diagnostics.push(diagnostic(`Invalid expression: ${exprText}`, segRange))
              } else {
                commands.push({ kind, value: expr, sourceLine: lineNumber })
              }
            }
          } else {
            if (parts.length > 1) {
              diagnostics.push(diagnostic(`${cmdText} does not take arguments`, segRange))
            } else {
              commands.push({ kind, sourceLine: lineNumber })
            }
          }
        }
      }

      if (semiIdx < 0) break
      segStart = semiIdx + 1
    }
  }

  // Sort comments by line number to maintain proper order
  comments.sort((a, b) => a.line - b.line)

  return { commands, diagnostics, comments }
}
