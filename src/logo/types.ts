// Expression AST types
export type Expression =
  | { type: 'number'; value: number }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expression; right: Expression }
  | { type: 'unary'; op: '-'; operand: Expression }
  | { type: 'variable'; name: string }
  | { type: 'function'; name: string; arg: Expression }

export type LogoCommandKind = 'FD' | 'BK' | 'LT' | 'RT' | 'PU' | 'PD' | 'ARC' | 'SETX' | 'SETY' | 'SETXY' | 'SETH' | "HOME" | 'MAKE' | 'REPEAT' | 'EXTCOMMENTPOS' | 'EXTSETFN' | 'PRINT' | 'EXTMARKER'

export type SourceRange = {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export type LogoDiagnostic = {
  message: string
  range: SourceRange
}

export type PrintArg = 
  | { type: 'string'; value: string }
  | { type: 'expression'; expr: Expression }

export type LogoCommand = {
  kind: LogoCommandKind
  value?: Expression
  value2?: Expression
  varName?: string  // For MAKE command
  instructionList?: string  // For REPEAT command
  comment?: string  // For EXTCOMMENTPOS command
  printArgs?: PrintArg[]  // For PRINT command
  sourceLine?: number
}

export type LogoComment = {
  text: string
  line: number
  endLine?: number  // For multi-line comments, tracks where they end
}

export type Point = { x: number; y: number }

export type LogoSegment = {
  from: Point
  to: Point
  penDown: boolean
  arcGroup?: number
}

export type LogoPolygon = {
  points: Point[]
  comments: LogoComment[]
  commentsByPointIndex: Map<number, LogoComment[]>  // Comments to appear before each point index
  commentOnly?: boolean  // If true, only output comments without geometry
}

export type ParseResult = {
  commands: LogoCommand[]
  diagnostics: LogoDiagnostic[]
  comments: LogoComment[]
}

export type Marker = {
  x: number
  y: number
  comment?: string
}

export type ExecuteResult = {
  segments: LogoSegment[]
  polygons: LogoPolygon[]
  markers: Marker[]
}
