export type TurtleCommandKind = 'FD' | 'BK' | 'LT' | 'RT' | 'PU' | 'PD' | 'ARC' | 'SETX' | 'SETY' | 'SETXY'

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
  value?: number
  value2?: number
  sourceLine?: number
}

export type TurtleComment = {
  text: string
  line: number
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
