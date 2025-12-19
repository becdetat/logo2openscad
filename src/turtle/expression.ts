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

// Atoms (numbers and parenthesized expressions)
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
  
  const num = Number(token)
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid number: ${token}`)
  }
  
  consume(state)
  return { type: 'number', value: num }
}

// Evaluate an expression to a number
export function evaluateExpression(expr: Expression): number {
  switch (expr.type) {
    case 'number':
      return expr.value
    
    case 'unary':
      return -evaluateExpression(expr.operand)
    
    case 'binary': {
      const left = evaluateExpression(expr.left)
      const right = evaluateExpression(expr.right)
      
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
