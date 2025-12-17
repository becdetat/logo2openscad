import type {
  ParseResult,
  SourceRange,
  TurtleCommand,
  TurtleCommandKind,
  TurtleComment,
  TurtleDiagnostic,
} from './types'

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
  HOME: "HOME"
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

  const lines = processedSource.split(/\r?\n/)
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
      const semiIdx = content.indexOf(';', segStart)
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
          // These commands require two numbers
          if (parts.length < 3) {
            // Less than two numbers were provided, add diagnostics based on the command
            kind === "ARC" && diagnostics.push(diagnostic("ARC requires two numbers (angle, radius)", segRange));
            kind === "SETXY" && diagnostics.push(diagnostic("SETXY requires two numbers (xcor, ycor)", segRange));
          } else if (parts.length > 3) {
            // More than two numbers were provided
            diagnostics.push(diagnostic(`Too many tokens for ${cmdText}`, segRange))
          } else {
            const val1 = Number(parts[1])
            const val2 = Number(parts[2])
            if (!Number.isFinite(val1)) {
              diagnostics.push(diagnostic(`Invalid number: ${parts[1]}`, segRange))
            } else if (!Number.isFinite(val2)) {
              diagnostics.push(diagnostic(`Invalid number: ${parts[2]}`, segRange))
            } else {
              commands.push({ kind, value: val1, value2: val2, sourceLine: lineNumber })
            }
          }
        } else {
          // These commands require zero or one numbers
          const expectsNumber = kind === 'FD' || kind === 'BK' || kind === 'LT' || kind === 'RT' || kind === 'SETX' || kind === 'SETY' || kind === 'SETH'

          if (expectsNumber) {
            if (parts.length < 2) {
              diagnostics.push(diagnostic(`${cmdText} requires a number`, segRange))
            } else if (parts.length > 2) {
              diagnostics.push(diagnostic(`Too many tokens for ${cmdText}`, segRange))
            } else {
              const value = Number(parts[1])
              if (!Number.isFinite(value)) {
                diagnostics.push(diagnostic(`Invalid number: ${parts[1]}`, segRange))
              } else {
                commands.push({ kind, value, sourceLine: lineNumber })
              }
            }
          } else {
            if (parts.length > 1) {
              diagnostics.push(diagnostic(`${cmdText} does not take a number`, segRange))
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
