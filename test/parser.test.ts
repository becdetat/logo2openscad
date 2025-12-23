import { describe, expect, it } from 'vitest'
import { parseTurtle } from '../src/turtle/parser'

describe('parser', () => {
  describe('basic commands', () => {
    it('should parse FD command', () => {
      const result = parseTurtle('FD 10')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('FD')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse FORWARD alias', () => {
      const result = parseTurtle('FORWARD 25')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('FD')
    })

    it('should parse BK command', () => {
      const result = parseTurtle('BK 15')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('BK')
    })

    it('should parse LT and RT commands', () => {
      const result = parseTurtle('LT 90\nRT 45')
      expect(result.commands).toHaveLength(2)
      expect(result.commands[0].kind).toBe('LT')
      expect(result.commands[1].kind).toBe('RT')
    })

    it('should parse PU and PD commands', () => {
      const result = parseTurtle('PU\nPD')
      expect(result.commands).toHaveLength(2)
      expect(result.commands[0].kind).toBe('PU')
      expect(result.commands[1].kind).toBe('PD')
    })

    it('should parse SETH command', () => {
      const result = parseTurtle('SETH 45')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETH')
    })

    it('should parse HOME command', () => {
      const result = parseTurtle('HOME')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('HOME')
    })
  })

  describe('multi-argument commands', () => {
    it('should parse ARC command with two arguments', () => {
      const result = parseTurtle('ARC 90, 50')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('ARC')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse SETXY command with two arguments', () => {
      const result = parseTurtle('SETXY 10, 20')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETXY')
    })

    it('should report error for ARC without comma', () => {
      const result = parseTurtle('ARC 90 50')
      expect(result.diagnostics.length).toBeGreaterThan(0)
    })

    it('should parse SETX command', () => {
      const result = parseTurtle('SETX 100')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETX')
    })

    it('should parse SETY command', () => {
      const result = parseTurtle('SETY -50')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('SETY')
    })
  })

  describe('comments', () => {
    it('should extract single-line # comments', () => {
      const result = parseTurtle('# This is a comment\nFD 10')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toBe('# This is a comment')
      expect(result.commands).toHaveLength(1)
    })

    it('should extract single-line // comments', () => {
      const result = parseTurtle('FD 10 // move forward')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toBe('// move forward')
    })

    it('should extract multi-line comments', () => {
      const result = parseTurtle('/* Multi\nline\ncomment */\nFD 10')
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].text).toContain('Multi')
      expect(result.commands).toHaveLength(1)
    })

    it('should track line numbers for comments', () => {
      const result = parseTurtle('FD 10\n# Comment on line 2\nFD 20')
      expect(result.comments[0].line).toBe(2)
    })
  })

  describe('expressions', () => {
    it('should parse arithmetic expressions', () => {
      const result = parseTurtle('FD 10 + 5')
      expect(result.commands).toHaveLength(1)
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse expressions with multiplication and division', () => {
      const result = parseTurtle('FD 10 * 2 / 4')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse expressions with exponentiation', () => {
      const result = parseTurtle('FD 2 ^ 3')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse expressions with parentheses', () => {
      const result = parseTurtle('FD (10 + 5) * 2')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse negative numbers', () => {
      const result = parseTurtle('FD -10')
      expect(result.commands).toHaveLength(1)
    })
  })

  describe('variables', () => {
    it('should parse MAKE command', () => {
      const result = parseTurtle('MAKE "size 100')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('MAKE')
      expect(result.commands[0].varName).toBe('size')
    })

    it('should parse variable references in expressions', () => {
      const result = parseTurtle('MAKE "x 10\nFD :x')
      expect(result.commands).toHaveLength(2)
      expect(result.commands[1].kind).toBe('FD')
    })

    it('should report error for MAKE without quote', () => {
      const result = parseTurtle('MAKE size 100')
      expect(result.diagnostics.length).toBeGreaterThan(0)
    })
  })

  describe('REPEAT command', () => {
    it('should parse simple REPEAT', () => {
      const result = parseTurtle('REPEAT 4 [FD 10]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('REPEAT')
      expect(result.commands[0].instructionList).toContain('FD 10')
    })

    it('should parse REPEAT with multiple commands', () => {
      const result = parseTurtle('REPEAT 4 [FD 10; RT 90]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].instructionList).toContain('FD 10')
      expect(result.commands[0].instructionList).toContain('RT 90')
    })

    it('should parse multi-line REPEAT', () => {
      const result = parseTurtle('REPEAT 4 [\n  FD 10\n  RT 90\n]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('REPEAT')
    })
  })

  describe('functions', () => {
    it('should parse SQRT function', () => {
      const result = parseTurtle('FD SQRT 16')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse LN function', () => {
      const result = parseTurtle('FD LN 10')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse EXP function', () => {
      const result = parseTurtle('FD EXP 2')
      expect(result.commands).toHaveLength(1)
    })

    it('should parse LOG10 function', () => {
      const result = parseTurtle('FD LOG10 100')
      expect(result.commands).toHaveLength(1)
    })
  })

  describe('multiple commands', () => {
    it('should parse commands separated by newlines', () => {
      const result = parseTurtle('FD 10\nLT 90\nFD 20')
      expect(result.commands).toHaveLength(3)
    })

    it('should parse commands separated by semicolons', () => {
      const result = parseTurtle('FD 10; LT 90; FD 20')
      expect(result.commands).toHaveLength(3)
    })

    it('should parse mixed separators', () => {
      const result = parseTurtle('FD 10; LT 90\nFD 20')
      expect(result.commands).toHaveLength(3)
    })
  })

  describe('error handling', () => {
    it('should report unknown command', () => {
      const result = parseTurtle('UNKNOWN 10')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('Unknown command')
    })

    it('should handle empty input', () => {
      const result = parseTurtle('')
      expect(result.commands).toHaveLength(0)
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should handle whitespace-only input', () => {
      const result = parseTurtle('   \n\n  ')
      expect(result.commands).toHaveLength(0)
    })
  })

  describe('EXTCOMMENTPOS command', () => {
    it('should parse EXTCOMMENTPOS without parameters', () => {
      const result = parseTurtle('EXTCOMMENTPOS')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBeUndefined()
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTCOMMENTPOS with comment parameter in brackets', () => {
      const result = parseTurtle('EXTCOMMENTPOS [Screw hole 1]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('Screw hole 1')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTCOMMENTPOS with empty brackets', () => {
      const result = parseTurtle('EXTCOMMENTPOS []')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should report error for EXTCOMMENTPOS with unclosed bracket', () => {
      const result = parseTurtle('EXTCOMMENTPOS [comment')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('missing closing bracket')
    })

    it('should report error for EXTCOMMENTPOS with parameter not in brackets', () => {
      const result = parseTurtle('EXTCOMMENTPOS comment')
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0].message).toContain('must be in brackets')
    })

    it('should parse EXTCOMMENTPOS with complex comment text', () => {
      const result = parseTurtle('EXTCOMMENTPOS [Position at: corner 1, layer 2]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('Position at: corner 1, layer 2')
      expect(result.diagnostics).toHaveLength(0)
    })

    it('should parse EXTCOMMENTPOS with nested brackets in comment', () => {
      const result = parseTurtle('EXTCOMMENTPOS [Position [corner]]')
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].kind).toBe('EXTCOMMENTPOS')
      expect(result.commands[0].comment).toBe('Position [corner]')
      expect(result.diagnostics).toHaveLength(0)
    })
  })
})
