// Expression AST types
export type Expression =
  | { type: 'number'; value: number }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expression; right: Expression }
  | { type: 'unary'; op: '-'; operand: Expression }
  | { type: 'variable'; name: string }
  | { type: 'function'; name: string; arg: Expression }

export type TurtleCommandKind = 'FD' | 'BK' | 'LT' | 'RT' | 'PU' | 'PD' | 'ARC' | 'SETX' | 'SETY' | 'SETXY' | 'SETH' | "HOME" | 'MAKE' | 'REPEAT'

export type SourceRange = {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export type TurtleDiagnostic = {
  message: string
  range: SourceRange
}

export type TurtleCommand = {
  kind: TurtleCommandKind
  value?: Expression
  value2?: Expression
  varName?: string  // For MAKE command
  instructionList?: string  // For REPEAT command
  sourceLine?: number
}

export type TurtleComment = {
  text: string
  line: number
  endLine?: number  // For multi-line comments, tracks where they end
}

export type Point = { x: number; y: number }

export type TurtleSegment = {
  from: Point
  to: Point
  penDown: boolean
  arcGroup?: number
}

export type TurtlePolygon = {
  points: Point[]
  comments: TurtleComment[]
  commentsByPointIndex: Map<number, TurtleComment[]>  // Comments to appear before each point index
}

export type ParseResult = {
  commands: TurtleCommand[]
  diagnostics: TurtleDiagnostic[]
  comments: TurtleComment[]
}

export type ExecuteResult = {
  segments: TurtleSegment[]
  polygons: TurtlePolygon[]
}

export type ExecuteOptions = {
  arcPointsPer90Deg: number
}
