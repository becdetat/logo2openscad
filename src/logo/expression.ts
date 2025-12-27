import type { Expression } from './types'

// Tokenize an expression string
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    
    if ('+-*/^()'.includes(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else {
      current += char
    }
  }
  
  if (current) {
    tokens.push(current)
  }
  
  return tokens
}

// Variable context for evaluation
export type VariableValue = number | { type: 'instructionList'; value: string }
export type VariableContext = Map<string, VariableValue>

// Parse expression with proper precedence
export function parseExpression(input: string): Expression | null {
  const tokens = tokenize(input.trim())
  if (tokens.length === 0) return null
  
  const state = { pos: 0, tokens }
  try {
    return parseAddSub(state)
  } catch {
    return null
  }
}

type ParseState = { pos: number; tokens: string[] }

function peek(state: ParseState): string | undefined {
  return state.tokens[state.pos]
}

function consume(state: ParseState): string {
  return state.tokens[state.pos++]
}

// Addition and subtraction (lowest precedence)
function parseAddSub(state: ParseState): Expression {
  let left = parseMulDiv(state)
  
  while (peek(state) === '+' || peek(state) === '-') {
    const op = consume(state) as '+' | '-'
    const right = parseMulDiv(state)
    left = { type: 'binary', op, left, right }
  }
  
  return left
}

// Multiplication and division
function parseMulDiv(state: ParseState): Expression {
  let left = parsePower(state)
  
  while (peek(state) === '*' || peek(state) === '/') {
    const op = consume(state) as '*' | '/'
    const right = parsePower(state)
    left = { type: 'binary', op, left, right }
  }
  
  return left
}

// Exponentiation (right-associative)
function parsePower(state: ParseState): Expression {
  let left = parseUnary(state)
  
  if (peek(state) === '^') {
    consume(state)
    const right = parsePower(state) // Right-associative
    return { type: 'binary', op: '^', left, right }
  }
  
  return left
}

// Unary minus
function parseUnary(state: ParseState): Expression {
  if (peek(state) === '-') {
    consume(state)
    const operand = parseUnary(state)
    return { type: 'unary', op: '-', operand }
  }
  
  return parseAtom(state)
}

// Atoms (numbers, variables, parenthesized expressions, and function calls)
function parseAtom(state: ParseState): Expression {
  const token = peek(state)
  
  if (!token) {
    throw new Error('Unexpected end of expression')
  }
  
  if (token === '(') {
    consume(state)
    const expr = parseAddSub(state)
    if (consume(state) !== ')') {
      throw new Error('Expected )')
    }
    return expr
  }
  
  // Check for variable reference (starts with :)
  if (token.startsWith(':')) {
    consume(state)
    const varName = token.slice(1).toLowerCase()
    if (!varName) {
      throw new Error('Variable name cannot be empty')
    }
    return { type: 'variable', name: varName }
  }
  
  // Check for function call (e.g., SQRT, LN, EXP, LOG10)
  const upperToken = token.toUpperCase()
  if (upperToken === 'SQRT') {
    consume(state)
    const arg = parseUnary(state)
    return { type: 'function', name: 'sqrt', arg }
  }
  if (upperToken === 'LN') {
    consume(state)
    const arg = parseUnary(state)
    return { type: 'function', name: 'ln', arg }
  }
  if (upperToken === 'EXP') {
    consume(state)
    const arg = parseUnary(state)
    return { type: 'function', name: 'exp', arg }
  }
  if (upperToken === 'LOG10') {
    consume(state)
    const arg = parseUnary(state)
    return { type: 'function', name: 'log10', arg }
  }
  
  const num = Number(token)
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid number: ${token}`)
  }
  
  consume(state)
  return { type: 'number', value: num }
}

// Evaluate an expression to a number
export function evaluateExpression(expr: Expression, variables: VariableContext = new Map()): number {
  switch (expr.type) {
    case 'number':
      return expr.value
    
    case 'variable': {
      const value = variables.get(expr.name)
      if (value === undefined) {
        throw new Error(`Undefined variable: ${expr.name}`)
      }
      if (typeof value === 'object' && value.type === 'instructionList') {
        throw new Error(`Cannot use instruction list variable :${expr.name} in numeric expression`)
      }
      // TypeScript now knows value is a number
      return value as number
    }
    
    case 'function': {
      const arg = evaluateExpression(expr.arg, variables)
      switch (expr.name) {
        case 'sqrt':
          return Math.sqrt(arg)
        case 'ln':
          return Math.log(arg)
        case 'exp':
          return Math.exp(arg)
        case 'log10':
          return Math.log10(arg)
        default:
          throw new Error(`Unknown function: ${expr.name}`)
      }
    }
    
    case 'unary':
      return -evaluateExpression(expr.operand, variables)
    
    case 'binary': {
      const left = evaluateExpression(expr.left, variables)
      const right = evaluateExpression(expr.right, variables)
      
      switch (expr.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return left / right
        case '^': return Math.pow(left, right)
      }
    }
  }
}
